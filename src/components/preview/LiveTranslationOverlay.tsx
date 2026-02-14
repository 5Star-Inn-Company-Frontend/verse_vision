import { useMemo } from 'react'
import { useOperatorStore } from '@/store/useOperatorStore'

export default function LiveTranslationOverlay() {
  const { 
    liveTranslationEnabled, 
    liveTranslationContent,
    translationStyle, 
    translationEnabledYoruba, 
    translationEnabledHausa, 
    translationEnabledIgbo, 
    translationEnabledFrench,
    overlayBackgroundColor,
    overlayBackgroundImage,
    overlayFontFamily,
    overlayTextScale,
    overlayTextColor
  } = useOperatorStore()

  const containerStyle: React.CSSProperties = {
    fontFamily: overlayFontFamily,
    backgroundColor: overlayBackgroundColor,
    color: overlayTextColor,
    ...(overlayBackgroundImage ? { 
        backgroundImage: `url(${overlayBackgroundImage})`, 
        backgroundSize: 'cover', 
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
    } : {})
  }

  const activeTranslations = useMemo(() => {
    if (!liveTranslationContent?.translations) return []
    const t = liveTranslationContent.translations
    const langs: { label: string; text: string; color: string }[] = []
    
    const getVal = (k: string) => t[k] || t[k.toLowerCase()] || t[k.toUpperCase()]

    const yo = getVal('Yoruba')
    if (translationEnabledYoruba && yo) langs.push({ label: 'Yoruba', text: yo, color: 'text-emerald-300' })
    
    const ha = getVal('Hausa')
    if (translationEnabledHausa && ha) langs.push({ label: 'Hausa', text: ha, color: 'text-blue-300' })
    
    const ig = getVal('Igbo')
    if (translationEnabledIgbo && ig) langs.push({ label: 'Igbo', text: ig, color: 'text-pink-300' })
    
    const fr = getVal('French')
    if (translationEnabledFrench && fr) langs.push({ label: 'French', text: fr, color: 'text-yellow-300' })
    
    return langs
  }, [liveTranslationContent, translationEnabledYoruba, translationEnabledHausa, translationEnabledIgbo, translationEnabledFrench])

  if (!liveTranslationEnabled || !liveTranslationContent) return null

  const { text } = liveTranslationContent

  // Subtitle Style
  if (translationStyle === 'subtitle') {
    return (
      <div className="absolute inset-0 flex flex-col justify-end px-4 py-8 space-y-2 overflow-hidden" style={containerStyle}>
        <div className="p-2 shrink-0">
          <div className="opacity-80 mb-1" style={{ fontSize: `${10 * overlayTextScale}px` }}>
            Live Transcription
          </div>
          <div className="leading-snug max-h-[40%]" style={{ fontSize: `${12 * overlayTextScale}px` }}>
            {text}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto space-y-2">
          {activeTranslations.map((t) => (
            <div key={t.label} className="p-2">
              <div className={`opacity-80 mb-1 ${t.color}`} style={{ fontSize: `${10 * overlayTextScale}px` }}>{t.label}</div>
              <div className="leading-snug" style={{ fontSize: `${11 * overlayTextScale}px` }}>{t.text}</div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Split Style
  if (translationStyle === 'split') {
    return (
      <div className="absolute inset-0 flex flex-col" style={containerStyle}>
        <div className="w-full h-full px-4 py-8 grid grid-cols-2 gap-4 overflow-y-auto">
          <div className={`p-2 ${activeTranslations.length === 0 ? 'col-span-2' : ''}`}>
            <div className="opacity-80 mb-1" style={{ fontSize: `${10 * overlayTextScale}px` }}>
              Live Transcription
            </div>
            <div className="leading-snug" style={{ fontSize: `${12 * overlayTextScale}px` }}>{text}</div>
          </div>
          {activeTranslations.map((t) => (
            <div className="p-2" key={t.label}>
              <div className={`opacity-80 mb-1 ${t.color}`} style={{ fontSize: `${10 * overlayTextScale}px` }}>{t.label}</div>
              <div className="leading-snug" style={{ fontSize: `${12 * overlayTextScale}px` }}>{t.text}</div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Ticker Style (Fallback)
  return (
    <div className="absolute inset-x-0 bottom-0 py-4 bg-black/80 text-white whitespace-nowrap overflow-hidden" style={{ fontFamily: overlayFontFamily }}>
       <div className="inline-block animate-marquee px-4">
          <span className="mr-8 font-bold">{text}</span>
          {activeTranslations.map(t => (
            <span key={t.label} className={`mr-8 ${t.color}`}>({t.label}) {t.text}</span>
          ))}
       </div>
    </div>
  )
}
