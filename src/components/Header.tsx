import type { ActiveView } from '../types'

interface Props {
  searchQuery: string
  onSearchChange: (q: string) => void
  activeView: ActiveView
  onViewChange: (v: ActiveView) => void
}

export default function Header({ searchQuery, onSearchChange, activeView, onViewChange }: Props) {
  return (
    <div className="flex items-center h-[58px] px-6 bg-white border-b border-gray-100 flex-shrink-0 gap-4">
      {/* Search bar */}
      <div className="flex-1">
        <div className="flex items-center border-b border-gray-200 h-[36px] gap-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search tracks, artists, genres..."
            className="flex-1 text-[13px] text-gray-600 placeholder-gray-300 outline-none bg-transparent"
            style={{ fontFamily: 'Raleway, sans-serif' }}
          />
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300 flex-shrink-0">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
      </div>

      {/* Nav tabs */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={() => onViewChange('catalog')}
          className={`px-4 py-1.5 text-[12px] font-semibold transition-colors rounded-sm ${
            activeView === 'catalog'
              ? 'bg-musica-yellow text-black'
              : 'text-gray-400 hover:text-black'
          }`}
          style={{ fontFamily: 'Raleway, sans-serif' }}
        >
          Catalog
        </button>
        <button
          onClick={() => onViewChange('generate')}
          className={`px-4 py-1.5 text-[12px] font-semibold transition-colors rounded-sm ${
            activeView === 'generate'
              ? 'bg-musica-yellow text-black'
              : 'text-gray-400 hover:text-black'
          }`}
          style={{ fontFamily: 'Raleway, sans-serif' }}
        >
          ✦ Generate
        </button>
      </div>
    </div>
  )
}
