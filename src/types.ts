export interface Track {
  id: string
  title: string
  artist: string
  genre: string
  duration: string
  cover: string
}

export interface Artist {
  id: string
  name: string
  image: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  audioFile?: string
  timestamp: number
}

export type ActiveView = 'catalog' | 'generate'
