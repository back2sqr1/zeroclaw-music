import { spawn } from 'node:child_process'
import OpenAI from 'openai'

// Dimensions of each embedding type
export const PROMPT_EMBEDDING_DIMS = 1536
export const AUDIO_EMBEDDING_DIMS = 50

let openaiClient = null
function getOpenAI() {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return openaiClient
}

export async function embedPrompt(text) {
  const res = await getOpenAI().embeddings.create({
    model: 'text-embedding-3-small',
    input: text.slice(0, 8000),
  })
  return res.data[0].embedding
}

// Decode any audio buffer to raw PCM float32le mono 44100Hz via ffmpeg
function decodeAudioToPCM(audioBuffer) {
  return new Promise((resolve, reject) => {
    const ff = spawn('ffmpeg', [
      '-hide_banner', '-loglevel', 'error',
      '-i', 'pipe:0',
      '-f', 'f32le', '-ar', '44100', '-ac', '1',
      'pipe:1',
    ])

    const chunks = []
    ff.stdout.on('data', (chunk) => chunks.push(chunk))
    ff.stdout.on('end', () => resolve(Buffer.concat(chunks)))
    ff.stderr.on('data', () => {})
    ff.on('error', reject)
    ff.on('close', (code) => {
      if (code !== 0 && chunks.length === 0) {
        reject(new Error(`ffmpeg exited with code ${code}`))
      }
    })

    ff.stdin.write(audioBuffer)
    ff.stdin.end()
  })
}

// Extract a fixed-length music feature vector from an audio Buffer using Essentia.js.
// Returns a Float32Array of AUDIO_EMBEDDING_DIMS dimensions.
// Falls back to a zero vector if audio decoding or Essentia fails.
export async function embedAudio(audioBuffer) {
  try {
    const pcmBuffer = await decodeAudioToPCM(audioBuffer)
    const pcmArray = new Float32Array(
      pcmBuffer.buffer,
      pcmBuffer.byteOffset,
      pcmBuffer.byteLength / 4,
    )

    const essentiaModule = await import('essentia.js')
    const { EssentiaWASM, Essentia } = essentiaModule.default ?? essentiaModule
    const essentia = new Essentia(EssentiaWASM)

    const FRAME_SIZE = 2048
    const HOP_SIZE = 512

    // Accumulate MFCC coefficients across frames
    const mfccAccum = new Array(13).fill(0)
    const mfccSqAccum = new Array(13).fill(0)
    let frameCount = 0
    let centroidAccum = 0

    for (let start = 0; start + FRAME_SIZE <= pcmArray.length; start += HOP_SIZE) {
      const frame = pcmArray.slice(start, start + FRAME_SIZE)
      const frameVec = essentia.arrayToVector(frame)

      const { frame: windowed } = essentia.Windowing(frameVec, true, FRAME_SIZE, 'hann')
      const { spectrum } = essentia.Spectrum(windowed, FRAME_SIZE)
      const { mfcc } = essentia.MFCC(spectrum, 2, 11000, FRAME_SIZE / 2 + 1, 0, 'dbamp', 0, 'unit_sum', 40, 13, 44100)
      const { centroid } = essentia.Centroid(spectrum, 22050)

      const mfccArr = essentia.vectorToArray(mfcc)
      for (let c = 0; c < 13; c++) {
        mfccAccum[c] += mfccArr[c]
        mfccSqAccum[c] += mfccArr[c] * mfccArr[c]
      }
      centroidAccum += centroid
      frameCount++
    }

    const mfccMeans = mfccAccum.map((s) => (frameCount > 0 ? s / frameCount : 0))
    const mfccStds = mfccSqAccum.map((sq, i) =>
      frameCount > 0 ? Math.sqrt(Math.max(0, sq / frameCount - mfccMeans[i] ** 2)) : 0,
    )
    const centroidMean = frameCount > 0 ? centroidAccum / frameCount / 22050 : 0

    // Global features
    const fullVec = essentia.arrayToVector(pcmArray)
    const { rms } = essentia.RMS(fullVec)
    const { zeroCrossingRate: zcr } = essentia.ZeroCrossingRate(fullVec)

    // BPM (normalized to 0-1 for 40-208 BPM range)
    let bpmNorm = 0
    try {
      const { bpm } = essentia.RhythmExtractor(fullVec)
      bpmNorm = Math.max(0, Math.min(1, (bpm - 40) / (208 - 40)))
    } catch {
      // RhythmExtractor can fail on very short clips — leave at 0
    }

    // Key strength
    let keyStrength = 0
    try {
      const { strength } = essentia.KeyExtractor(fullVec)
      keyStrength = strength
    } catch {
      // KeyExtractor can fail on very short clips — leave at 0
    }

    // Build feature vector: 13 means + 13 stds + centroid + rms + zcr + bpm + key = 31 dims
    const features = [
      ...mfccMeans,
      ...mfccStds,
      centroidMean,
      rms,
      zcr,
      bpmNorm,
      keyStrength,
    ]

    // Pad or trim to AUDIO_EMBEDDING_DIMS
    while (features.length < AUDIO_EMBEDDING_DIMS) features.push(0)
    return features.slice(0, AUDIO_EMBEDDING_DIMS)
  } catch (err) {
    console.error('[embedAudio] feature extraction failed:', err.message)
    return new Array(AUDIO_EMBEDDING_DIMS).fill(0)
  }
}
