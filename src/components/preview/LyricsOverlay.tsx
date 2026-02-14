import { useOperatorStore } from '@/store/useOperatorStore'

export default function LyricsOverlay() {
  const { showLyricsOverlay, overlayBackgroundColor, overlayBackgroundImage, overlayTextColor } = useOperatorStore()

  if (!showLyricsOverlay) return null

  const containerStyle: React.CSSProperties = {
    backgroundColor: overlayBackgroundColor,
    color: overlayTextColor,
    ...(overlayBackgroundImage ? { 
        backgroundImage: `url(${overlayBackgroundImage})`, 
        backgroundSize: 'cover', 
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
    } : {})
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center px-8 text-center" style={containerStyle}>
      <div className="w-full h-full flex items-center justify-center overflow-hidden">
        <div className="max-h-full overflow-y-auto w-full">
          <LyricsText />
        </div>
      </div>
    </div>
  )
}

function LyricsText() {
  const { currentSongLines, currentLineIndex, overlayTextScale, overlayFontFamily } = useOperatorStore()
  const text = currentSongLines[currentLineIndex] || ''
  const isProgram = typeof window !== 'undefined' && window.location.pathname === '/program'
  const mult = (n: number) => (isProgram ? n + 40 : n)
  const px = (n: number) => `${mult(n) * overlayTextScale}px`
  return <div className="whitespace-pre-wrap leading-relaxed" style={{ fontSize: px(14), fontFamily: overlayFontFamily }}>{text}</div>
}
