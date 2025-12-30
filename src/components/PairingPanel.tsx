import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { useOperatorStore } from '@/store/useOperatorStore'
import QRCode from 'qrcode'

export default function PairingPanel() {
  const [qr, setQr] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [serverIp, setServerIp] = useState<string>('')
  const [busy, setBusy] = useState(false)
  const [showDownloadModal, setShowDownloadModal] = useState(false)
  const [playStoreQr, setPlayStoreQr] = useState<string>('')
  const [appStoreQr, setAppStoreQr] = useState<string>('')
  const { loadCameras } = useOperatorStore()

  useEffect(() => {
    // Fetch initial IP
    api.getLocalIp().then(setServerIp)
  }, [])

  useEffect(() => {
    if (showDownloadModal) {
      const playUrl = import.meta.env.VITE_PLAYSTORE_URL || '#'
      const appUrl = import.meta.env.VITE_APPSTORE_URL || '#'
      
      QRCode.toDataURL(playUrl).then(setPlayStoreQr).catch(console.error)
      QRCode.toDataURL(appUrl).then(setAppStoreQr).catch(console.error)
    }
  }, [showDownloadModal])

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-100">Camera Pairing</h3>
        <div className="flex items-center gap-2">
          <button
            className="px-2 py-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded"
            onClick={() => setShowDownloadModal(true)}
          >
            Download App
          </button>
          <button
          className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
          onClick={async () => {
            setBusy(true)
            const res = await api.pairCamera(serverIp)
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
      <div className='flex items-center gap-2 mb-4'>
            Pc IP: <input 
            type="text" 
            value={serverIp}
            onChange={e => setServerIp(e.target.value)}
            placeholder="Server IP"
            className="px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-gray-200 w-28"
          />
      </div>
      {qr ? (
        <div className="flex flex-col items-center">
          <img src={qr} alt="Pairing QR" className="w-40 h-40" />
          <div className="text-[10px] text-gray-400 mt-1">Token: {token}</div>
        </div>
      ) : (
        <div className="text-xs text-gray-400">Generate a QR code to pair a smartphone camera.</div>
      )}
      {showDownloadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-md w-full shadow-xl relative">
            <button 
              onClick={() => setShowDownloadModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              ✕
            </button>
            <h3 className="text-lg font-bold text-white mb-6 text-center">Download VerseVision App</h3>
            <div className="grid grid-cols-2 gap-8">
              <div className="flex flex-col items-center">
                <div className="bg-white p-2 rounded mb-3">
                  {playStoreQr ? (
                    <img src={playStoreQr} alt="Play Store QR" className="w-32 h-32" />
                  ) : (
                    <div className="w-32 h-32 bg-gray-200 animate-pulse" />
                  )}
                </div>
                <span className="text-sm font-medium text-gray-300">Android</span>
                <span className="text-xs text-gray-500 mt-1">Google Play</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="bg-white p-2 rounded mb-3">
                  {appStoreQr ? (
                    <img src={appStoreQr} alt="App Store QR" className="w-32 h-32" />
                  ) : (
                    <div className="w-32 h-32 bg-gray-200 animate-pulse" />
                  )}
                </div>
                <span className="text-sm font-medium text-gray-300">iOS</span>
                <span className="text-xs text-gray-500 mt-1">App Store</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
