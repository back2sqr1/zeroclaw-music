import { createHash } from 'node:crypto'
import path from 'node:path'

export const AUDIO_MIME_TYPES = {
  '.aac': 'audio/aac',
  '.flac': 'audio/flac',
  '.m4a': 'audio/mp4',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.webm': 'audio/webm',
}

export function slugifyFilename(filename) {
  const base = path.basename(filename, path.extname(filename))
  const slug = base
    .toLowerCase()
    .replace(/^\d+\.\s*/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return slug || 'track'
}

export function fileTrackId(source, filename) {
  const hash = createHash('sha1').update(`${source}:${filename}`).digest('hex').slice(0, 8)
  return `${source}-${slugifyFilename(filename)}-${hash}`
}

export function titleFromFilename(filename) {
  return path.basename(filename, path.extname(filename)).replace(/^\d+\.\s*/, '').trim() || filename
}
