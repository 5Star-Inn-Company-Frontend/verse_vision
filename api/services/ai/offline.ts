
import { spawn, type ChildProcess } from 'child_process'
import path from 'path'

class OfflineService {
  private process: ChildProcess | null = null
  private queue: Array<{ resolve: (val: any) => void; reject: (err: any) => void }> = []
  private buffer: string = ''
  
  constructor() {
    this.start()
  }

  private start() {
    const scriptPath = path.resolve(process.cwd(), 'python/offline_server.py')
    console.log('Starting Offline AI service:', scriptPath)
    
    this.process = spawn('python', [scriptPath])

    this.process.stdout?.on('data', (data) => {
      this.buffer += data.toString()
      
      let newlineIndex
      while ((newlineIndex = this.buffer.indexOf('\n')) !== -1) {
        const line = this.buffer.slice(0, newlineIndex).trim()
        this.buffer = this.buffer.slice(newlineIndex + 1)
        
        if (!line) continue
        
        try {
          const result = JSON.parse(line)
          const req = this.queue.shift()
          if (req) req.resolve(result)
        } catch (e) {
          console.error('Offline AI Parse Error:', e, 'Line:', line)
        }
      }
    })

    this.process.stderr?.on('data', (data) => {
      console.log('[OfflineAI]:', data.toString().trim())
    })

    this.process.on('close', (code) => {
      console.log(`Offline AI process exited with code ${code}`)
      this.process = null
      // Reject all pending
      while(this.queue.length) {
        this.queue.shift()?.reject(new Error('Process exited'))
      }
    })
    
    this.process.on('error', (err) => {
        console.error('Failed to start Offline AI process:', err)
    })
  }

  private async sendCommand(command: string, payload: any): Promise<any> {
    if (!this.process) {
        this.start()
    }
    
    return new Promise((resolve, reject) => {
      this.queue.push({ resolve, reject })
      try {
        this.process?.stdin?.write(JSON.stringify({ command, ...payload }) + '\n')
      } catch (err) {
        const idx = this.queue.indexOf({ resolve, reject })
        if (idx > -1) this.queue.splice(idx, 1)
        reject(err)
      }
    })
  }

  public async transcribe(path: string): Promise<string> {
    const res = await this.sendCommand('transcribe', { path })
    if (res.error) throw new Error(res.error)
    return res.text || ''
  }

  public async detectScripture(text: string): Promise<Array<{ reference: string; text: string; translation: string }>> {
    const res = await this.sendCommand('detect', { text })
    if (res.error) throw new Error(res.error)
    return res.references || []
  }
}

export const offlineService = new OfflineService()
