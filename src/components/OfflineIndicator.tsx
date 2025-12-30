import { useEffect } from 'react'
import { useOperatorStore } from '@/store/useOperatorStore'
import { Loader2, CheckCircle, AlertCircle, CloudDownload, Wifi } from 'lucide-react'

export default function OfflineIndicator() {
  const { offlineStatus, offlineDetails, checkOfflineStatus } = useOperatorStore()

  useEffect(() => {
    checkOfflineStatus()
    const interval = setInterval(checkOfflineStatus, 2000)
    return () => clearInterval(interval)
  }, [checkOfflineStatus])

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
      {(offlineStatus === 'loading' || offlineStatus === 'starting') && <Loader2 className="w-3 h-3 text-amber-500 animate-spin" />}
      {offlineStatus === 'downloading' && <CloudDownload className="w-3 h-3 text-blue-500 animate-bounce" />}
      {offlineStatus === 'error' && <AlertCircle className="w-3 h-3 text-red-500" />}
      
      <span className={
        offlineStatus === 'ready' ? 'text-emerald-500 font-medium' :
        offlineStatus === 'error' ? 'text-red-500 font-medium' :
        offlineStatus === 'downloading' ? 'text-blue-500 font-medium' :
        'text-amber-500'
      }>
        {offlineStatus === 'ready' ? 'Offline AI Ready' : 
         offlineStatus === 'downloading' ? 'Downloading Models (Internet Required)' :
         offlineDetails || 'Initializing...'}
      </span>
      
      {offlineStatus === 'downloading' && (
        <Wifi className="w-3 h-3 text-blue-500 animate-pulse ml-1" />
      )}
    </div>
  )
}
