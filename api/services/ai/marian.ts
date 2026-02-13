import { spawn, type ChildProcess } from 'child_process'
import path from 'path'
import fs from 'fs'

class MarianService {
  private process: ChildProcess | null = null
  private queue: Array<{ resolve: (val: any) => void; reject: (err: any) => void }> = []
  private buffer: string = ''
  private activating: boolean = false
  private activated: boolean = false
  
  constructor() {
    this.checkExistingModels()
  }

  private checkExistingModels() {
    let modelsDir = path.resolve(process.cwd(), 'python/models')
    if (process.env.RESOURCES_PATH) {
        modelsDir = path.join(process.env.RESOURCES_PATH, 'app.asar.unpacked', 'python', 'models')
    }
    
    // Check if models exist (just checking one key directory is enough for now)
    const multiDir = path.join(modelsDir, 'marian-multi')
    if (fs.existsSync(multiDir) && fs.statSync(multiDir).isDirectory()) {
        console.log('Marian models found locally. Auto-activating...')
        this.activated = true
        this.start()
    }
  }

  private start() {
    let scriptPath = path.resolve(process.cwd(), 'python/marian_server.py')
    let isExecutable = false
    
    if (process.env.RESOURCES_PATH) {
        // Production path
        const baseDir = path.join(process.env.RESOURCES_PATH, 'app.asar.unpacked', 'python')
        
        // Check for executable first (bundled)
        const exeName = process.platform === 'win32' ? 'marian_server.exe' : 'marian_server'
        const exePath = path.join(baseDir, 'dist', 'marian_server', exeName)
        
        if (fs.existsSync(exePath)) {
            scriptPath = exePath
            isExecutable = true
        } else {
            // Fallback to script if no executable
            const scriptProdPath = path.join(baseDir, 'marian_server.py')
            if (fs.existsSync(scriptProdPath)) {
                scriptPath = scriptProdPath
            }
        }
    }
    
    console.log('Starting MarianMT service:', scriptPath)
    
    if (isExecutable) {
        this.process = spawn(scriptPath, [], { stdio: ['pipe', 'pipe', 'pipe'] })
    } else {
        this.process = spawn('python', [scriptPath], { stdio: ['pipe', 'pipe', 'pipe'] })
    }

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

  public stop() {
    if (this.process) {
      console.log('Stopping MarianMT service...')
      this.process.kill()
      this.process = null
    }
  }

  public async translate(text: string): Promise<{ Yoruba?: string; Hausa?: string; Igbo?: string; French?: string }> {
    if (!this.process) {
        throw new Error('Translation not activated')
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

  public async activate(): Promise<{ status: 'downloading' | 'ready' }> {
    if (this.activated) return { status: 'ready' }
    if (this.activating) return { status: 'downloading' }
    this.activating = true
    await new Promise<void>((resolve, reject) => {
      const dl = spawn('python', [path.resolve(process.cwd(), 'python/download_models.py')], { stdio: ['ignore', 'pipe', 'pipe'] })
      dl.on('close', (code) => {
        if (code === 0) resolve()
        else reject(new Error(`download_models exited with code ${code}`))
      })
      dl.on('error', reject)
    })
    this.start()
    this.activating = false
    this.activated = true
    return { status: 'ready' }
  }

  public getStatus(): 'idle' | 'downloading' | 'ready' {
    if (this.activating) return 'downloading'
    if (this.activated) return 'ready'
    return 'idle'
  }
}

export const marianService = new MarianService()

export async function translateTextMarian(text: string): Promise<{ Yoruba?: string; Hausa?: string; Igbo?: string; French?: string }> {
    return marianService.translate(text)
}

export async function activateMarian(): Promise<{ status: 'downloading' | 'ready' }> {
  return marianService.activate()
}

export async function getMarianStatus(): Promise<{ status: 'idle' | 'downloading' | 'ready' }> {
  return { status: marianService.getStatus() }
}
