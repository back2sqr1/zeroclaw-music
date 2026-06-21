import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
export const coversDir = path.resolve(rootDir, 'generated', 'covers')
const metaPath = path.join(coversDir, 'meta.json')

fs.mkdirSync(coversDir, { recursive: true })

function readMeta() {
  try {
    return JSON.parse(fs.readFileSync(metaPath, 'utf8'))
  } catch {
    return {}
  }
}

function writeMeta(meta) {
  const tmp = `${metaPath}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(meta, null, 2), 'utf8')
  fs.renameSync(tmp, metaPath)
}

export function coverFilePath(filename) {
  return path.resolve(coversDir, filename)
}

export function getCoverForTrack(trackId) {
  return readMeta()[trackId] || null
}

export function setCoverForTrack(trackId, coverFilename) {
  const meta = readMeta()
  meta[trackId] = {
    coverFilename,
    coverUpdatedAt: Date.now(),
  }
  writeMeta(meta)
  return meta[trackId]
}

export function coverUrlForTrack(trackId, coverMeta) {
  if (!coverMeta?.coverFilename) {
    return null
  }

  const version = coverMeta.coverUpdatedAt ? `?v=${coverMeta.coverUpdatedAt}` : ''
  return `/api/tracks/${trackId}/cover${version}`
}
