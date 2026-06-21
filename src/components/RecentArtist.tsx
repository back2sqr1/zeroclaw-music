import { artists } from '../data/catalog'
import type { Track } from '../types'
import { tracks } from '../data/catalog'

interface Props {
  onPlay: (track: Track) => void
}

export default function RecentArtist({ onPlay }: Props) {
  return (
    <div className="flex-shrink-0">
      <h2
        className="text-[11px] font-bold text-black/30 uppercase tracking-widest mb-3"
        style={{ fontFamily: 'Raleway, sans-serif' }}
      >
        Recent Artist
      </h2>
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {artists.map((artist) => {
          const artistTrack = tracks.find((t) => t.artist === artist.name)
          return (
            <div
              key={artist.id}
              className="flex-shrink-0 cursor-pointer group"
              style={{ width: '100px' }}
              onClick={() => artistTrack && onPlay(artistTrack)}
            >
              <div
                className="w-full h-[64px] rounded-sm flex items-center justify-center border border-gray-100 group-hover:border-musica-yellow transition-colors bg-white"
              >
                <span
                  className="text-[18px] select-none"
                  style={{ fontFamily: 'Raleway, sans-serif' }}
                >
                  {artist.name.charAt(0)}
                </span>
              </div>
              <p
                className="text-[11px] font-semibold text-black mt-1.5 truncate text-center"
                style={{ fontFamily: 'Raleway, sans-serif' }}
              >
                {artist.name}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
