const { app, BrowserWindow, Menu } = require('electron')
const path = require('path')
const { fork } = require('child_process')
let serverProc = null
const serverPort = process.env.PORT || '3001'

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
app.whenReady().then(async () => {
  setupMenu()
  app.setAboutPanelOptions({
    applicationName: 'VerseVision',
    applicationVersion: '0.0.1',
    version: '0.0.1',
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
app.on('quit', () => { if (serverProc) serverProc.kill() })
