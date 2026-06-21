import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
export const generatedDir = path.resolve(rootDir, 'generated')
export const coversDir = path.join(generatedDir, 'covers')
const generatedMetaPath = path.join(generatedDir, 'tracks.json')

fs.mkdirSync(generatedDir, { recursive: true })
fs.mkdirSync(coversDir, { recursive: true })

export function readGeneratedTracks() {
  try {
    return JSON.parse(fs.readFileSync(generatedMetaPath, 'utf8'))
  } catch {
    return []
  }
}

export function writeGeneratedTracks(tracks) {
  const tmp = generatedMetaPath + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(tracks, null, 2), 'utf8')
  fs.renameSync(tmp, generatedMetaPath)
}

export function trackFilePath(filename) {
  return path.resolve(generatedDir, filename)
}

export function coverFilePath(filename) {
  return path.resolve(coversDir, filename)
}

const AUDIO_EXTENSIONS = new Set(['.wav', '.mp3'])

function audioExtensionMeta(filename) {
  const ext = path.extname(filename).toLowerCase()
  if (ext === '.mp3') {
    return { mimeType: 'audio/mpeg' }
  }
  return { mimeType: 'audio/wav' }
}

function trackFileExists(filename) {
  try {
    return fs.statSync(trackFilePath(filename)).isFile()
  } catch {
    return false
  }
}

function coverFileExists(filename) {
  if (!filename) {
    return false
  }
  try {
    return fs.statSync(coverFilePath(filename)).isFile()
  } catch {
    return false
  }
}

export function reconcileGeneratedTracks() {
  const stored = readGeneratedTracks()
  const byFilename = new Map()

  for (const track of stored) {
    if (!track?.filename || !trackFileExists(track.filename)) {
      continue
    }

    const coverFilename = coverFileExists(track.coverFilename)
      ? track.coverFilename
      : undefined

    byFilename.set(track.filename, {
      ...track,
      coverFilename,
    })
  }

  for (const filename of fs.readdirSync(generatedDir)) {
    const ext = path.extname(filename).toLowerCase()
    if (!AUDIO_EXTENSIONS.has(ext)) {
      continue
    }

    if (byFilename.has(filename)) {
      continue
    }

    const id = filename.slice(0, -ext.length)
    byFilename.set(filename, {
      id,
      title: id,
      artist: 'Generated',
      filename,
      ...audioExtensionMeta(filename),
      createdAt: fs.statSync(trackFilePath(filename)).mtimeMs,
    })
  }

  const reconciled = [...byFilename.values()].sort(
    (a, b) => (b.createdAt || 0) - (a.createdAt || 0)
  )

  if (JSON.stringify(reconciled) !== JSON.stringify(stored)) {
    writeGeneratedTracks(reconciled)
  }

  return reconciled
}

export function getAllTracks() {
  return reconcileGeneratedTracks().map((track) => ({
    ...track,
    dir: generatedDir,
  }))
}

export function getTrackById(id) {
  return getAllTracks().find((track) => track.id === id) ?? null
}

export function updateTrack(id, patch) {
  const tracks = readGeneratedTracks()
  const index = tracks.findIndex((track) => track.id === id)
  if (index === -1) {
    return null
  }

  tracks[index] = { ...tracks[index], ...patch }
  writeGeneratedTracks(tracks)
  return tracks[index]
}

export function toPublicTrack(track) {
  const coverUrl = track.coverFilename
    ? `/api/tracks/${track.id}/cover${track.coverUpdatedAt ? `?v=${track.coverUpdatedAt}` : ''}`
    : null

  return {
    id: track.id,
    title: track.title,
    artist: track.artist,
    createdAt: track.createdAt,
    coverUrl,
  }
}
