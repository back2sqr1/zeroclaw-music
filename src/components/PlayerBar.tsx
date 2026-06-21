import type { Track } from '../types'

interface Props {
  currentTrack: Track | null
}

export default function PlayerBar({ currentTrack }: Props) {
  return (
    <div
      className="flex-shrink-0 flex items-center px-6 gap-6"
      style={{ background: '#242424', height: '52px' }}
    >
      {/* Track info */}
      <div className="w-52 flex-shrink-0 min-w-0">
        {currentTrack ? (
          <div>
            <p
              className="text-[12px] font-semibold text-musica-yellow truncate"
              style={{ fontFamily: 'Raleway, sans-serif' }}
            >
              {currentTrack.title}
            </p>
            <p
              className="text-[10px] truncate"
              style={{ fontFamily: 'Raleway, sans-serif', color: 'rgba(255,255,255,0.35)' }}
            >
              {currentTrack.artist}
            </p>
          </div>
        ) : (
          <p
            className="text-[11px]"
            style={{ fontFamily: 'Raleway, sans-serif', color: 'rgba(255,255,255,0.2)' }}
          >
            — no track selected —
          </p>
        )}
      </div>

      {/* Player */}
      <div className="flex-1 min-w-0">
        {currentTrack ? (
          <audio
            key={currentTrack.id}
            controls
            src={`/api/tracks/${currentTrack.id}/stream`}
            className="w-full h-8"
          />
        ) : (
          <div className="h-8 rounded-sm" style={{ background: 'rgba(255,255,255,0.06)' }} />
        )}
      </div>
    </div>
  )
}
