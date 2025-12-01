import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { useOperatorStore } from '@/store/useOperatorStore'

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
  useEffect(() => {
    void (async () => {
      const list = await api.listScenes()
      setScenes(list)
    })()
  }, [])
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-100">Scene Presets</h3>
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
