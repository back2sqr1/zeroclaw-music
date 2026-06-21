import { useEffect, useState } from 'react'
import type { Track, ActiveView } from './types'
import Header from './components/Header'
import FeaturedSection from './components/FeaturedSection'
import WeeklyTopTrack from './components/WeeklyTopTrack'
import FavoritesSidebar from './components/FavoritesSidebar'
import PlayerBar from './components/PlayerBar'
import GeneratePanel from './components/GeneratePanel'
import UploadTrackForm from './components/UploadTrackForm'
import './index.css'

interface ApiTrack {
  id: string
  title: string
  artist: string
  genre?: string
  source?: Track['source']
  url: string
  coverUrl?: string | null
}

const enrichTrack = (track: ApiTrack): Track => ({
  ...track,
  genre: track.genre || (track.source === 'generated' ? '#generated' : '#local'),
  duration: '--:--',
  cover: track.coverUrl || '',
})

export default function App() {
  const [activeView, setActiveView] = useState<ActiveView>('catalog')
  const [searchQuery, setSearchQuery] = useState('')
  const [tracks, setTracks] = useState<Track[]>([])
  const [isLoadingTracks, setIsLoadingTracks] = useState(true)
  const [trackError, setTrackError] = useState('')
  const [favorites, setFavorites] = useState<Track[]>([])
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null)
  const [catalogRevision, setCatalogRevision] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    const params = new URLSearchParams()
    const trimmedQuery = searchQuery.trim()

    if (trimmedQuery) {
      params.set('q', trimmedQuery)
    }

    setIsLoadingTracks(true)

    const loadTracks = async (attempt = 0) => {
      try {
        const response = await fetch(
          `/api/tracks${params.size ? `?${params.toString()}` : ''}`,
          { signal: controller.signal },
        )

        if (!response.ok) {
          throw new Error(`Track request failed with ${response.status}`)
        }

        const apiTracks = (await response.json()) as ApiTrack[]
        setTracks(apiTracks.map(enrichTrack))
        setTrackError('')
        setIsLoadingTracks(false)
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }

        if (attempt < 4) {
          await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)))
          if (!controller.signal.aborted) {
            await loadTracks(attempt + 1)
          }
          return
        }

        setTracks([])
        setTrackError('Unable to load tracks.')
        setIsLoadingTracks(false)
      }
    }

    void loadTracks()

    return () => {
      controller.abort()
    }
  }, [searchQuery, catalogRevision])

  const toggleFavorite = (track: Track) => {
    setFavorites((prev) =>
      prev.some((f) => f.id === track.id)
        ? prev.filter((f) => f.id !== track.id)
        : [...prev, track]
    )
  }

  const deleteTrack = async (track: Track) => {
    const shouldDelete = window.confirm(`Delete "${track.title}" from the filesystem?`)

    if (!shouldDelete) {
      return
    }

    const response = await fetch(`/api/tracks/${track.id}`, { method: 'DELETE' })

    if (!response.ok) {
      setTrackError('Unable to delete track.')
      return
    }

    setTracks((prev) => prev.filter((item) => item.id !== track.id))
    setFavorites((prev) => prev.filter((item) => item.id !== track.id))
    setCurrentTrack((current) => (current?.id === track.id ? null : current))
    setCatalogRevision((revision) => revision + 1)
  }

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden bg-white">
      {/* Header */}
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeView={activeView}
        onViewChange={setActiveView}
      />

      {/* Main body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: main content */}
        <div
          className="flex-1 overflow-y-auto flex flex-col"
          style={{ background: 'rgba(222,207,131,0.15)' }}
        >
          {activeView === 'catalog' ? (
            <>
              {/* Featured hero */}
              <FeaturedSection />

              {/* Scrollable catalog sections */}
              <div className="flex flex-col gap-6 p-5 flex-1">
                <div className="flex items-center justify-between">
                  <span
                    className="text-[11px] font-bold text-black/30 uppercase tracking-widest"
                    style={{ fontFamily: 'Raleway, sans-serif' }}
                  >
                    Library
                  </span>
                  <UploadTrackForm onUploaded={() => setCatalogRevision((r) => r + 1)} />
                </div>
                <WeeklyTopTrack
                  tracks={tracks}
                  searchQuery={searchQuery}
                  isLoading={isLoadingTracks}
                  error={trackError}
                  currentTrack={currentTrack}
                  favorites={favorites}
                  onPlay={setCurrentTrack}
                  onToggleFavorite={toggleFavorite}
                  onDelete={deleteTrack}
                  onCoverGenerated={() => setCatalogRevision((r) => r + 1)}
                />
              </div>
            </>
          ) : (
            <GeneratePanel
              onTrackGenerated={() => setCatalogRevision((r) => r + 1)}
              onCoverGenerated={() => setCatalogRevision((r) => r + 1)}
            />
          )}
        </div>

        {/* Right: favorites sidebar */}
        <div className="flex-shrink-0" style={{ width: '300px' }}>
          <FavoritesSidebar
            tracks={tracks}
            favorites={favorites}
            currentTrack={currentTrack}
            onPlay={setCurrentTrack}
            onToggleFavorite={toggleFavorite}
            onDelete={deleteTrack}
          />
        </div>
      </div>

      {/* Bottom player */}
      <PlayerBar currentTrack={currentTrack} />
    </div>
  )
}
