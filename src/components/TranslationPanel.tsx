import { useEffect, useState } from 'react'
import { useOperatorStore } from '@/store/useOperatorStore'
import HelpModal from './HelpModal'

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

  const [showHelp, setShowHelp] = useState(false)

  useEffect(() => {
    void loadSettings()
  }, [loadSettings, translationStyle, translationEnabledYoruba, translationEnabledHausa, translationEnabledIgbo, translationEnabledFrench, translationEngine])

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-100">Translation</h3>
        <button 
          onClick={() => setShowHelp(true)}
          className="text-gray-400 hover:text-white transition-colors"
          title="Help"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        </button>
      </div>

      <HelpModal 
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        title="Translation Panel Help"
        content={
          <div className="space-y-4">
            <p>Manage real-time translations of scriptures into multiple languages.</p>
            
            <div>
              <h4 className="font-semibold text-white mb-1">Engines & Layout</h4>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Engine:</strong> Choose 'Online (AI)' for the most natural translations (requires internet) or 'Offline (Local)' for basic translation without internet.</li>
                <li><strong>Layout:</strong> Select how translations appear on screen:
                  <ul className="list-disc pl-5 mt-1 text-gray-400">
                    <li><em>Subtitle:</em> Shows text at the bottom.</li>
                    <li><em>Split:</em> Divides the screen to show multiple languages clearly.</li>
                    <li><em>Ticker:</em> Scrolls text continuously along the bottom.</li>
                  </ul>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-1">Languages</h4>
              <p>Check the boxes to enable specific languages (Yoruba, Hausa, Igbo, French). Only enabled languages will be displayed.</p>
            </div>
          </div>
        }
      />

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
              {engine === 'openai' ? 'Online (AI)' : 'Offline (Local)'}
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
