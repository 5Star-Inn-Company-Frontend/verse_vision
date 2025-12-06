import { useEffect, useRef } from 'react'
import { useOperatorStore } from '@/store/useOperatorStore'
import { api } from '@/lib/api'

export default function AudioService() {
  const { activeAudioCameraId, liveStreams, setScriptureQueue } = useOperatorStore()
  const processingRef = useRef(false)
  const sessionRef = useRef<string>('')
  const localStreamRef = useRef<MediaStream | null>(null)

  // Derived stream for the selected camera (if any)
  const cameraStream = activeAudioCameraId ? liveStreams[activeAudioCameraId] : null

  useEffect(() => {
    // Generate a new session ID for this effect run
    const sessionId = Math.random().toString(36)
    sessionRef.current = sessionId

    const start = async () => {
      let stream: MediaStream | null = null
      let sourceId = 'local-pc'

      if (activeAudioCameraId) {
        // 1. Camera Source Mode
        if (cameraStream) {
          stream = cameraStream
          sourceId = activeAudioCameraId
        } else {
            // Camera selected but stream not ready yet
            // We don't fallback to local mic here to avoid confusion; we just wait.
            console.log('[AudioService] Waiting for camera stream...', activeAudioCameraId)
            return 
        }
        
        // Cleanup local stream if it exists (release mic resource)
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(t => t.stop())
            localStreamRef.current = null
        }

      } else {
        // 2. Local PC Source Mode (Default)
        sourceId = 'local-pc'
        
        // Ensure we have a local stream
        if (!localStreamRef.current || !localStreamRef.current.active) {
            try {
                console.log('[AudioService] Requesting local mic access...')
                localStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true })
            } catch (err) {
                console.error('[AudioService] Failed to get local audio:', err)
                return
            }
        }
        stream = localStreamRef.current
      }

      if (!stream || !stream.active) {
          console.warn('[AudioService] Stream inactive or missing for', sourceId)
          return
      }
      
      // Double check session hasn't changed while we were awaiting (e.g. rapid switching)
      if (sessionRef.current !== sessionId) return

      console.log(`[AudioService] Starting recording session ${sessionId.slice(0,4)} for ${sourceId}`)
      void recordLoop(stream, sessionId)
    }

    void start()

    return () => {
      // Cleanup of the effect simply invalidates the session.
      // We do NOT stop tracks here because we might be re-rendering with the same stream.
      // Specific track cleanup is handled logic inside start() or the unmount effect.
    }
  }, [activeAudioCameraId, cameraStream])

  // Cleanup local stream on component unmount
  useEffect(() => {
      return () => {
          if (localStreamRef.current) {
              localStreamRef.current.getTracks().forEach(t => t.stop())
          }
      }
  }, [])

  const recordLoop = async (stream: MediaStream, sessionId: string) => {
    // Check if this loop belongs to the current active session
    if (sessionRef.current !== sessionId) return

    try {
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
      const chunks: Blob[] = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data)
      }

      recorder.onstop = async () => {
        // If session changed, we discard the result and stop looping
        if (sessionRef.current !== sessionId) return

        const blob = new Blob(chunks, { type: 'audio/webm;codecs=opus' })
        if (blob.size > 0) {
           void processAudio(blob)
        }
        
        // Loop if still active session and stream is alive
        if (sessionRef.current === sessionId && stream.active) {
          recordLoop(stream, sessionId)
        }
      }

      recorder.start()
      // Record for 5 seconds
      await new Promise((resolve) => setTimeout(resolve, 5000))
      
      if (recorder.state !== 'inactive') {
        recorder.stop()
      }
    } catch (err) {
      console.error('[AudioService] Recorder error:', err)
      // Wait a bit before retrying to avoid tight loop on error
      await new Promise((resolve) => setTimeout(resolve, 2000))
      if (sessionRef.current === sessionId) recordLoop(stream, sessionId)
    }
  }

  const processAudio = async (blob: Blob) => {
    if (processingRef.current) return // Simple concurrency limit
    processingRef.current = true

    try {
      // 1. Transcribe
      const { text } = await api.transcribe(blob)
      if (!text || text.trim().length < 5) {
        processingRef.current = false
        return
      }
      console.log('[AudioService] Transcribed:', text)

      // 2. Detect
      const { queue } = await api.detectScripture(text)
      
      // 3. Update Store
      if (queue) setScriptureQueue(queue)
      
    } catch (err) {
      console.error('[AudioService] Process error:', err)
    } finally {
      processingRef.current = false
    }
  }

  return null
}
