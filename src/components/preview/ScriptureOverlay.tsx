import { useMemo } from 'react'
import { useOperatorStore } from '@/store/useOperatorStore'

export default function ScriptureOverlay() {
  const { 
    currentScripture, 
    showScriptureOverlay, 
    translationStyle, 
    translations, 
    translationEnabledYoruba, 
    translationEnabledHausa, 
    translationEnabledIgbo, 
    translationEnabledFrench,
    overlayBackgroundColor,
    overlayFontFamily,
    overlayTextScale
  } = useOperatorStore()

  const activeTranslations = useMemo(() => {
    const t = (translations || {}) as Record<string, string | undefined>
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
  }, [translations, translationEnabledYoruba, translationEnabledHausa, translationEnabledIgbo, translationEnabledFrench])

  if (!currentScripture || !showScriptureOverlay) return null

  if (currentScripture.translation === 'RAW') {
    return (
      <div className="absolute inset-0 flex items-center justify-center p-8 text-center" style={{ fontFamily: overlayFontFamily, backgroundColor: overlayBackgroundColor }}>
        <div className="text-white w-full h-full flex flex-col items-center justify-center overflow-hidden">
          {currentScripture.reference !== 'Announcement' && (
            <div className="opacity-90 mb-2 font-bold uppercase tracking-wider shrink-0" style={{ fontSize: `${34 * overlayTextScale}px`, color: '#fbbf24' }}>
              {currentScripture.reference}
            </div>
          )}
          <div className="leading-snug whitespace-pre-wrap font-medium overflow-y-auto w-full flex-1 flex items-center justify-center" style={{ fontSize: `${50 * overlayTextScale}px` }}>
            {currentScripture.text}
          </div>
        </div>
      </div>
    )
  }

  if (translationStyle === 'subtitle') {
    return (
      <div className="absolute inset-0 flex flex-col justify-end px-4 py-8 space-y-2 overflow-hidden" style={{ fontFamily: overlayFontFamily, backgroundColor: overlayBackgroundColor }}>
        <div className="text-white p-2 shrink-0">
          <div className="opacity-80 mb-1" style={{ fontSize: `${10 * overlayTextScale}px` }}>
            {currentScripture.reference} • {currentScripture.translation}
          </div>
          <div className="leading-snug max-h-[40%]" style={{ fontSize: `${12 * overlayTextScale}px` }}>
            {currentScripture.text}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto space-y-2">
          {activeTranslations.map((t) => (
            <div key={t.label} className="text-white p-2">
              <div className={`opacity-80 mb-1 ${t.color}`} style={{ fontSize: `${10 * overlayTextScale}px` }}>{t.label}</div>
              <div className="leading-snug" style={{ fontSize: `${11 * overlayTextScale}px` }}>{t.text}</div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (translationStyle === 'split') {
    return (
      <div className="absolute inset-0 flex flex-col" style={{ fontFamily: overlayFontFamily, backgroundColor: overlayBackgroundColor }}>
        <div className="w-full h-full px-4 py-8 grid grid-cols-2 gap-4 overflow-y-auto">
          <div className={`text-white p-2 ${activeTranslations.length === 0 ? 'col-span-2' : ''}`}>
            <div className="opacity-80 mb-1" style={{ fontSize: `${10 * overlayTextScale}px` }}>
              {currentScripture.reference} • {currentScripture.translation}
            </div>
            <div className="leading-snug" style={{ fontSize: `${12 * overlayTextScale}px` }}>{currentScripture.text}</div>
          </div>
          {activeTranslations.map((t) => (
            <div className="text-white p-2" key={t.label}>
              <div className={`opacity-80 mb-1 ${t.color}`} style={{ fontSize: `${10 * overlayTextScale}px` }}>{t.label}</div>
              <div className="leading-snug" style={{ fontSize: `${12 * overlayTextScale}px` }}>{t.text}</div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (translationStyle === 'ticker') {
    return (
      <div className="absolute inset-0 flex flex-col justify-end" style={{ fontFamily: overlayFontFamily, backgroundColor: overlayBackgroundColor }}>
        <div className="text-white whitespace-nowrap overflow-hidden bg-black/20" style={{ fontSize: `${10 * overlayTextScale}px` }}>
          <div className="animate-[ticker_15s_linear_infinite] inline-block px-4">
            {[{ label: 'English', text: currentScripture.text, color: 'text-white' }, ...activeTranslations].map((t) => (
              <span key={t.label} className="px-6">
                <span className={`mr-1 ${t.color}`}>{t.label}:</span>
                {t.text}
              </span>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return null
}
