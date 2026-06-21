import express from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const port = process.env.PORT || 3000
const audioDir = path.resolve(__dirname, 'audio')
const distDir = path.resolve(__dirname, 'dist')
const indexHtml = path.join(distDir, 'index.html')
const generatedDir = path.resolve(__dirname, 'generated')
const generatedMetaPath = path.join(generatedDir, 'tracks.json')

fs.mkdirSync(generatedDir, { recursive: true })

const staticTracks = [
  {
    id: 'the-gaping-mouth',
    title: 'The Gaping Mouth',
    artist: 'ZeroClaw',
    filename: '1. The Gaping Mouth.mp3',
  },
  {
    id: 'drowning-act',
    title: 'Drowning Act',
    artist: 'ZeroClaw',
    filename: '2. Drowning Act.mp3',
  },
  {
    id: 'sleep-talking',
    title: 'Sleep Talking',
    artist: 'ZeroClaw',
    filename: '3. Sleep Talking.mp3',
  },
  {
    id: 'why-do-you-let-me-stay-here',
    title: 'Why Do You Let Me Stay Here?',
    artist: 'ZeroClaw',
    filename: '4. Why Do You Let Me Stay Here?.mp3',
  },
]

function readGeneratedTracks() {
  try {
    return JSON.parse(fs.readFileSync(generatedMetaPath, 'utf8'))
  } catch {
    return []
  }
}

function writeGeneratedTracks(tracks) {
  const tmp = generatedMetaPath + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(tracks, null, 2), 'utf8')
  fs.renameSync(tmp, generatedMetaPath)
}

function getAllTracks() {
  const statics = staticTracks.map((t) => ({
    ...t,
    mimeType: 'audio/mpeg',
    dir: audioDir,
  }))
  const generated = readGeneratedTracks().map((g) => ({
    ...g,
    dir: generatedDir,
  }))
  return [...statics, ...generated]
}

const toPublicTrack = ({ id, title, artist }) => ({ id, title, artist })

app.get('/api/tracks', (req, res) => {
  const query = String(req.query.q || '').trim().toLowerCase()
  const all = getAllTracks()
  const matches = query
    ? all.filter(
        (track) =>
          track.title.toLowerCase().includes(query) ||
          track.artist.toLowerCase().includes(query)
      )
    : all

  res.json(matches.map(toPublicTrack))
})

app.post(
  '/api/generate',
  express.raw({ type: () => true, limit: '50mb' }),
  async (req, res) => {
    const apiKey = process.env.STABILITY_API_KEY
    if (!apiKey) {
      res.status(500).json({ error: 'STABILITY_API_KEY not configured' })
      return
    }

    const prompt = String(req.query.prompt || '').trim()
    const duration = Math.min(Math.max(Number(req.query.duration) || 30, 1), 180)
    const hasAudio = req.body instanceof Buffer && req.body.length > 0

    if (!prompt && !hasAudio) {
      res.status(400).json({ error: 'prompt or audio reference required' })
      return
    }

    // Step 1: submit generation job
    const fd = new FormData()
    if (prompt) fd.append('prompt', prompt)
    fd.append('output_format', 'mp3')
    fd.append('duration', String(duration))
    if (hasAudio) {
      const audioMime = String(req.headers['x-audio-mime'] || 'audio/mpeg')
      fd.append('audio', new Blob([req.body], { type: audioMime }), 'reference')
    }

    let submitRes
    try {
      submitRes = await fetch(
        'https://api.stability.ai/v2beta/audio/stable-audio/text-to-audio',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: 'audio/*',
          },
          body: fd,
          signal: AbortSignal.timeout(30_000),
        }
      )
    } catch {
      res.status(502).json({ error: 'Failed to reach Stability AI' })
      return
    }

    if (!submitRes.ok) {
      const detail = await submitRes.text().catch(() => '')
      res.status(502).json({ error: `Stability AI error ${submitRes.status}`, detail })
      return
    }

    const { id: generationId } = await submitRes.json()

    // Step 2: poll until ready (202 = processing, 200 = done)
    const pollUrl = `https://api.stability.ai/v2beta/audio/results/${generationId}`
    const pollHeaders = { Authorization: `Bearer ${apiKey}`, Accept: 'audio/*' }
    let audioBuffer

    for (let attempt = 0; attempt < 30; attempt++) {
      await new Promise((r) => setTimeout(r, 10_000))

      let pollRes
      try {
        pollRes = await fetch(pollUrl, {
          headers: pollHeaders,
          signal: AbortSignal.timeout(15_000),
        })
      } catch {
        continue
      }

      if (pollRes.status === 202) continue

      if (pollRes.status === 200) {
        audioBuffer = Buffer.from(await pollRes.arrayBuffer())
        break
      }

      const detail = await pollRes.text().catch(() => '')
      res.status(502).json({ error: `Stability AI poll error ${pollRes.status}`, detail })
      return
    }

    if (!audioBuffer) {
      res.status(504).json({ error: 'Generation timed out' })
      return
    }

    const id = `gen-${Date.now()}`
    const filename = `${id}.mp3`
    fs.writeFileSync(path.join(generatedDir, filename), audioBuffer)

    const meta = {
      id,
      title: prompt ? prompt.slice(0, 80) : 'Audio reference generation',
      artist: 'Stability AI',
      filename,
      mimeType: 'audio/mpeg',
      createdAt: Date.now(),
    }
    writeGeneratedTracks([...readGeneratedTracks(), meta])

    res.status(201).json(meta)
  }
)

app.get('/api/tracks/:id/stream', (req, res) => {
  const track = getAllTracks().find((item) => item.id === req.params.id)

  if (!track) {
    res.status(404).json({ error: 'Track not found' })
    return
  }

  const audioPath = path.resolve(track.dir, track.filename)

  if (!audioPath.startsWith(`${track.dir}${path.sep}`)) {
    res.status(404).json({ error: 'Track not found' })
    return
  }

  fs.stat(audioPath, (statError, stats) => {
    if (statError || !stats.isFile()) {
      res.status(404).json({ error: 'Audio file not found' })
      return
    }

    const fileSize = stats.size
    const range = req.headers.range
    const contentType = track.mimeType

    if (!range) {
      res.writeHead(200, {
        'Accept-Ranges': 'bytes',
        'Content-Length': fileSize,
        'Content-Type': contentType,
      })
      fs.createReadStream(audioPath).pipe(res)
      return
    }

    const byteRange = parseRange(range, fileSize)

    if (!byteRange) {
      res.writeHead(416, {
        'Content-Range': `bytes */${fileSize}`,
      })
      res.end()
      return
    }

    const { start, end } = byteRange
    const chunkSize = end - start + 1

    res.writeHead(206, {
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Content-Type': contentType,
    })
    fs.createReadStream(audioPath, { start, end }).pipe(res)
  })
})

app.use(express.static(distDir))

app.use((req, res, next) => {
  if (req.method !== 'GET' || req.path.startsWith('/api/')) {
    next()
    return
  }

  res.sendFile(indexHtml)
})

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`)
})

function parseRange(rangeHeader, fileSize) {
  if (!rangeHeader.startsWith('bytes=') || rangeHeader.includes(',')) {
    return null
  }

  const [startText, endText] = rangeHeader.replace('bytes=', '').split('-')
  let start
  let end

  if (startText === '') {
    const suffixLength = Number.parseInt(endText, 10)

    if (!Number.isInteger(suffixLength) || suffixLength <= 0) {
      return null
    }

    start = Math.max(fileSize - suffixLength, 0)
    end = fileSize - 1
  } else {
    start = Number.parseInt(startText, 10)
    end = endText ? Number.parseInt(endText, 10) : fileSize - 1

    if (end >= fileSize) {
      end = fileSize - 1
    }
  }

  if (
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < 0 ||
    end < start ||
    start >= fileSize
  ) {
    return null
  }

  return { start, end }
}
