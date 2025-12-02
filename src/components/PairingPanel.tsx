import { useState } from 'react'
import { api } from '@/lib/api'
import { useOperatorStore } from '@/store/useOperatorStore'

export default function PairingPanel() {
  const [qr, setQr] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const { loadCameras } = useOperatorStore()
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-100">Camera Pairing</h3>
        <div className="flex items-center gap-2">
          <button
          className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
          onClick={async () => {
            setBusy(true)
            const res = await api.pairCamera()
            setQr(res.qr)
            setToken(res.token)
            setBusy(false)
          }}
          disabled={busy}
          >
            {busy ? 'Generating...' : 'Generate QR'}
          </button>
          <button
            className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded"
            onClick={() => { void loadCameras() }}
          >
            Refresh List
          </button>
        </div>
      </div>
      {qr ? (
        <div className="flex flex-col items-center">
          <img src={qr} alt="Pairing QR" className="w-40 h-40" />
          <div className="text-[10px] text-gray-400 mt-1">Token: {token}</div>
        </div>
      ) : (
        <div className="text-xs text-gray-400">Generate a QR code to pair a smartphone camera.</div>
      )}
    </div>
  )
}
