import { useEffect } from 'react'
import { useOperatorStore } from '@/store/useOperatorStore'

export default function SettingsPanel() {
  const { autoApproveEnabled, autoApproveDelayMs, loadSettings, updateSettings } = useOperatorStore()
  useEffect(() => {
    void loadSettings()
  }, [loadSettings])
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
      <h3 className="text-sm font-semibold text-gray-100 mb-2">Settings</h3>
      <div className="flex items-center justify-between mb-3">
        <label className="text-xs text-gray-300">Auto-Approve</label>
        <button
          className={`px-2 py-1 text-xs rounded ${autoApproveEnabled ? 'bg-green-600' : 'bg-gray-700'} text-white`}
          onClick={() => updateSettings({ autoApproveEnabled: !autoApproveEnabled })}
        >
          {autoApproveEnabled ? 'Enabled' : 'Disabled'}
        </button>
      </div>
      <div>
        <div className="flex items-center justify-between">
          <label className="text-xs text-gray-300">Auto-Approve Delay</label>
          <span className="text-xs text-gray-400">{((autoApproveDelayMs ?? 2000) / 1000).toFixed(1)}s</span>
        </div>
        <input
          type="range"
          min={500}
          max={5000}
          step={100}
          value={autoApproveDelayMs ?? 2000}
          onChange={(e) => updateSettings({ autoApproveDelayMs: Number(e.target.value) })}
          className="w-full"
        />
      </div>
    </div>
  )
}
