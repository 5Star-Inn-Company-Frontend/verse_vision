import { useOperatorStore } from '@/store/useOperatorStore'

export default function LyricsOverlay() {
  const { showLyricsOverlay, overlayBackgroundColor } = useOperatorStore()
  const { currentSongLines, currentLineIndex, overlayTextScale, overlayFontFamily } = useOperatorStore()
  const text = currentSongLines[currentLineIndex] || ''

  if (!showLyricsOverlay) return null

  return (
    <div className="absolute inset-0 flex items-center justify-center px-8 text-center" style={{ backgroundColor: overlayBackgroundColor }}>
      <div className="text-white w-full h-full flex items-center justify-center overflow-hidden">
        <div className="max-h-full overflow-y-auto w-full">
          <div className="whitespace-pre-wrap leading-relaxed" style={{ fontSize: `${29 * overlayTextScale}px`, fontFamily: overlayFontFamily }}>{text}</div>
        </div>
      </div>
    </div>
  )
}