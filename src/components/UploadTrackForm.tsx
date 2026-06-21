import { useState, useRef } from 'react'

interface Props {
  onUploaded: () => void
}

export default function UploadTrackForm({ onUploaded }: Props) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setFile(null)
    setTitle('')
    setArtist('')
    setError('')
  }

  const close = () => {
    reset()
    setOpen(false)
  }

  const handleFile = (f: File) => {
    setFile(f)
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''))
  }

  const upload = async () => {
    if (!file) return
    setIsUploading(true)
    setError('')

    const mimeType = file.type || (file.name.endsWith('.wav') ? 'audio/wav' : 'audio/mpeg')
    const params = new URLSearchParams({
      title: title.trim() || file.name.replace(/\.[^.]+$/, ''),
      artist: artist.trim() || 'Unknown',
    })

    try {
      const res = await fetch(`/api/tracks/upload?${params}`, {
        method: 'POST',
        headers: {
          'Content-Type': mimeType,
          'X-Audio-Filename': encodeURIComponent(file.name),
        },
        body: file,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Upload failed (${res.status})`)
      }

      onUploaded()
      close()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-musica-yellow text-[11px] font-bold text-black/60 hover:bg-musica-yellow/20 transition-colors"
        style={{ fontFamily: 'Raleway, sans-serif' }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        Upload Track
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-sm shadow-xl w-[360px] p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[16px] font-bold text-black" style={{ fontFamily: 'Puritan, serif' }}>
                Upload Track
              </h3>
              <button onClick={close} className="text-black/30 hover:text-black text-lg leading-none">×</button>
            </div>

            {/* Drop zone */}
            <div
              className="border-2 border-dashed border-musica-yellow/60 rounded-sm p-5 text-center cursor-pointer hover:bg-musica-yellow/10 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                const f = e.dataTransfer.files[0]
                if (f) handleFile(f)
              }}
            >
              {file ? (
                <div className="flex items-center gap-2 justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2">
                    <path d="M9 18V5l12-2v13" />
                    <circle cx="6" cy="18" r="3" />
                    <circle cx="18" cy="16" r="3" />
                  </svg>
                  <span className="text-[13px] text-black truncate max-w-[240px]" style={{ fontFamily: 'Raleway, sans-serif' }}>
                    {file.name}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); setFile(null) }}
                    className="text-black/30 hover:text-black text-base leading-none ml-1"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <p className="text-[12px] text-black/40" style={{ fontFamily: 'Raleway, sans-serif' }}>
                  Click or drag an MP3 / WAV file here
                </p>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp3,.wav,audio/mpeg,audio/wav"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />

            {/* Metadata */}
            <div className="flex flex-col gap-2">
              <input
                type="text"
                placeholder="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="border border-gray-200 rounded-sm px-3 py-2 text-[13px] outline-none focus:border-musica-yellow transition-colors"
                style={{ fontFamily: 'Raleway, sans-serif' }}
              />
              <input
                type="text"
                placeholder="Artist"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                className="border border-gray-200 rounded-sm px-3 py-2 text-[13px] outline-none focus:border-musica-yellow transition-colors"
                style={{ fontFamily: 'Raleway, sans-serif' }}
              />
            </div>

            {error && (
              <p className="text-[12px] text-red-500" style={{ fontFamily: 'Raleway, sans-serif' }}>
                {error}
              </p>
            )}

            <div className="flex gap-2 justify-end">
              <button
                onClick={close}
                className="px-4 py-2 rounded-sm text-[12px] text-black/50 hover:text-black transition-colors"
                style={{ fontFamily: 'Raleway, sans-serif' }}
              >
                Cancel
              </button>
              <button
                onClick={upload}
                disabled={!file || isUploading}
                className="px-4 py-2 rounded-sm text-[12px] bg-musica-dark text-musica-yellow disabled:opacity-40 hover:bg-black transition-colors"
                style={{ fontFamily: 'Raleway, sans-serif' }}
              >
                {isUploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
