#!/usr/bin/env node
// One-time migration: upload local audio/ files to Supabase Storage and insert metadata rows.
// Safe to re-run — skips files whose IDs already exist in the tracks table.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { loadEnvFile } from '../lib/env.js'
import { AUDIO_MIME_TYPES, fileTrackId, titleFromFilename } from '../lib/audio-utils.js'
import { embedPrompt, embedAudio } from '../lib/embeddings.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const audioDir = path.resolve(__dirname, '..', 'audio')

loadEnvFile()

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '')
const supabase = createClient(
  SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY,
)

// Sanitize filename for use as a Supabase Storage path — keeps letters, digits,
// dots, dashes, underscores, and spaces; replaces everything else (?, ', etc.)
function storagePathFor(filename) {
  return filename.replace(/[^a-zA-Z0-9._\- ]/g, '_')
}

function listAudioFiles(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isFile() && AUDIO_MIME_TYPES[path.extname(e.name).toLowerCase()])
      .map((e) => e.name)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
  } catch {
    return []
  }
}

// Verify the Supabase connection and Storage API are reachable before doing any work.
async function checkConnection() {
  const storageUrl = `${SUPABASE_URL}/storage/v1/bucket`
  const res = await fetch(storageUrl, {
    headers: {
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY}`,
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY,
    },
  }).catch((e) => { throw new Error(`Could not reach Supabase at ${SUPABASE_URL}: ${e.message}`) })

  if (res.status === 401) {
    throw new Error(
      'Supabase returned 401 Unauthorized.\n' +
      '  → Make sure SUPABASE_SERVICE_ROLE_KEY is the service_role key (Settings → API),\n' +
      '    not the anon key.',
    )
  }
  if (!res.ok && res.status !== 200) {
    const body = await res.text().catch(() => '')
    throw new Error(
      `Supabase Storage API returned ${res.status} at ${storageUrl}.\n` +
      `  Response: ${body.slice(0, 300)}\n` +
      '  → Verify SUPABASE_URL is in the format https://xxx.supabase.co (no trailing slash, no /rest/v1).',
    )
  }

  console.log(`  ✓ Connected to ${SUPABASE_URL}`)
}

async function ensureBucketsExist() {
  for (const bucketId of ['audio']) {
    const { data: existing } = await supabase.storage.getBucket(bucketId)

    if (existing) {
      // Bucket exists — clear any restrictive file_size_limit
      const { error } = await supabase.storage.updateBucket(bucketId, {
        public: true,
        fileSizeLimit: null,
      })
      if (error) {
        console.warn(`  [warn] Could not update "${bucketId}" file size limit: ${error.message}`)
      } else {
        console.log(`  bucket "${bucketId}" already exists — settings updated`)
      }
    } else {
      const { error } = await supabase.storage.createBucket(bucketId, {
        public: true,
        fileSizeLimit: null,
      })
      if (error) {
        throw new Error(`Failed to create bucket "${bucketId}": ${error.message}`)
      }
      console.log(`  bucket "${bucketId}" created`)
    }
  }
}

async function seedFile(filename) {
  const storagePath = storagePathFor(filename)
  const id = fileTrackId('audio', filename)
  const title = titleFromFilename(filename)
  const ext = path.extname(filename).toLowerCase()
  const mimeType = AUDIO_MIME_TYPES[ext]

  // Skip if already in DB
  const { data: existing } = await supabase.from('tracks').select('id').eq('id', id).single()
  if (existing) {
    console.log(`  skip  ${filename} (already seeded)`)
    return
  }

  const filePath = path.join(audioDir, filename)
  const fileBuffer = fs.readFileSync(filePath)

  const { error: uploadError } = await supabase.storage
    .from('audio')
    .upload(storagePath, new Blob([fileBuffer], { type: mimeType }), { upsert: true })
  if (uploadError) {
    throw new Error(
      `Storage upload failed: ${uploadError.message}` +
      (uploadError.message.includes('Entity Too Large')
        ? '\n    → Supabase Dashboard → Storage → Edit "audio" bucket → increase file size limit'
        : ''),
    )
  }

  console.log(`  embed ${filename}`)
  const [promptVec, audioVec] = await Promise.all([
    embedPrompt(title).catch((e) => { console.warn(`    [warn] prompt embed failed: ${e.message}`); return null }),
    embedAudio(fileBuffer).catch((e) => { console.warn(`    [warn] audio embed failed: ${e.message}`); return null }),
  ])

  const { error: insertError } = await supabase.from('tracks').insert({
    id,
    title,
    artist: 'ZeroClaw',
    filename: storagePath,
    bucket: 'audio',
    mime_type: mimeType,
    source: 'audio',
    prompt: title,
    ...(promptVec ? { prompt_embedding: promptVec } : {}),
    ...(audioVec ? { audio_embedding: audioVec } : {}),
  })
  if (insertError) throw new Error(`DB insert failed: ${insertError.message}`)

  console.log(`  done  ${filename}`)
}

async function main() {
  if (!SUPABASE_URL || !(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY)) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SECRET_KEY env vars')
    process.exit(1)
  }
  if (!process.env.OPENAI_API_KEY) {
    console.error('Missing OPENAI_API_KEY env var')
    process.exit(1)
  }

  // Diagnose connection before doing any real work
  await checkConnection().catch((err) => {
    console.error(`\nConnection check failed:\n  ${err.message}\n`)
    process.exit(1)
  })

  await ensureBucketsExist().catch((err) => {
    console.error(`\nBucket setup failed:\n  ${err.message}\n`)
    process.exit(1)
  })

  const files = listAudioFiles(audioDir)
  if (files.length === 0) {
    console.log('No audio files found in audio/ directory')
    return
  }

  console.log(`\nSeeding ${files.length} file(s) from audio/ …`)
  for (const filename of files) {
    try {
      await seedFile(filename)
    } catch (err) {
      console.error(`  ERROR ${filename}: ${err.message}`)
    }
  }
  console.log('Done.')
}

main()
