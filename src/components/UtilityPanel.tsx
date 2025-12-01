import { useEffect } from 'react'
import { useOperatorStore } from '@/store/useOperatorStore'

export default function UtilityPanel() {
  const { loadSettings, showScriptureOverlay, toggleScriptureOverlay, recordingEnabled, setRecordingEnabled, startCountdown, stopCountdown, countdownEndAt } = useOperatorStore()
  useEffect(() => { void loadSettings() }, [loadSettings])
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
      <h3 className="text-sm font-semibold text-gray-100 mb-2">Utilities</h3>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs text-gray-300">Scripture Overlay</label>
        <button className={`px-2 py-1 text-xs rounded ${showScriptureOverlay ? 'bg-green-600' : 'bg-gray-700'} text-white`} onClick={() => toggleScriptureOverlay(!showScriptureOverlay)}>
          {showScriptureOverlay ? 'On' : 'Off'}
        </button>
      </div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs text-gray-300">Recording</label>
        <button className={`px-2 py-1 text-xs rounded ${recordingEnabled ? 'bg-red-600' : 'bg-gray-700'} text-white`} onClick={() => setRecordingEnabled(!recordingEnabled)}>
          {recordingEnabled ? 'REC' : 'Off'}
        </button>
      </div>
      <div>
        <div className="flex items-center justify-between">
          <label className="text-xs text-gray-300">Countdown</label>
          <span className="text-[10px] text-gray-400">{countdownEndAt ? Math.max(0, Math.ceil((countdownEndAt - Date.now()) / 1000)) + 's' : 'stopped'}</span>
        </div>
        <div className="flex gap-2 mt-2">
          <button className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded" onClick={() => startCountdown(5 * 60 * 1000)}>Start 5m</button>
          <button className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded" onClick={() => startCountdown(2 * 60 * 1000)}>Start 2m</button>
          <button className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-800 text-white rounded" onClick={() => stopCountdown()}>Stop</button>
        </div>
      </div>
    </div>
  )
}
