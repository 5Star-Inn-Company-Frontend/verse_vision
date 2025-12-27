import { useEffect } from 'react'
import { useOperatorStore } from '@/store/useOperatorStore'

export default function TranslationPanel() {
  const {
    translationStyle,
    translationEnabledYoruba,
    translationEnabledHausa,
    translationEnabledIgbo,
    translationEnabledFrench,
    translationEngine,
    loadSettings,
    updateTranslationSettings,
    setTranslationEngine,
    cloudApiToken,
    userPlan,
  } = useOperatorStore()

  useEffect(() => {
    void loadSettings()
  }, [loadSettings, translationStyle, translationEnabledYoruba, translationEnabledHausa, translationEnabledIgbo, translationEnabledFrench, translationEngine])

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
      <h3 className="text-sm font-semibold text-gray-100 mb-2">Translation</h3>
      <div className="mb-2">
        <label className="text-xs text-gray-300">Engine</label>
        <div className="mt-1 flex gap-2">
          {(['openai', 'marian'] as const).map((engine) => (
            <button
              key={engine}
              className={`px-2 py-1 text-xs rounded ${translationEngine === engine ? 'bg-blue-600' : 'bg-gray-700'} text-white`}
              onClick={() => {
                if (engine === 'openai' && !cloudApiToken) {
                  alert('Please connect to the cloud first to use OpenAI translation')
                  return
                }
                setTranslationEngine(engine)
              }}
            >
              {engine === 'openai' ? 'OpenAI' : 'Offline (MarianMT)'}
            </button>
          ))}
        </div>
      </div>
      <div className="mb-2">
        <label className="text-xs text-gray-300">Layout</label>
        <div className="mt-1 flex gap-2">
          {(['subtitle', 'split', 'ticker'] as const).map((style) => (
            <button
              key={style}
              className={`px-2 py-1 text-xs rounded ${translationStyle === style ? 'bg-blue-600' : 'bg-gray-700'} text-white`}
              onClick={() => updateTranslationSettings({ translationStyle: style })}
            >
              {style}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={Boolean(translationEnabledYoruba)} onChange={(e) => updateTranslationSettings({ translationEnabledYoruba: e.target.checked })} />
          Yoruba
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={Boolean(translationEnabledHausa)} onChange={(e) => updateTranslationSettings({ translationEnabledHausa: e.target.checked })} />
          Hausa
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={Boolean(translationEnabledIgbo)} onChange={(e) => updateTranslationSettings({ translationEnabledIgbo: e.target.checked })} />
          Igbo
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={Boolean(translationEnabledFrench)} onChange={(e) => updateTranslationSettings({ translationEnabledFrench: e.target.checked })} />
          French
        </label>
      </div>
    </div>
  )
}
