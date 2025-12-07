import { spawn, type ChildProcess } from 'child_process'
import path from 'path'

class MarianService {
  private process: ChildProcess | null = null
  private queue: Array<{ resolve: (val: any) => void; reject: (err: any) => void }> = []
  private buffer: string = ''
  
  constructor() {
    // Lazy start or auto start? Let's auto start to load models
    this.start()
  }

  private start() {
    const scriptPath = path.resolve(process.cwd(), 'python/marian_server.py')
    console.log('Starting MarianMT service:', scriptPath)
    
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
          console.error('Marian Parse Error:', e, 'Line:', line)
        }
      }
    })

    this.process.stderr?.on('data', (data) => {
      console.log('[MarianMT]:', data.toString().trim())
    })

    this.process.on('close', (code) => {
      console.log(`Marian process exited with code ${code}`)
      this.process = null
      // Reject all pending
      while(this.queue.length) {
        this.queue.shift()?.reject(new Error('Process exited'))
      }
    })
    
    this.process.on('error', (err) => {
        console.error('Failed to start MarianMT process:', err)
    })
  }

  public async translate(text: string): Promise<{ Yoruba?: string; Hausa?: string; Igbo?: string; French?: string }> {
    if (!this.process) {
        this.start()
    }
    
    return new Promise((resolve, reject) => {
      this.queue.push({ resolve, reject })
      try {
        this.process?.stdin?.write(JSON.stringify({ text }) + '\n')
      } catch (err) {
        const idx = this.queue.indexOf({ resolve, reject })
        if (idx > -1) this.queue.splice(idx, 1)
        reject(err)
      }
    })
  }
}

export const marianService = new MarianService()

export async function translateTextMarian(text: string): Promise<{ Yoruba?: string; Hausa?: string; Igbo?: string; French?: string }> {
    return marianService.translate(text)
}
