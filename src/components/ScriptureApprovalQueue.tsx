import { useEffect, useRef, useState } from 'react'
import { useOperatorStore } from '@/store/useOperatorStore'

export default function ScriptureApprovalQueue() {
  const { scriptureQueue, approveScripture, rejectScripture, loadQueue, updateScripture, autoApproveEnabled, autoApproveDelayMs } = useOperatorStore()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<{ reference: string; translation: string }>({ reference: '', translation: '' })
  const timers = useRef<Record<string, number>>({})
  const deadlines = useRef<Record<string, number>>({})
  const [, force] = useState(0)
  useEffect(() => {
    void loadQueue()
  }, [loadQueue])
  useEffect(() => {
    const id = window.setInterval(async () => {
      if (scriptureQueue.length < 1) return
      const latest = scriptureQueue[0]
      if (latest && latest.text && latest.text.length > 20) return
      // this is a passive demo call to enhance queue items via detection if needed
    }, 3000)
    return () => window.clearInterval(id)
  }, [scriptureQueue])
  useEffect(() => {
    const id = window.setInterval(() => force((x) => x + 1), 200)
    return () => window.clearInterval(id)
  }, [])
  useEffect(() => {
    if (!autoApproveEnabled) {
      for (const k of Object.keys(timers.current)) {
        window.clearTimeout(timers.current[k])
        delete timers.current[k]
        delete deadlines.current[k]
      }
      return
    }
    for (const item of scriptureQueue) {
      if (!timers.current[item.id]) {
        deadlines.current[item.id] = Date.now() + autoApproveDelayMs
        timers.current[item.id] = window.setTimeout(async () => {
          await approveScripture(item.id)
          delete timers.current[item.id]
          delete deadlines.current[item.id]
        }, autoApproveDelayMs)
      }
    }
  }, [scriptureQueue, autoApproveEnabled, autoApproveDelayMs, approveScripture])
  return (
    <div className="h-full w-full bg-gray-900 rounded-lg border border-gray-700 p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-100">Scripture Approval Queue</h3>
        <span className="text-xs text-gray-400">{scriptureQueue.length} pending</span>
      </div>
      <div className="space-y-2 overflow-y-auto max-h-[calc(100%-2rem)]">
        {scriptureQueue.map((item) => (
          <div key={item.id} className="bg-gray-800 rounded p-2">
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-300">
                <span className="font-medium text-gray-100">{item.reference}</span>
                <span className="ml-2 px-1.5 py-0.5 bg-gray-700 rounded text-[10px]">{item.translation}</span>
                <span className="ml-2 text-[10px] text-green-400">conf {Math.round(item.confidence * 100)}%</span>
              </div>
              <div className="space-x-2">
                <button className="px-2 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded" onClick={() => approveScripture(item.id)}>
                  Approve
                </button>
                <button className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded" onClick={() => rejectScripture(item.id)}>
                  Reject
                </button>
                <button
                  className="px-2 py-1 text-xs bg-gray-600 hover:bg-gray-700 text-white rounded"
                  onClick={() => {
                    setEditingId(item.id)
                    setForm({ reference: item.reference, translation: item.translation })
                  }}
                >
                  Edit
                </button>
              </div>
            </div>
            <p className="mt-1 text-sm text-gray-200 line-clamp-3">{item.text}</p>
            {autoApproveEnabled && deadlines.current[item.id] && (
              <div className="mt-1 text-[10px] text-yellow-300">
                Auto-approving in {Math.max(0, Math.ceil((deadlines.current[item.id] - Date.now()) / 100) / 10)}s
              </div>
            )}
            {editingId === item.id && (
              <div className="mt-2 grid grid-cols-3 gap-2">
                <input
                  className="col-span-2 bg-gray-700 text-xs text-white rounded px-2 py-1"
                  value={form.reference}
                  onChange={(e) => setForm({ ...form, reference: e.target.value })}
                  placeholder="Book chapter:verse"
                />
                <input
                  className="bg-gray-700 text-xs text-white rounded px-2 py-1"
                  value={form.translation}
                  onChange={(e) => setForm({ ...form, translation: e.target.value })}
                  placeholder="Translation"
                />
                <div className="col-span-3 flex justify-end gap-2">
                  <button
                    className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
                    onClick={async () => {
                      await updateScripture(item.id, form)
                      setEditingId(null)
                    }}
                  >
                    Save
                  </button>
                  <button className="px-2 py-1 text-xs bg-gray-600 hover:bg-gray-700 text-white rounded" onClick={() => setEditingId(null)}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {scriptureQueue.length === 0 && (
          <div className="text-center text-xs text-gray-400 py-6">No items pending</div>
        )}
      </div>
    </div>
  )
}
