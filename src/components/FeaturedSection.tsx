import type { Track } from '../types'

interface Props {
  onPlay: (track: Track) => void
}

const featured: Track = {
  id: 'featured',
  title: 'Zeroclaw Music Library',
  artist: 'Local audio catalog',
  genre: '#local',
  duration: '3:00',
  cover: '',
}

export default function FeaturedSection({ onPlay }: Props) {
  return (
    <div
      className="flex-shrink-0 px-6 py-8 flex flex-col gap-4"
      style={{ background: 'rgba(235,213,100,0.94)' }}
    >
      {/* Genre tags */}
      <div className="flex gap-2">
        <span
          className="px-3 py-1 text-[11px] font-bold text-black/60 rounded-sm"
          style={{ background: 'rgba(0,0,0,0.08)', fontFamily: 'Raleway, sans-serif' }}
        >
          #local
        </span>
        <span
          className="px-3 py-1 text-[11px] font-bold text-black/60 rounded-sm"
          style={{ background: 'rgba(0,0,0,0.08)', fontFamily: 'Raleway, sans-serif' }}
        >
          #catalog
        </span>
      </div>

      {/* Title */}
      <div>
        <p
          className="text-[22px] font-bold text-black leading-snug"
          style={{ fontFamily: 'Raleway, sans-serif' }}
        >
          Zeroclaw Music
          <br />
          <span className="font-medium text-black/60">Local Library</span>
        </p>
        <p
          className="text-[12px] text-black/40 mt-1"
          style={{ fontFamily: 'Raleway, sans-serif' }}
        >
          Local audio catalog
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => onPlay(featured)}
          className="flex items-center gap-2 bg-black text-musica-yellow font-bold text-[13px] px-5 py-2 rounded-sm"
          style={{ fontFamily: 'Raleway, sans-serif' }}
        >
          PLAY
          <svg width="10" height="10" viewBox="0 0 10 10" fill="#ebd564">
            <polygon points="0,0 10,5 0,10" />
          </svg>
        </button>
        <button
          onClick={() => onPlay(featured)}
          className="w-8 h-8 border border-black/20 rounded-sm flex items-center justify-center hover:bg-black/5 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>
        <span className="ml-auto text-[11px] text-black/40" style={{ fontFamily: 'Raleway, sans-serif' }}>
          01 / 03
        </span>
      </div>
    </div>
  )
}
