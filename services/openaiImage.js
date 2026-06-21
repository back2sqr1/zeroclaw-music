const API_URL =
  process.env.OPENAI_API_URL || 'https://api.openai.com/v1/images/generations'
const DEFAULT_MODEL = 'gpt-image-1'

export function getImageModel() {
  return process.env.OPENAI_IMAGE_MODEL || DEFAULT_MODEL
}

export function buildDjPromoPrompt(trackTitle, customPrompt) {
  if (customPrompt?.trim()) {
    return customPrompt.trim()
  }

  return [
    'Square promotional poster for a DJ session.',
    `Featured track: "${trackTitle}".`,
    'Bold neon club aesthetic, turntables, crowd energy, minimal clean composition.',
    'No long paragraphs of text — short punchy headline only.',
  ].join(' ')
}

function normalizeApiKey(apiKey) {
  return String(apiKey || '').trim()
}

function assertOpenAiApiKey(apiKey) {
  const key = normalizeApiKey(apiKey)

  if (!key) {
    throw new Error(
      'OPENAI_API_KEY is missing. Add your OpenAI API key to .env (from https://platform.openai.com/api-keys)'
    )
  }

  return key
}

function imageRequestBody({ prompt, model }) {
  if (model === 'dall-e-3') {
    return {
      model,
      prompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
      response_format: 'b64_json',
    }
  }

  return {
    model,
    prompt,
    n: 1,
    size: '1024x1024',
    quality: 'low',
    output_format: 'png',
  }
}

export async function generatePromoImage({ prompt, apiKey, model = getImageModel() }) {
  const key = assertOpenAiApiKey(apiKey)

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(imageRequestBody({ prompt, model })),
    signal: AbortSignal.timeout(120_000),
  })

  const body = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(
      body?.error?.message || `OpenAI image API error ${response.status}`
    )
  }

  const image = body?.data?.[0]
  const base64 = image?.b64_json

  if (!base64) {
    throw new Error('OpenAI did not return an image')
  }

  return {
    buffer: Buffer.from(base64, 'base64'),
    mimeType: 'image/png',
  }
}

export function coverExtension(mimeType) {
  if (mimeType === 'image/jpeg') {
    return '.jpg'
  }
  if (mimeType === 'image/webp') {
    return '.webp'
  }
  return '.png'
}
