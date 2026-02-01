import { memo, useEffect, useRef } from 'react'

const VideoLive = memo(function VideoLive({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLVideoElement | null>(null)
  useEffect(() => {
    const v = ref.current
    if (!v) return
    v.srcObject = stream
    v.play().catch(() => {})
  }, [stream])
  return <video ref={ref} className="w-full aspect-video object-cover" muted />
})

export default VideoLive
