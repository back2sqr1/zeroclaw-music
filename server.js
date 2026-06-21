import express from 'express'
import { execFile } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { createClient } from '@supabase/supabase-js'
import { embedPrompt, embedAudio } from './lib/embeddings.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const execFileAsync = promisify(execFile)

const app = express()
const port = process.env.PORT || 3000
const distDir = path.resolve(__dirname, 'dist')
const indexHtml = path.join(distDir, 'index.html')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

function publicUrl(bucket, filename) {
  return supabase.storage.from(bucket).getPublicUrl(filename).data.publicUrl
}

function toPublicTrack(row) {
  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    source: row.source,
    genre: row.source === 'generated' ? '#generated' : '#local',
    url: publicUrl(row.bucket, row.filename),
  }
}

// --- API: Catalog ---

app.get('/api/health', (req, res) => {
  res.json({ ok: true })
})

app.get('/api/tracks', async (req, res) => {
  const query = String(req.query.q || '').trim()

  if (query && process.env.OPENAI_API_KEY) {
    // Semantic search via pgvector
    try {
      const queryVec = await embedPrompt(query)
      const { data, error } = await supabase.rpc('search_tracks', {
        query_embedding: queryVec,
        match_count: 20,
      })
      if (error) throw error
      res.json(
        (data || []).map((row) => ({
          ...toPublicTrack(row),
        })),
      )
      return
    } catch (err) {
      console.error('[/api/tracks] semantic search failed, falling back to ilike:', err.message)
    }
  }

  // String-match fallback (or when no query / no OPENAI_API_KEY)
  let dbQuery = supabase
    .from('tracks')
    .select('id, title, artist, source, bucket, filename')
    .order('created_at', { ascending: true })

  if (query) {
    dbQuery = dbQuery.or(`title.ilike.%${query}%,artist.ilike.%${query}%`)
  }

  const { data, error } = await dbQuery
  if (error) {
    res.status(500).json({ error: error.message })
    return
  }
  res.json((data || []).map(toPublicTrack))
})

app.delete('/api/tracks/:id', async (req, res) => {
  const { data: track, error: fetchError } = await supabase
    .from('tracks')
    .select('id, bucket, filename')
    .eq('id', req.params.id)
    .single()

  if (fetchError || !track) {
    res.status(404).json({ error: 'Track not found' })
    return
  }

  const { error: deleteRowError } = await supabase.from('tracks').delete().eq('id', track.id)
  if (deleteRowError) {
    res.status(500).json({ error: deleteRowError.message })
    return
  }

  await supabase.storage.from(track.bucket).remove([track.filename])
  res.status(204).end()
})

// --- Audio generation helpers ---

const AUDIO_API_URL =
  process.env.AUDIO_API_URL ||
  'https://reverb-paste--stable-audio-3-server-stableaudio3-text-to-audio.modal.run/'
const MODAL_AUDIO_TO_AUDIO_API_URL =
  process.env.MODAL_AUDIO_TO_AUDIO_API_URL ||
  'https://reverb-paste--stable-audio-3-server-stableaudio3-audio-to-audio.modal.run/'
const AUDIO_TO_AUDIO_INIT_NOISE_LEVEL =
  Number(process.env.AUDIO_TO_AUDIO_INIT_NOISE_LEVEL) || 0.9

const STABILITY_AUDIO_TO_AUDIO_URL =
  process.env.STABILITY_AUDIO_TO_AUDIO_URL ||
  'https://api.stability.ai/v2beta/audio/stable-audio/audio-to-audio'
const STABILITY_AUDIO_RESULTS_URL =
  process.env.STABILITY_AUDIO_RESULTS_URL ||
  'https://api.stability.ai/v2beta/audio/results'

const STABILITY_POLL_INTERVAL_MS = Number(process.env.STABILITY_POLL_INTERVAL_MS) || 10_000
const STABILITY_MAX_POLL_ATTEMPTS = Number(process.env.STABILITY_MAX_POLL_ATTEMPTS) || 30
const STABILITY_TRANSCODE_INPUT_AUDIO = process.env.STABILITY_TRANSCODE_INPUT_AUDIO !== '0'

const sleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms) })

function safeUploadFilename(filename) {
  return path.basename(filename || 'input.mp3').replace(/[^a-zA-Z0-9._-]/g, '_') || 'input.mp3'
}

function filenameFromMimeType(mimeType) {
  return normalizeStabilityInputMimeType(mimeType, '') === 'audio/wav' ? 'input.wav' : 'input.mp3'
}

function headerValue(value) {
  return Array.isArray(value) ? value[0] : String(value || '')
}

function decodeHeaderFilename(value) {
  const filename = headerValue(value)
  if (!filename) return ''
  try {
    return decodeURIComponent(filename)
  } catch {
    return filename
  }
}

function normalizeOutputFormat(format) {
  const value = String(format || 'mp3').toLowerCase()
  return ['mp3', 'wav'].includes(value) ? value : 'mp3'
}

function normalizeAudioToAudioProvider(provider) {
  const value = String(provider || 'modal').toLowerCase()
  return ['stability', 'stable-audio', 'stability-ai'].includes(value) ? 'stability' : 'json'
}

function normalizeStabilityInputMimeType(mimeType, filename) {
  const type = String(mimeType || '').split(';')[0].trim().toLowerCase()
  const name = String(filename || '').toLowerCase()
  if (type === 'audio/mpeg' || type === 'audio/mp3' || name.endsWith('.mp3')) return 'audio/mpeg'
  if (type === 'audio/wav' || type === 'audio/wave' || type === 'audio/x-wav' || name.endsWith('.wav')) return 'audio/wav'
  return ''
}

function getStabilityApiKey() {
  return process.env.STABILITY_API_KEY || process.env.STABILITY_AI_API_KEY || ''
}

async function responseErrorDetail(response) {
  const text = await response.text().catch(() => '')
  if (!text) return ''
  try {
    const parsed = JSON.parse(text)
    if (Array.isArray(parsed.errors) && parsed.errors.length > 0) {
      return [parsed.name, ...parsed.errors].filter(Boolean).join(': ')
    }
    if (parsed.name || parsed.message || parsed.id) {
      return [parsed.name, parsed.message, parsed.id && `id: ${parsed.id}`].filter(Boolean).join(': ')
    }
    return JSON.stringify(parsed)
  } catch {
    return text
  }
}

async function prepareAudioUploadInput(audio, duration) {
  const audioMimeType = normalizeStabilityInputMimeType(audio.mimeType, audio.filename)
  if (!audioMimeType) {
    throw new Error('Audio-to-audio supports MP3 and WAV uploads. Please choose a .mp3 or .wav file.')
  }
  if (!STABILITY_TRANSCODE_INPUT_AUDIO) {
    return { ...audio, filename: safeUploadFilename(audio.filename), mimeType: audioMimeType }
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zeroclaw-stability-'))
  const inputPath = path.join(tmpDir, audioMimeType === 'audio/wav' ? 'source.wav' : 'source.mp3')
  const outputPath = path.join(tmpDir, 'stability-input.wav')
  const trimSeconds = Math.min(Math.max(Number(duration) || 30, 1), 180)

  try {
    fs.writeFileSync(inputPath, audio.buffer)
    await execFileAsync(
      'ffmpeg',
      ['-hide_banner', '-loglevel', 'error', '-y', '-i', inputPath,
       '-map', '0:a:0', '-vn', '-sn', '-dn', '-ac', '2', '-ar', '44100',
       '-c:a', 'pcm_s16le', '-t', String(trimSeconds), outputPath],
      { maxBuffer: 10 * 1024 * 1024 },
    )
    return { buffer: fs.readFileSync(outputPath), filename: 'input.wav', mimeType: 'audio/wav' }
  } catch (error) {
    const detail = String(error?.stderr || error?.message || '').trim()
    throw new Error(
      `Unable to prepare uploaded audio for Stability. Please use a playable MP3 or WAV file.${detail ? ` ffmpeg: ${detail.slice(0, 500)}` : ''}`
    )
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }
}

async function requestStabilityAudioToAudio({ prompt, duration, strength, outputFormat, audio }) {
  const apiKey = getStabilityApiKey()
  if (!apiKey) throw new Error('STABILITY_API_KEY is not configured')

  const stabilityAudio = await prepareAudioUploadInput(audio, duration)

  const formData = new FormData()
  formData.append('prompt', prompt)
  formData.append('output_format', outputFormat)
  formData.append('duration', String(duration))
  formData.append('strength', String(strength))
  formData.append(
    'audio',
    new File([stabilityAudio.buffer], stabilityAudio.filename, { type: stabilityAudio.mimeType }),
  )

  const generationRes = await fetch(STABILITY_AUDIO_TO_AUDIO_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, Accept: 'audio/*' },
    body: formData,
    signal: AbortSignal.timeout(120_000),
  })

  if (!generationRes.ok) {
    const detail = await responseErrorDetail(generationRes)
    throw new Error(`Stability audio-to-audio error ${generationRes.status}${detail ? `: ${detail}` : ''}`)
  }

  const generation = await generationRes.json().catch(() => null)
  const generationId = generation?.id
  if (!generationId) throw new Error('Stability audio-to-audio response did not include a generation id')

  for (let attempt = 0; attempt < STABILITY_MAX_POLL_ATTEMPTS; attempt += 1) {
    const resultRes = await fetch(`${STABILITY_AUDIO_RESULTS_URL}/${generationId}`, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: 'audio/*' },
      signal: AbortSignal.timeout(60_000),
    })
    if (resultRes.status === 202) { await sleep(STABILITY_POLL_INTERVAL_MS); continue }
    if (!resultRes.ok) {
      const detail = await responseErrorDetail(resultRes)
      throw new Error(`Stability result error ${resultRes.status}${detail ? `: ${detail}` : ''}`)
    }
    return Buffer.from(await resultRes.arrayBuffer())
  }

  throw new Error('Stability audio-to-audio timed out while processing')
}

async function requestJsonAudioToAudio({ prompt, duration, initNoiseLevel, audio }) {
  const preparedAudio = await prepareAudioUploadInput(audio, duration)
  const audioRes = await fetch(MODAL_AUDIO_TO_AUDIO_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'audio/*' },
    body: JSON.stringify({
      audio_base64: preparedAudio.buffer.toString('base64'),
      prompt,
      duration,
      init_noise_level: initNoiseLevel,
    }),
    signal: AbortSignal.timeout(120_000),
  })

  if (!audioRes.ok) {
    const detail = await responseErrorDetail(audioRes)
    throw new Error(`Audio API error ${audioRes.status}${detail ? `: ${detail}` : ''}`)
  }
  return Buffer.from(await audioRes.arrayBuffer())
}

// Save a generated audio buffer to Supabase Storage + DB, embed it, return track object
async function saveGeneratedTrack({ audioBuffer, title, mimeType, outputFormat }) {
  const id = `gen-${Date.now()}`
  const filename = `${id}.${outputFormat}`

  const { error: uploadError } = await supabase.storage
    .from('audio')
    .upload(filename, audioBuffer, { contentType: mimeType, upsert: false })
  if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`)

  // Embed in parallel; failures are non-fatal
  const [promptVec, audioVec] = await Promise.all([
    embedPrompt(title).catch((e) => { console.error('[embed prompt]', e.message); return null }),
    embedAudio(audioBuffer).catch((e) => { console.error('[embed audio]', e.message); return null }),
  ])

  const { error: insertError } = await supabase.from('tracks').insert({
    id,
    title,
    artist: 'Generated',
    filename,
    bucket: 'audio',
    mime_type: mimeType,
    source: 'generated',
    prompt: title,
    ...(promptVec ? { prompt_embedding: promptVec } : {}),
    ...(audioVec ? { audio_embedding: audioVec } : {}),
  })
  if (insertError) throw new Error(`DB insert failed: ${insertError.message}`)

  return {
    id,
    title,
    artist: 'Generated',
    source: 'generated',
    genre: '#generated',
    url: publicUrl('generated', filename),
    mimeType,
    createdAt: Date.now(),
  }
}

function parseGenerateRequest(req, res, next) {
  const contentType = String(req.headers['content-type'] || '')
  if (contentType.startsWith('audio/')) {
    express.raw({ type: () => true, limit: '100mb' })(req, res, next)
    return
  }
  express.json({ limit: '2mb' })(req, res, next)
}

app.post('/api/generate', parseGenerateRequest, async (req, res) => {
  const prompt = String(req.body?.prompt || req.query.prompt || '').trim()
  const duration = Math.min(Math.max(Number(req.body?.duration || req.query.duration) || 30, 1), 180)
  const rawAudio = Buffer.isBuffer(req.body) ? req.body : null
  const audioData = rawAudio ? '' : String(req.body?.audioData || '')
  const hasAudioUpload = Boolean(rawAudio?.length || audioData.length > 0)
  const provider = normalizeAudioToAudioProvider(
    req.body?.provider || req.query.provider,
  )

  if (!prompt && !hasAudioUpload) {
    res.status(400).json({ error: 'prompt is required' })
    return
  }

  if (hasAudioUpload && provider === 'stability') {
    const audioBuffer = rawAudio || Buffer.from(audioData, 'base64')
    const outputFormat = normalizeOutputFormat(
      req.body?.outputFormat || req.body?.output_format || req.query.outputFormat || req.query.output_format,
    )
    const strength = Math.min(Math.max(Number(req.body?.strength || req.query.strength) || 0.5, 0), 1)
    const stablePrompt = prompt || 'Enhance this audio into a polished music track.'
    const audioFilename =
      req.body?.audioFilename ||
      decodeHeaderFilename(req.headers['x-audio-filename']) ||
      filenameFromMimeType(req.headers['content-type'])
    const audioMimeType =
      req.body?.audioMimeType ||
      headerValue(req.headers['x-audio-mime']) ||
      headerValue(req.headers['content-type'])

    try {
      const generatedAudio = await requestStabilityAudioToAudio({
        prompt: stablePrompt,
        duration,
        strength,
        outputFormat,
        audio: { buffer: audioBuffer, filename: audioFilename, mimeType: audioMimeType },
      })
      const track = await saveGeneratedTrack({
        audioBuffer: generatedAudio,
        title: stablePrompt.slice(0, 80),
        mimeType: outputFormat === 'wav' ? 'audio/wav' : 'audio/mpeg',
        outputFormat,
      })
      res.status(201).json(track)
    } catch (error) {
      console.error(error)
      res.status(502).json({ error: error instanceof Error ? error.message : 'Stability audio-to-audio failed' })
    }
    return
  }

  if (hasAudioUpload) {
    const audioBuffer = rawAudio || Buffer.from(audioData, 'base64')
    const stablePrompt = prompt || 'Enhance this audio into a polished music track.'
    const initNoiseLevel = Math.min(
      Math.max(
        Number(req.body?.initNoiseLevel || req.body?.init_noise_level || req.query.initNoiseLevel || req.query.init_noise_level) || AUDIO_TO_AUDIO_INIT_NOISE_LEVEL,
        0,
      ),
      1,
    )
    const audioFilename =
      req.body?.audioFilename ||
      decodeHeaderFilename(req.headers['x-audio-filename']) ||
      filenameFromMimeType(req.headers['content-type'])
    const audioMimeType =
      req.body?.audioMimeType ||
      headerValue(req.headers['x-audio-mime']) ||
      headerValue(req.headers['content-type'])

    try {
      const generatedAudio = await requestJsonAudioToAudio({
        prompt: stablePrompt,
        duration,
        initNoiseLevel,
        audio: { buffer: audioBuffer, filename: audioFilename, mimeType: audioMimeType },
      })
      const track = await saveGeneratedTrack({
        audioBuffer: generatedAudio,
        title: stablePrompt.slice(0, 80),
        mimeType: 'audio/wav',
        outputFormat: 'wav',
      })
      res.status(201).json(track)
    } catch (error) {
      console.error(error)
      res.status(502).json({ error: error instanceof Error ? error.message : 'Audio-to-audio generation failed' })
    }
    return
  }

  if (!prompt) {
    res.status(400).json({ error: 'prompt is required for text-to-audio generation' })
    return
  }

  let audioRes
  try {
    audioRes = await fetch(AUDIO_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, duration }),
      signal: AbortSignal.timeout(120_000),
    })
  } catch {
    res.status(502).json({ error: 'Failed to reach audio API' })
    return
  }

  if (!audioRes.ok) {
    const detail = await audioRes.text().catch(() => '')
    res.status(502).json({ error: `Audio API error ${audioRes.status}`, detail })
    return
  }

  try {
    const audioBuffer = Buffer.from(await audioRes.arrayBuffer())
    const track = await saveGeneratedTrack({
      audioBuffer,
      title: prompt.slice(0, 80),
      mimeType: 'audio/wav',
      outputFormat: 'wav',
    })
    res.status(201).json(track)
  } catch (error) {
    res.status(502).json({ error: error instanceof Error ? error.message : 'Failed to save track' })
  }
})

// --- Error handler + SPA ---

app.use((err, req, res, next) => {
  if (!req.path.startsWith('/api/')) { next(err); return }
  const status = err?.status || err?.statusCode || 500
  const error =
    status === 413
      ? 'Uploaded audio is too large for the generation endpoint'
      : err?.message || 'Request failed'
  res.status(status).json({ error })
})

app.use(express.static(distDir))

app.use((req, res, next) => {
  if (req.method !== 'GET' || req.path.startsWith('/api/')) { next(); return }
  res.sendFile(indexHtml)
})

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`)
})
