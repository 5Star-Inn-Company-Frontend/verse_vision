const { app, BrowserWindow, Menu, shell, ipcMain, screen, systemPreferences } = require('electron')
const path = require('path')
const { fork, spawn } = require('child_process')
let serverProc = null
const serverPort = process.env.PORT || '3332'

// Track the program window to prevent duplicates
let programWin = null

ipcMain.handle('go-live', async () => {
  const displays = screen.getAllDisplays()
  // Use the second display if available, otherwise the primary one (but typically this is for dual monitor)
  // If we only have one display, we might want to just open a window on it (maybe not fullscreen if debugging?)
  // But user request implies "like EasyWorship" -> secondary screen.
  
  const externalDisplay = displays.find((display) => {
    return display.bounds.x !== 0 || display.bounds.y !== 0
  })

  // If no external display, maybe we shouldn't fail, but just open on primary? 
  // Let's default to the last display in the list if no "external" found by coordinates
  const targetDisplay = externalDisplay || displays[displays.length - 1]

  if (programWin && !programWin.isDestroyed()) {
    programWin.focus()
    return
  }

  programWin = new BrowserWindow({
    x: targetDisplay.bounds.x,
    y: targetDisplay.bounds.y,
    width: targetDisplay.bounds.width,
    height: targetDisplay.bounds.height,
    frame: false, // No borders
    fullscreen: true, // Fullscreen
    kiosk: true, // Kiosk mode (optional, but good for "native" feel)
    alwaysOnTop: false, // Optional: set true if you want it to force over everything
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    }
  })

  // Determine the base URL from the serverPort
  const baseUrl = `http://localhost:${serverPort}`
  programWin.loadURL(`${baseUrl}/program`)
  
  // Cleanup when closed
  programWin.on('closed', () => {
    programWin = null
  })
})

ipcMain.handle('install-python', async () => {
  return new Promise((resolve, reject) => {
    // Attempt to use winget to install Python 3.11 in a new visible window
    console.log('Attempting to install Python via winget...')
    // We use cmd /c start /wait to open a new console window so the user can see progress and interact (UAC)
    const child = spawn('cmd.exe', ['/c', 'start', '/wait', 'winget', 'install', '-e', '--id', 'Python.Python.3.11'], {
      shell: true,
      windowsHide: false 
    })
    
    child.on('close', (code) => {
      console.log('Winget process finished with code:', code)
      // We resolve true regardless because we can't easily read the exit code of the started process
      // The user will see the output in the window.
      resolve(true)
    })
    
    child.on('error', (err) => {
      console.error('Winget spawn error:', err)
      reject(err)
    })
  })
})

function setupMenu() {
  const isMac = process.platform === 'darwin'
  const template = [
    // { role: 'appMenu' }
    ...(isMac
      ? [{
          label: app.name,
          submenu: [
            { role: 'about' },
            { type: 'separator' },
            { role: 'services' },
            { type: 'separator' },
            { role: 'hide' },
            { role: 'hideOthers' },
            { role: 'unhide' },
            { type: 'separator' },
            { role: 'quit' }
          ]
        }]
      : []),
    // { role: 'fileMenu' }
    {
      label: 'File',
      submenu: [
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    // { role: 'editMenu' }
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(isMac
          ? [
              { role: 'pasteAndMatchStyle' },
              { role: 'delete' },
              { role: 'selectAll' },
              { type: 'separator' },
              {
                label: 'Speech',
                submenu: [
                  { role: 'startSpeaking' },
                  { role: 'stopSpeaking' }
                ]
              }
            ]
          : [
              { role: 'delete' },
              { type: 'separator' },
              { role: 'selectAll' }
            ])
      ]
    },
    // { role: 'viewMenu' }
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools', visible: !app.isPackaged },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    // { role: 'windowMenu' }
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac
          ? [
              { type: 'separator' },
              { role: 'front' },
              { type: 'separator' },
              { role: 'window' }
            ]
          : [
              { role: 'close' }
            ])
      ]
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'Documentation / How to Use',
          click: async () => {
            const docsPath = app.isPackaged
              ? path.join(__dirname, '../dist/docs.html')
              : path.join(__dirname, '../public/docs.html')
            
            const docsWin = new BrowserWindow({
              width: 1000,
              height: 800,
              title: 'VerseVision Documentation',
              autoHideMenuBar: true,
              webPreferences: {
                nodeIntegration: false,
                contextIsolation: true
              }
            })
            docsWin.loadFile(docsPath)
          }
        },
        {
          label: 'Submit Feedback / Bug Report',
          click: async () => {
            await shell.openExternal('https://docs.google.com/forms/d/e/1FAIpQLSd3a0sQ7WPcdlDGcqI-TVn5ToMbuhfsxvFq2IAEQL8OMtkgjw/viewform')
          }
        },
        { type: 'separator' },
        {
          label: 'About VerseVision',
          click: async () => {
            app.showAboutPanel()
          }
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}
function startServer() {
  const userData = app.getPath('userData')
  const env = { 
    ...process.env, 
    PORT: serverPort, 
    VV_DATA_DIR: userData, 
    PUBLIC_SERVER_URL: `http://localhost:${serverPort}`,
    RESOURCES_PATH: process.resourcesPath 
  }
  let entry = ''
  if (app.isPackaged) {
    // In production, we unpack api/dist and node_modules to ensure fork() works reliably
    // Path: .../resources/app.asar.unpacked/api/dist/server.js
    entry = path.join(process.resourcesPath, 'app.asar', 'api', 'dist', 'server.js')
  } else {
    // In Dev: .../electron/main.cjs -> .../api/dist/server.js
    entry = path.join(__dirname, '..', 'api', 'dist', 'server.js')
  }
  
  console.log('Starting server from:', entry)
  
  // In production (asar), we need to make sure we're looking in the right place
  // But wait, api/dist/server.js is outside electron folder in dev, but inside asar in prod?
  // Let's use a more robust path resolution
  
  // If packaged, __dirname is .../resources/app.asar/electron
  // We need .../resources/app.asar/api/dist/server.js
  
  serverProc = fork(entry, [], { 
    env,
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'] 
  })
  
  serverProc.stdout.on('data', (data) => console.log(`[API]: ${data}`))
  serverProc.stderr.on('data', (data) => console.error(`[API ERROR]: ${data}`))
  serverProc.on('error', (err) => console.error('[API FAILED]:', err))
}
async function waitReady() {
  const url = `http://localhost:${serverPort}/api/health`
  console.log('Waiting for server at', url)
  try {
    const res = await fetch(url)
    if (res.ok) {
      console.log('Server is ready!')
      return
    }
  } catch (e) {
    // console.log('Server not ready yet...', e.message)
  }
  await new Promise((r) => setTimeout(r, 500))
  return waitReady()
}
function createWindow() {
  console.log('Creating window...')
  
  const iconPath = app.isPackaged
    ? path.join(__dirname, '../dist/icon.png')
    : path.join(__dirname, '../public/icon.png')

  const win = new BrowserWindow({ 
    width: 1200, 
    height: 800,
    icon: iconPath,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      devTools: !app.isPackaged
    }
  })
  win.loadURL(`http://localhost:${serverPort}`)
}

// IPC Handlers for Microphone Permission
ipcMain.handle('check-mic-status', async () => {
  try {
    const status = systemPreferences.getMediaAccessStatus('microphone')
    console.log('Microphone status:', status)
    return status
  } catch (err) {
    console.error('Failed to get microphone status:', err)
    return 'unknown'
  }
})

ipcMain.handle('request-mic-access', async () => {
  try {
    if (process.platform === 'darwin') {
      const granted = await systemPreferences.askForMediaAccess('microphone')
      if (!granted) {
        await shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone')
      }
      return granted ? 'granted' : 'denied'
    } else if (process.platform === 'win32') {
      await shell.openExternal('ms-settings:privacy-microphone')
      return 'prompted'
    }
    return 'granted' // Linux or others usually handled by OS/Browser
  } catch (err) {
    console.error('Failed to request microphone access:', err)
    return 'error'
  }
})

app.whenReady().then(async () => {
  setupMenu()
  // Removed automatic checkMicrophonePermission() to let UI handle it via IPC
  app.setAboutPanelOptions({
    applicationName: 'VerseVision',
    applicationVersion: '1.0.0',
    version: '1.0.0',
    copyright: 'Copyright © 2025 Samji Diamond',
    authors: ['Samji Diamond'],
    website: 'https://versevision.5starcompany.com.ng/'
  })
  startServer()
  await waitReady()
  createWindow()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
app.on('before-quit', () => {
  if (serverProc) {
    console.log('Killing server process:', serverProc.pid)
    if (process.platform === 'win32') {
      try {
        require('child_process').execSync(`taskkill /F /T /PID ${serverProc.pid}`)
      } catch (e) {
        console.error('Failed to kill server process tree:', e.message)
      }
    } else {
      serverProc.kill()
    }
    serverProc = null
  }
})
