import { useSearchParams } from 'react-router-dom'
import ProgramPreview from '@/components/ProgramPreview'
import SyncBridge from '@/components/SyncBridge'

export default function ProgramOutput() {
  const [searchParams] = useSearchParams()
  const bg = searchParams.get('bg')

  // Ensure Program View has a unique Peer ID (distinct from Operator View)
  // causing window.open to copy sessionStorage
  if (typeof window !== 'undefined') {
    const key = 'vv_rtc_peer_id'
    const id = sessionStorage.getItem(key)
    if (id && !id.endsWith('-program')) {
      sessionStorage.setItem(key, `${id}-program`)
    }
  }

  // Determine background color
  const bgClass = bg === 'green' ? 'bg-[#00FF00]' : 
                  bg === 'blue' ? 'bg-[#0000FF]' : 
                  bg === 'transparent' ? 'bg-transparent' : 
                  'bg-black'

  // If green/blue screen is active, we might want to override the container style to ensure
  // pure color without borders/shadows if possible
  const style = bg === 'transparent' ? { background: 'transparent' } : 
                bg === 'green' ? { background: '#00FF00' } :
                bg === 'blue' ? { background: '#0000FF' } : undefined

  return (
    <div className={`min-h-screen flex items-center justify-center text-white overflow-hidden ${bgClass}`} style={style}>
      <SyncBridge />
      <div className="w-full h-full flex items-center justify-center">
        <ProgramPreview 
          hideHeader={true} 
          className={`${bgClass} max-w-[100vw] max-h-[100vh] aspect-video w-auto h-auto shadow-2xl`}
          style={style}
        />
      </div>
    </div>
  )
}
