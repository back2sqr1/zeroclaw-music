import { useState, useRef } from 'react'
import type { ChatMessage } from '../types'

export default function GeneratePanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hi! Describe the music you want to generate. You can type a text prompt, upload an audio reference, or both.',
      timestamp: 0,
    },
  ])
  const [input, setInput] = useState('')
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const send = async () => {
    if (!input.trim() && !audioFile) return

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: input.trim() || '',
      audioFile: audioFile?.name,
      timestamp: Date.now(),
    }

    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setAudioFile(null)
    setIsLoading(true)

    // TODO: call backend music generation API
    // const response = await fetch('/api/generate', {
    //   method: 'POST',
    //   body: JSON.stringify({ prompt: userMsg.content, audioFile: ... }),
    // })

    setTimeout(() => {
      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: `Generating music for: "${userMsg.content || 'audio reference'}"...\n\n[Backend not yet connected — your generation endpoint will return results here.]`,
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, assistantMsg])
      setIsLoading(false)
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    }, 1200)
  }

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="flex flex-col h-full" style={{ background: 'rgba(222,207,131,0.15)' }}>
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-musica-yellow/30">
        <h2
          className="text-[20px] font-bold text-black"
          style={{ fontFamily: 'Puritan, serif' }}
        >
          ✦ Generate Music
        </h2>
        <p
          className="text-[12px] text-black/50 mt-0.5"
          style={{ fontFamily: 'Raleway, sans-serif' }}
        >
          Describe your track or upload an audio reference
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[75%] rounded-lg px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-musica-dark text-white'
                  : 'bg-musica-yellow text-black'
              }`}
            >
              {msg.audioFile && (
                <div
                  className="flex items-center gap-2 mb-2 px-2 py-1 rounded text-xs"
                  style={{ background: 'rgba(255,255,255,0.15)' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18V5l12-2v13" />
                    <circle cx="6" cy="18" r="3" />
                    <circle cx="18" cy="16" r="3" />
                  </svg>
                  {msg.audioFile}
                </div>
              )}
              <p
                className="text-[13px] whitespace-pre-wrap"
                style={{ fontFamily: 'Raleway, sans-serif' }}
              >
                {msg.content}
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-musica-yellow rounded-lg px-4 py-3 flex items-center gap-2">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 bg-black/40 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
              <span
                className="text-[12px] text-black/60"
                style={{ fontFamily: 'Raleway, sans-serif' }}
              >
                Generating...
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div
        className="flex-shrink-0 p-4 border-t"
        style={{ borderColor: 'rgba(235,213,100,0.4)', background: 'white' }}
      >
        {/* Audio file preview */}
        {audioFile && (
          <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-sm text-sm bg-musica-yellow/30">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2">
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
            <span className="flex-1 truncate text-[12px]" style={{ fontFamily: 'Raleway, sans-serif' }}>
              {audioFile.name}
            </span>
            <button
              onClick={() => setAudioFile(null)}
              className="text-black/50 hover:text-black"
            >
              ×
            </button>
          </div>
        )}

        <div className="flex gap-2 items-end">
          {/* Audio upload */}
          <button
            onClick={() => fileInputRef.current?.click()}
            title="Upload audio reference"
            className="flex-shrink-0 w-10 h-10 rounded-sm flex items-center justify-center border-2 border-musica-yellow hover:bg-musica-yellow/20 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2">
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && setAudioFile(e.target.files[0])}
          />

          {/* Text input */}
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Describe the music you want... (e.g. 'upbeat lo-fi hip hop with jazz piano')"
            rows={2}
            className="flex-1 resize-none rounded-sm border border-gray-200 px-3 py-2 text-[13px] outline-none focus:border-musica-yellow transition-colors"
            style={{ fontFamily: 'Raleway, sans-serif' }}
          />

          {/* Send */}
          <button
            onClick={send}
            disabled={isLoading || (!input.trim() && !audioFile)}
            className="flex-shrink-0 w-10 h-10 rounded-sm flex items-center justify-center bg-musica-dark text-musica-yellow disabled:opacity-40 hover:bg-black transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
            </svg>
          </button>
        </div>
        <p
          className="text-[10px] text-gray-400 mt-1.5"
          style={{ fontFamily: 'Raleway, sans-serif' }}
        >
          Press Enter to send · Shift+Enter for new line · Audio upload supports MP3, WAV, M4A
        </p>
      </div>
    </div>
  )
}
