export interface Track {
  id: string
  title: string
  artist: string
  genre: string
  duration: string
  cover: string
  url?: string
  source?: 'audio' | 'generated' | 'local'
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  audioFile?: string
  generatedTrackId?: string
  generatedTrackUrl?: string
  coverUrl?: string
  timestamp: number
}

export interface GeneratedTrackMeta {
  id: string
  title: string
  artist: string
  filename: string
  mimeType: string
  createdAt: number
}

export type ActiveView = 'catalog' | 'generate'
