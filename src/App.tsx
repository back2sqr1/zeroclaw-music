import { useEffect, useState } from 'react'
import type { Track, ActiveView } from './types'
import Header from './components/Header'
import FeaturedSection from './components/FeaturedSection'
import WeeklyTopTrack from './components/WeeklyTopTrack'
import FavoritesSidebar from './components/FavoritesSidebar'
import PlayerBar from './components/PlayerBar'
import GeneratePanel from './components/GeneratePanel'
import './index.css'

interface ApiTrack {
  id: string
  title: string
  artist: string
}

const enrichTrack = (track: ApiTrack): Track => ({
  ...track,
  genre: '#local',
  duration: '--:--',
  cover: '',
})

export default function App() {
  const [activeView, setActiveView] = useState<ActiveView>('catalog')
  const [searchQuery, setSearchQuery] = useState('')
  const [tracks, setTracks] = useState<Track[]>([])
  const [isLoadingTracks, setIsLoadingTracks] = useState(true)
  const [trackError, setTrackError] = useState('')
  const [favorites, setFavorites] = useState<Track[]>([])
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    const params = new URLSearchParams()
    const trimmedQuery = searchQuery.trim()

    if (trimmedQuery) {
      params.set('q', trimmedQuery)
    }

    fetch(`/api/tracks${params.size ? `?${params.toString()}` : ''}`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Track request failed with ${response.status}`)
        }

        return response.json() as Promise<ApiTrack[]>
      })
      .then((apiTracks) => {
        setTracks(apiTracks.map(enrichTrack))
        setTrackError('')
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }

        setTracks([])
        setTrackError('Unable to load tracks.')
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoadingTracks(false)
        }
      })

    return () => {
      controller.abort()
    }
  }, [searchQuery])

  const toggleFavorite = (track: Track) => {
    setFavorites((prev) =>
      prev.some((f) => f.id === track.id)
        ? prev.filter((f) => f.id !== track.id)
        : [...prev, track]
    )
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
              <FeaturedSection onPlay={setCurrentTrack} />

              {/* Scrollable catalog sections */}
              <div className="flex flex-col gap-6 p-5 flex-1">
                <WeeklyTopTrack
                  tracks={tracks}
                  searchQuery={searchQuery}
                  isLoading={isLoadingTracks}
                  error={trackError}
                  currentTrack={currentTrack}
                  favorites={favorites}
                  onPlay={setCurrentTrack}
                  onToggleFavorite={toggleFavorite}
                />
              </div>
            </>
          ) : (
            <GeneratePanel />
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
          />
        </div>
      </div>

      {/* Bottom player */}
      <PlayerBar currentTrack={currentTrack} />
    </div>
  )
}
