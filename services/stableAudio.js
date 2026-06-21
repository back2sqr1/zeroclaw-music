const DEFAULT_BASE_URL =
  'https://reverb-paste--stable-audio-3-server-stableaudio3-web.modal.run'

function getBaseUrl() {
  const configured = String(process.env.STABLE_AUDIO_BASE_URL || '').trim()
  return (configured || DEFAULT_BASE_URL).replace(/\/$/, '')
}

export function getOutputFormat() {
  return process.env.STABLE_AUDIO_OUTPUT_FORMAT || 'mp3'
}

export function audioMimeType(format) {
  if (format === 'wav') {
    return 'audio/wav'
  }
  if (format === 'mp3') {
    return 'audio/mpeg'
  }
  return `audio/${format}`
}

export async function generateAudio({
  prompt,
  duration,
  seed = Number(process.env.STABLE_AUDIO_SEED ?? 0),
  steps = Number(process.env.STABLE_AUDIO_STEPS ?? 8),
  cfgScale = Number(process.env.STABLE_AUDIO_CFG_SCALE ?? 3),
  outputFormat = getOutputFormat(),
}) {
  const body = new URLSearchParams({
    prompt,
    duration: String(duration),
    seed: String(seed),
    steps: String(steps),
    cfg_scale: String(cfgScale),
    output_format: outputFormat,
  })

  const response = await fetch(`${getBaseUrl()}/text-to-audio`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(300_000),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(
      detail || `Stable Audio API error ${response.status}`
    )
  }

  return {
    buffer: Buffer.from(await response.arrayBuffer()),
    outputFormat,
    mimeType: audioMimeType(outputFormat),
  }
}
