import type { Track } from '../types'

interface Props {
  tracks: Track[]
  searchQuery: string
  isLoading: boolean
  error: string
  currentTrack: Track | null
  favorites: Track[]
  onPlay: (track: Track) => void
  onToggleFavorite: (track: Track) => void
  onDelete: (track: Track) => void
}

export default function WeeklyTopTrack({
  tracks,
  searchQuery,
  isLoading,
  error,
  currentTrack,
  favorites,
  onPlay,
  onToggleFavorite,
  onDelete,
}: Props) {
  return (
    <div className="flex-shrink-0">
      <h2
        className="text-[11px] font-bold text-black/30 uppercase tracking-widest mb-3"
        style={{ fontFamily: 'Raleway, sans-serif' }}
      >
        Weekly Top Track
      </h2>
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {tracks.map((track) => {
          const isActive = currentTrack?.id === track.id
          const isFav = favorites.some((f) => f.id === track.id)
          return (
            <div
              key={track.id}
              className={`flex-shrink-0 cursor-pointer rounded-sm px-4 py-3 transition-colors border ${
                isActive
                  ? 'bg-musica-dark border-musica-dark'
                  : 'bg-white border-gray-100 hover:border-musica-yellow'
              }`}
              style={{ width: '140px' }}
              title="Select for bottom player"
              onClick={() => onPlay(track)}
            >
              <div className="flex items-start justify-between mb-2">
                <span
                  className={`text-[10px] font-bold ${isActive ? 'text-musica-yellow/60' : 'text-black/30'}`}
                  style={{ fontFamily: 'Raleway, sans-serif' }}
                >
                  {track.genre}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleFavorite(track) }}
                  className="leading-none"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill={isFav ? '#ebd564' : 'none'} stroke={isActive ? '#ebd564' : '#ccc'} strokeWidth="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                </button>
              </div>
              <p
                className={`text-[13px] font-bold truncate ${isActive ? 'text-white' : 'text-black'}`}
                style={{ fontFamily: 'Raleway, sans-serif' }}
              >
                {track.title}
              </p>
              <p
                className={`text-[10px] truncate mt-0.5 ${isActive ? 'text-white/40' : 'text-black/30'}`}
                style={{ fontFamily: 'Raleway, sans-serif' }}
              >
                {track.artist}
              </p>
              <div className="flex items-center justify-between mt-3">
                <span
                  className={`text-[9px] ${isActive ? 'text-white/30' : 'text-black/20'}`}
                  style={{ fontFamily: 'Raleway, sans-serif' }}
                >
                  {track.duration}
                </span>
                <button
                  type="button"
                  title="Delete audio file"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(track)
                  }}
                  className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                    isActive ? 'bg-musica-yellow hover:bg-red-200' : 'bg-black/5 hover:bg-red-100'
                  }`}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={isActive ? 'black' : '#777'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18" />
                    <path d="M8 6V4h8v2" />
                    <path d="M19 6l-1 14H6L5 6" />
                    <path d="M10 11v5" />
                    <path d="M14 11v5" />
                  </svg>
                </button>
              </div>
            </div>
          )
        })}
        {isLoading && (
          <p className="text-[12px] text-gray-300 py-4" style={{ fontFamily: 'Raleway, sans-serif' }}>
            Loading tracks...
          </p>
        )}
        {error && !isLoading && (
          <p className="text-[12px] text-gray-300 py-4" style={{ fontFamily: 'Raleway, sans-serif' }}>
            {error}
          </p>
        )}
        {tracks.length === 0 && !isLoading && !error && (
          <p className="text-[12px] text-gray-300 py-4" style={{ fontFamily: 'Raleway, sans-serif' }}>
            No tracks match "{searchQuery}"
          </p>
        )}
      </div>
    </div>
  )
}
