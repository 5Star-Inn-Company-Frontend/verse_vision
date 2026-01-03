import { useEffect, useState } from 'react'
import { Mic, X, Check, Settings, AlertTriangle } from 'lucide-react'

export default function PermissionModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [micStatus, setMicStatus] = useState<string>('unknown')
  const [isIgnored, setIsIgnored] = useState(false)

  useEffect(() => {
    // Only check if we are in Electron
    if ((window as any).require) {
      checkPermission()
    }
  }, [])

  const checkPermission = async () => {
    try {
      const { ipcRenderer } = (window as any).require('electron')
      const status = await ipcRenderer.invoke('check-mic-status')
      setMicStatus(status)
      
      // If status is not granted and not already ignored for this session
      if (status !== 'granted' && status !== 'unknown' && !sessionStorage.getItem('mic_permission_ignored')) {
        setIsOpen(true)
      }
    } catch (e) {
      console.error('Failed to check permission:', e)
    }
  }

  const handleProceed = async () => {
    try {
      const { ipcRenderer } = (window as any).require('electron')
      await ipcRenderer.invoke('request-mic-access')
      setIsOpen(false)
    } catch (e) {
      console.error('Failed to request permission:', e)
    }
  }

  const handleIgnore = () => {
    setIsOpen(false)
    setIsIgnored(true)
    sessionStorage.setItem('mic_permission_ignored', 'true')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl max-w-md w-full shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-neutral-800 flex items-start gap-4">
          <div className="p-3 bg-red-500/10 rounded-lg">
            <Mic className="w-8 h-8 text-red-500" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white mb-1">Microphone Access Needed</h2>
            <p className="text-sm text-neutral-400">VerseVision requires microphone access to listen for scriptures and voice commands.</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="bg-neutral-800/50 rounded-lg p-4 text-sm text-neutral-300">
            <div className="flex items-center gap-2 mb-2 font-medium text-white">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Current Status: {micStatus === 'denied' ? 'Access Denied' : 'Not Enabled'}</span>
            </div>
            <p>
              Your system's microphone permission is currently disabled for this app. 
              To fix this, you'll need to enable it in your system settings.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-white">What will happen next:</h3>
            <ul className="text-sm text-neutral-400 space-y-2">
              <li className="flex items-start gap-2">
                <Settings className="w-4 h-4 mt-0.5 text-blue-400" />
                <span>We will open your System Privacy Settings.</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 mt-0.5 text-green-400" />
                <span>Locate "VerseVision" or "Microphone" and toggle the switch to ON.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-neutral-950/50 border-t border-neutral-800 flex justify-end gap-3">
          <button
            onClick={handleIgnore}
            className="px-4 py-2 text-sm font-medium text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
          >
            Ignore for now
          </button>
          <button
            onClick={handleProceed}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors shadow-lg shadow-blue-900/20"
          >
            Proceed to Settings
          </button>
        </div>
      </div>
    </div>
  )
}
