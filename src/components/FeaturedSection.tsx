export default function FeaturedSection() {
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
        <div
          className="flex items-center gap-2 bg-black text-musica-yellow font-bold text-[13px] px-5 py-2 rounded-sm"
          style={{ fontFamily: 'Raleway, sans-serif' }}
        >
          BROWSE
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ebd564" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7h7l2 2h9v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
            <path d="M3 7V5a2 2 0 0 1 2-2h4l2 2h4" />
          </svg>
        </div>
        <span className="ml-auto text-[11px] text-black/40" style={{ fontFamily: 'Raleway, sans-serif' }}>
          Filesystem catalog
        </span>
      </div>
    </div>
  )
}
