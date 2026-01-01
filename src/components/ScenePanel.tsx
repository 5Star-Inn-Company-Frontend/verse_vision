import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { useOperatorStore } from '@/store/useOperatorStore'
import HelpModal from './HelpModal'

type ScenePreset = {
  id: string
  name: string
  primaryCameraId: string | null
  translationStyle: 'subtitle' | 'split' | 'ticker'
  showScriptureOverlay: boolean
}

export default function ScenePanel() {
  const {
    primaryCameraId,
    translationStyle,
    showScriptureOverlay,
    setPrimaryCamera,
    updateTranslationSettings,
    updateSettings,
  } = useOperatorStore()
  const [scenes, setScenes] = useState<ScenePreset[]>([])
  const [busy, setBusy] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  useEffect(() => {
    void (async () => {
      const list = await api.listScenes()
      setScenes(list)
    })()
  }, [])
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-100">Scene Presets</h3>
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
        <button
          className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
          onClick={async () => {
            setBusy(true)
            const payload = {
              name: `Preset ${new Date().toLocaleTimeString()}`,
              primaryCameraId,
              translationStyle,
              showScriptureOverlay,
            }
            const created = await api.createScene(payload)
            setScenes([created, ...scenes])
            setBusy(false)
          }}
          disabled={busy}
        >
          {busy ? 'Saving...' : 'Save Current'}
        </button>
      </div>

      <HelpModal 
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        title="Scene Panel Help"
        content={
          <div className="space-y-4">
            <p>Create and recall scene presets to quickly switch between different program configurations.</p>
            
            <div>
              <h4 className="font-semibold text-white mb-1">Managing Scenes</h4>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Save Current:</strong> Captures the current state (active camera, translation style, and overlay visibility) as a new preset.</li>
                <li><strong>Apply:</strong> Instantly restores the saved configuration.</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-1">Usage</h4>
              <p>Use scenes to prepare different "looks" for your service (e.g., "Worship" with lyrics and split screen, "Sermon" with ticker and scripture overlay) and switch between them with one click.</p>
            </div>
          </div>
        }
      />

      <div className="space-y-2">
        {scenes.map((s) => (
          <div key={s.id} className="bg-gray-800 rounded p-2 flex items-center justify-between">
            <div className="text-xs text-gray-200">
              <div className="font-medium text-gray-100">{s.name}</div>
              <div className="opacity-70">Cam: {s.primaryCameraId || 'none'} • Style: {s.translationStyle} • Scripture: {s.showScriptureOverlay ? 'on' : 'off'}</div>
            </div>
            <div className="space-x-2">
              <button
                className="px-2 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded"
                onClick={async () => {
                  if (s.primaryCameraId) setPrimaryCamera(s.primaryCameraId)
                  await updateTranslationSettings({ translationStyle: s.translationStyle })
                  await updateSettings({})
                }}
              >
                Apply
              </button>
            </div>
          </div>
        ))}
        {scenes.length === 0 && (
          <div className="text-xs text-gray-400">No presets yet. Save current settings to create one.</div>
        )}
      </div>
    </div>
  )
}
