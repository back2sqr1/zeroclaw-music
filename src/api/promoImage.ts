export async function generatePromoImage(trackId: string, prompt?: string) {
  const response = await fetch(`/api/tracks/${trackId}/promo-image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(prompt ? { prompt } : {}),
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(payload.error || 'Failed to generate promo image')
  }

  return payload as { trackId: string; coverUrl: string; title: string }
}
