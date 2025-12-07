import { useEffect, useState } from 'react'
import { useOperatorStore } from '@/store/useOperatorStore'

export default function SettingsPanel() {
  const { autoApproveEnabled, autoApproveDelayMs, loadSettings, updateSettings, iceServers, loadIceServers, updateIceServers, scriptureDetectionEngine, setScriptureDetectionEngine } = useOperatorStore()
  const [peers, setPeers] = useState<string[]>([])
  const [sessions, setSessions] = useState<Array<{ from: string; to: string; startedAt: number }>>([])
  const [iceText, setIceText] = useState('')
  useEffect(() => {
    void loadSettings()
    void loadIceServers()
  }, [loadSettings, loadIceServers])
  useEffect(() => {
    try { setIceText(JSON.stringify(iceServers, null, 2)) } catch { setIceText('[]') }
  }, [iceServers])
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
      <h3 className="text-sm font-semibold text-gray-100 mb-2">Settings</h3>
      <div className="flex items-center justify-between mb-3">
        <label className="text-xs text-gray-300">Detection Engine</label>
        <div className="flex bg-gray-800 rounded p-0.5">
          <button
            className={`px-2 py-1 text-[10px] rounded ${scriptureDetectionEngine === 'openai' ? 'bg-blue-600' : 'text-gray-400 hover:text-white'}`}
            onClick={() => setScriptureDetectionEngine('openai')}
          >
            Online (OpenAI)
          </button>
          <button
            className={`px-2 py-1 text-[10px] rounded ${scriptureDetectionEngine === 'offline' ? 'bg-blue-600' : 'text-gray-400 hover:text-white'}`}
            onClick={() => setScriptureDetectionEngine('offline')}
          >
            Offline (Local)
          </button>
        </div>
      </div>
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
      <div className="mt-4">
        <div className="flex items-center justify-between">
          <label className="text-xs text-gray-300">ICE Servers (JSON)</label>
          <button
            className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
            onClick={async () => {
              try {
                const parsed = JSON.parse(iceText) as RTCIceServer[]
                await updateIceServers(parsed)
              } catch (e) { void e }
            }}
          >
            Save
          </button>
        </div>
        <textarea
          value={iceText}
          onChange={(e) => setIceText(e.target.value)}
          className="w-full mt-2 h-24 text-xs bg-gray-800 text-gray-100 rounded p-2"
        />
      </div>
      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-gray-300">Signaling Debug</label>
          <div className="flex items-center gap-2">
            <button
              className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded"
              onClick={async () => {
                try {
                  const res = await fetch('/api/webrtc/peers')
                  const json = await res.json()
                  setPeers(json.data || [])
                } catch (e) { void e }
              }}
            >
              Refresh Peers
            </button>
            <button
              className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded"
              onClick={async () => {
                try {
                  const res = await fetch('/api/webrtc/sessions')
                  const json = await res.json()
                  setSessions(json.data || [])
                } catch (e) { void e }
              }}
            >
              Refresh Sessions
            </button>
          </div>
        </div>
        <div className="text-[11px] text-gray-300">
          <div className="mb-1">Peers: {peers.join(', ') || '—'}</div>
          <div>Sessions: {sessions.map((s) => `${s.from}→${s.to}`).join(', ') || '—'}</div>
        </div>
      </div>
    </div>
  )
}
