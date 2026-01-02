import { useEffect, useState } from 'react'
import { useOperatorStore } from '@/store/useOperatorStore'
import { Loader2, CheckCircle, AlertCircle, CloudDownload, Wifi, Download } from 'lucide-react'

export default function OfflineIndicator() {
  const { offlineStatus, offlineDetails, checkOfflineStatus } = useOperatorStore()
  const [installing, setInstalling] = useState(false)
  const [installError, setInstallError] = useState<string | null>(null)

  useEffect(() => {
    checkOfflineStatus()
    const interval = setInterval(checkOfflineStatus, 2000)
    return () => clearInterval(interval)
  }, [checkOfflineStatus])

  const installPython = async () => {
    setInstalling(true)
    setInstallError(null)
    try {
      if ((window as any).require) {
        const { ipcRenderer } = (window as any).require('electron')
        await ipcRenderer.invoke('install-python')
        // We rely on the status loop to detect when it's ready (user might need to restart app or we need to re-check)
        // But re-checking might not work until restart if PATH is updated.
        // Actually winget might require a shell restart to pick up PATH.
        // So we should probably tell the user to restart after success.
        alert('Python installation started. You may need to restart the application after it completes.')
      } else {
        throw new Error('Not running in Electron')
      }
    } catch (e: any) {
      console.error('Auto-install failed:', e)
      setInstallError('Auto-install failed. Please use manual download.')
    } finally {
      setInstalling(false)
    }
  }

  if (offlineStatus === 'stopped') {
     return (
        <div className="flex items-center gap-2 text-xs text-gray-500">
            <div className="w-2 h-2 rounded-full bg-gray-600"></div>
            <span>Offline AI Stopped</span>
        </div>
     )
  }

  return (
    <div className="flex items-center gap-2 text-xs bg-neutral-800/50 px-3 py-1.5 rounded-full border border-neutral-800 transition-all hover:bg-neutral-800">
      {offlineStatus === 'ready' && <CheckCircle className="w-3 h-3 text-emerald-500" />}
      {(offlineStatus === 'loading' || offlineStatus === 'starting' || offlineStatus === 'installing_deps') && <Loader2 className="w-3 h-3 text-amber-500 animate-spin" />}
      {offlineStatus === 'downloading' && <CloudDownload className="w-3 h-3 text-blue-500 animate-bounce" />}
      {offlineStatus === 'error' && <AlertCircle className="w-3 h-3 text-red-500" />}
      {offlineStatus === 'python_missing' && <Download className="w-3 h-3 text-red-500" />}
      
      <span className={
        offlineStatus === 'ready' ? 'text-emerald-500 font-medium' :
        offlineStatus === 'error' || offlineStatus === 'python_missing' ? 'text-red-500 font-medium' :
        offlineStatus === 'downloading' ? 'text-blue-500 font-medium' :
        offlineStatus === 'installing_deps' ? 'text-amber-500 font-medium' :
        'text-amber-500'
      }>
        {offlineStatus === 'ready' ? 'Offline AI Ready' : 
         offlineStatus === 'downloading' ? 'Downloading Models (Internet Required)' :
         offlineStatus === 'python_missing' ? (
             <div className="flex items-center gap-2">
                 <span className="font-bold">Python Missing</span>
                 {installing ? (
                    <span className="text-amber-500 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Installing...
                    </span>
                 ) : (
                    <>
                      <button 
                        onClick={installPython}
                        className="underline hover:text-red-300 font-bold"
                        title="Attempt automatic installation"
                      >
                        Auto-Install
                      </button>
                      <span className="text-gray-500">|</span>
                      <a 
                        href="https://www.python.org/ftp/python/3.11.9/python-3.11.9-amd64.exe" 
                        target="_blank" 
                        rel="noreferrer" 
                        className="underline hover:text-red-300"
                        title="Download Python 3.11 Installer directly"
                      >
                        Manual (3.11)
                      </a>
                    </>
                 )}
                 {installError && <span className="text-[10px] text-red-400">({installError})</span>}
             </div>
         ) :
         offlineDetails || 'Initializing...'}
      </span>
      
      {offlineStatus === 'downloading' && (
        <Wifi className="w-3 h-3 text-blue-500 animate-pulse ml-1" />
      )}
    </div>
  )
}
