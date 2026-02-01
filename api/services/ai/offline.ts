
import { spawn, type ChildProcess } from 'child_process'
import path from 'path'
import fs from 'fs'

class OfflineService {
  private process: ChildProcess | null = null
  private queue: Array<{ resolve: (val: any) => void; reject: (err: any) => void }> = []
  private buffer: string = ''
  
  public status: 'stopped' | 'starting' | 'downloading' | 'loading' | 'ready' | 'error' | 'installing_deps' | 'python_missing' = 'stopped'
  public details: string = ''

  private mode: 'script' = 'script'
  private hasTriedInstall = false
  private retryCount = 0
  private pythonCmd: string = 'python'

  constructor() {
    this.start()
  }

  private async checkPython(): Promise<boolean> {
      const commands = process.platform === 'win32' 
          ? ['python', 'py', 'python3'] 
          : ['python3', 'python']
      
      for (const cmd of commands) {
          try {
              const works = await new Promise<boolean>((resolve) => {
                  const proc = spawn(cmd, ['--version'])
                  proc.on('error', () => resolve(false))
                  proc.on('close', (code) => resolve(code === 0))
              })
              
              if (works) {
                  this.pythonCmd = cmd
                  console.log(`Found Python: ${cmd}`)
                  return true
              }
          } catch (e) {
              continue
          }
      }
      return false
  }

  private async installDependencies(): Promise<void> {
    this.status = 'installing_deps'
    this.details = 'Preparing to install dependencies...'
    
    // Find requirements.txt
    let reqPath = path.resolve(process.cwd(), 'python/requirements.txt')
    if (process.env.RESOURCES_PATH) {
       const prodReq = path.join(process.env.RESOURCES_PATH, 'app.asar.unpacked', 'python', 'requirements.txt')
       if (fs.existsSync(prodReq)) {
         reqPath = prodReq
       }
    }
    
    if (!fs.existsSync(reqPath)) {
        throw new Error('requirements.txt not found at ' + reqPath)
    }

    const cmd = this.pythonCmd
    const usePyLauncher = process.platform === 'win32' && cmd === 'py'

    const runPip = async (args: string[], label: string) => {
        const maxRetries = 3
        let lastError: any

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                await new Promise<void>((resolve, reject) => {
                    console.log(`[OfflineAI] ${label} (Attempt ${attempt}/${maxRetries})...`)
                    if (attempt > 1) this.details = `${label} (Attempt ${attempt}/${maxRetries})...`
                    else this.details = label
                    
                    const finalArgs = usePyLauncher 
                        ? ['-3', '-m', 'pip', ...args] 
                        : ['-m', 'pip', ...args]
                    
                    const proc = spawn(cmd, finalArgs)
                    
                    const updateDetails = (data: Buffer) => {
                        const output = data.toString();
                        console.log('Pip:', output);
                        
                        const lines = output.split(/[\r\n]+/);
                        for (const line of lines) {
                            const trimmed = line.trim();
                            if (!trimmed) continue;
            
                            if (trimmed.startsWith('Collecting') || 
                                trimmed.startsWith('Downloading') || 
                                trimmed.startsWith('Installing') ||
                                trimmed.startsWith('Unpacking')) {
                                this.details = `${label}: ${trimmed.slice(0, 50)}...`;
                            } else if (trimmed.includes('%')) {
                                const match = trimmed.match(/(\d+%)/);
                                if (match) {
                                    this.details = `${label}: ${match[1]}...`;
                                }
                            }
                        }
                    };
            
                    proc.stdout.on('data', updateDetails);
                    proc.stderr.on('data', updateDetails);
                    
                    proc.on('close', (code) => {
                        if (code === 0) resolve()
                        else reject(new Error(`Pip failed with code ${code}`))
                    })
                    
                    proc.on('error', (err) => reject(err))
                })
                return // Success
            } catch (err) {
                console.error(`[OfflineAI] ${label} failed attempt ${attempt}:`, err)
                lastError = err
                if (attempt < maxRetries) {
                    this.details = `${label} failed. Retrying in 3s...`
                    await new Promise(r => setTimeout(r, 3000))
                }
            }
        }
        throw lastError
    }

    try {
        await runPip(['install', '--upgrade', 'pip'], 'Upgrading pip')
        await runPip(['install', '-r', reqPath, '--prefer-binary'], 'Installing AI dependencies')
    } catch (err) {
        throw err
    }
  }

  private async start() {
    this.status = 'starting'
    this.details = 'Checking Python installation...'
    
    console.log("samji Starting checkPython")
    const hasPython = await this.checkPython()
    console.log("samji checkPython",hasPython)
    if (!hasPython) {
        this.status = 'python_missing'
        this.details = 'Python 3.10+ is required. Please install it to use Offline AI.'
        return
    }

    this.details = 'Initializing process...'
    
    let cmd: string
    let args: string[]
    
    // Always use script mode now
    let scriptPath = path.resolve(process.cwd(), 'python/offline_server.py')
    if (process.env.RESOURCES_PATH) {
        const prodPath = path.join(process.env.RESOURCES_PATH, 'app.asar.unpacked', 'python', 'offline_server.py')
        if (fs.existsSync(prodPath)) {
        scriptPath = prodPath
        }
    }
    
    console.log('Starting Offline AI service (script):', scriptPath)
    cmd = this.pythonCmd
    const usePyLauncher = process.platform === 'win32' && cmd === 'py'
    args = usePyLauncher ? ['-3', scriptPath] : [scriptPath]
    
    this.process = spawn(cmd, args)

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
      const msg = data.toString().trim()
      console.log('[OfflineAI]:', msg)
      
      if (msg.includes('Downloading') || msg.includes('Checking/Downloading')) {
        this.status = 'downloading'
        this.details = 'Downloading AI Model (may take a few minutes)...'
      } else if (msg.includes('Loading Whisper model')) {
        this.status = 'loading'
        this.details = 'Loading AI Model...'
      } else if (msg.includes('Initializing Whisper engine')) {
        this.status = 'loading'
        this.details = 'Initializing AI Engine...'
      } else if (msg.includes('Whisper model loaded')) {
        this.status = 'ready'
        this.details = 'AI Model Ready'
      } else if (msg.includes('Error')) {
         // Keep last status but update details unless it's a fatal error?
         // If it's a download error, maybe set to error.
         if (msg.includes('downloading') || msg.includes('loading')) {
             this.status = 'error'
         }
         this.details = msg
      }
    })

    this.process.on('close', (code) => {
      console.log(`Offline AI process exited with code ${code}`)
      if (code && code !== 0) {
        // Recovery Logic
        if (this.mode === 'script' && !this.hasTriedInstall) {
             console.log('Script failed, attempting to install dependencies...')
             this.installDependencies()
                 .then(() => {
                     console.log('Dependencies installed, retrying script...')
                     this.hasTriedInstall = true
                     this.start()
                 })
                 .catch(err => {
                     console.error('Dependency install failed:', err)
                     this.status = 'error'
                     this.details = `Dependency install failed: ${err.message}`
                 })
             return
        }

        this.status = 'error'
        // Common cause: Python not found or dependencies missing
        this.details = `Process exited (code ${code}). Ensure Python 3 and required packages are installed.`
      } else {
        this.status = 'stopped'
        this.details = `Process exited (code ${code})`
      }
      this.process = null
      // Reject all pending
      while(this.queue.length) {
        this.queue.shift()?.reject(new Error('Process exited'))
      }
    })
    
    this.process.on('error', (err) => {
        console.error('Failed to start Offline AI process:', err)
        this.status = 'error'
        this.details = `Failed to start: ${err.message}`
    })
  }

  public stop() {
    if (this.process) {
      console.log('Stopping Offline AI service...')
      this.process.kill()
      this.process = null
      this.status = 'stopped'
    }
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
