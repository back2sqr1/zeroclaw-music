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

const tracks = [
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

const toPublicTrack = ({ id, title, artist }) => ({ id, title, artist })

app.get('/api/tracks', (req, res) => {
  const query = String(req.query.q || '').trim().toLowerCase()
  const matches = query
    ? tracks.filter(
        (track) =>
          track.title.toLowerCase().includes(query) ||
          track.artist.toLowerCase().includes(query)
      )
    : tracks

  res.json(matches.map(toPublicTrack))
})

app.get('/api/tracks/:id/stream', (req, res) => {
  const track = tracks.find((item) => item.id === req.params.id)

  if (!track) {
    res.status(404).json({ error: 'Track not found' })
    return
  }

  const audioPath = path.resolve(audioDir, track.filename)

  if (!audioPath.startsWith(`${audioDir}${path.sep}`)) {
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
    const contentType = 'audio/mpeg'

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
