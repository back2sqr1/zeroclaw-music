import type { Track } from '../types'

interface Props {
  tracks: Track[]
  favorites: Track[]
  currentTrack: Track | null
  onPlay: (track: Track) => void
  onToggleFavorite: (track: Track) => void
  onDelete: (track: Track) => void
}

export default function FavoritesSidebar({
  tracks,
  favorites,
  currentTrack,
  onPlay,
  onToggleFavorite,
  onDelete,
}: Props) {
  const displayTracks = favorites.length > 0 ? favorites : tracks.slice(0, 7)

  return (
    <div
      className="flex flex-col h-full overflow-hidden border-l"
      style={{ background: '#ebd564', borderColor: 'rgba(0,0,0,0.06)' }}
    >
      <h2
        className="text-[11px] font-bold text-black/30 uppercase tracking-widest px-5 pt-5 pb-3 flex-shrink-0"
        style={{ fontFamily: 'Raleway, sans-serif' }}
      >
        My favorite tracks
      </h2>

      <div className="flex-1 overflow-y-auto">
        {displayTracks.map((track, i) => {
          const isActive = currentTrack?.id === track.id
          const isFav = favorites.some((f) => f.id === track.id)

          return (
            <div
              key={track.id}
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b transition-colors ${
                isActive ? 'bg-musica-dark' : 'hover:bg-[#dfc950]'
              }`}
              style={{ borderColor: 'rgba(0,0,0,0.06)' }}
              title="Select for bottom player"
              onClick={() => onPlay(track)}
            >
              {/* Index */}
              <span
                className={`text-[11px] font-bold w-4 text-center flex-shrink-0 ${
                  isActive ? 'text-musica-yellow/40' : 'text-black/20'
                }`}
                style={{ fontFamily: 'Raleway, sans-serif' }}
              >
                {String(i + 1).padStart(2, '0')}
              </span>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p
                  className={`text-[12px] font-semibold truncate ${isActive ? 'text-white' : 'text-black'}`}
                  style={{ fontFamily: 'Raleway, sans-serif' }}
                >
                  {track.title}
                </p>
                <p
                  className={`text-[10px] truncate ${isActive ? 'text-white/40' : 'text-black/40'}`}
                  style={{ fontFamily: 'Raleway, sans-serif' }}
                >
                  {track.artist}
                </p>
              </div>

              {/* Duration */}
              <span
                className={`text-[10px] flex-shrink-0 ${isActive ? 'text-white/30' : 'text-black/30'}`}
                style={{ fontFamily: 'Raleway, sans-serif' }}
              >
                {track.duration}
              </span>

              {/* Heart */}
              <button
                className="flex-shrink-0"
                onClick={(e) => { e.stopPropagation(); onToggleFavorite(track) }}
                title={isFav ? 'Remove from favorites' : 'Add to favorites'}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill={isFav ? (isActive ? '#ebd564' : 'black') : 'none'}
                  stroke={isActive ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)'}
                  strokeWidth="2"
                >
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </button>

              {/* Delete */}
              <button
                className="flex-shrink-0"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(track)
                }}
                title="Delete audio file"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={isActive ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.35)'}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 6h18" />
                  <path d="M8 6V4h8v2" />
                  <path d="M19 6l-1 14H6L5 6" />
                  <path d="M10 11v5" />
                  <path d="M14 11v5" />
                </svg>
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
