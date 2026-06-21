import { useState } from 'react'
import { generatePromoImage } from '../api/promoImage'

interface Props {
  trackId: string
  hasCover?: boolean
  onCoverGenerated?: (coverUrl: string) => void
  compact?: boolean
}

export default function PromoImageButton({
  trackId,
  hasCover,
  onCoverGenerated,
  compact = false,
}: Props) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation()

    setIsLoading(true)
    setError('')

    try {
      const result = await generatePromoImage(trackId)
      onCoverGenerated?.(result.coverUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Promo image failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={compact ? '' : 'mt-2'} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        className={`text-[11px] font-semibold rounded-sm border transition-colors disabled:opacity-50 ${
          compact
            ? 'px-2 py-1 border-black/15 hover:bg-black/5'
            : 'px-3 py-1.5 border-musica-yellow bg-white hover:bg-musica-yellow/20'
        }`}
        style={{ fontFamily: 'Raleway, sans-serif' }}
      >
        {isLoading ? 'Creating promo…' : hasCover ? 'Refresh promo art' : 'Create DJ promo art'}
      </button>
      {error && (
        <p className="text-[10px] text-red-600 mt-1" style={{ fontFamily: 'Raleway, sans-serif' }}>
          {error}
        </p>
      )}
    </div>
  )
}
