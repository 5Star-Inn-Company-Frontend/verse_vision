const { app, BrowserWindow } = require('electron')
const path = require('path')
const fs = require('fs')
const { spawn } = require('child_process')
let serverProc = null
let serverPort = process.env.PORT || '3001'

function ensureSeedUploads(userDataDir) {
  try {
    const destDir = path.join(userDataDir, 'uploads')
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true })
    const existing = fs.readdirSync(destDir).filter(f => /\.(jpe?g|png|webp|avif)$/i.test(f))
    if (existing.length > 0) return
    const srcDir = path.resolve(__dirname, '../api/uploads')
    if (!fs.existsSync(srcDir)) return
    const srcFiles = fs.readdirSync(srcDir).filter(f => /\.(jpe?g|png|webp|avif)$/i.test(f))
    for (const f of srcFiles) {
      const from = path.join(srcDir, f)
      const to = path.join(destDir, f)
      try {
        fs.copyFileSync(from, to)
      } catch {}
    }
  } catch {}
}
async function startServer() {
  const userData = app.getPath('userData')
  ensureSeedUploads(userData)
  const env = { ...process.env, PORT: serverPort, VV_DATA_DIR: userData, PUBLIC_SERVER_URL: `http://localhost:${serverPort}` }
  const entry = path.resolve(__dirname, '../api/dist/server.js')
  serverProc = spawn(process.execPath, [entry], { env })
}
async function waitReady() {
  const url = `http://localhost:${serverPort}/api/health`
  const ok = await fetch(url).then(r => r.ok).catch(() => false)
  if (ok) return
  await new Promise(r => setTimeout(r, 500))
  return waitReady()
}
function createWindow() {
  const win = new BrowserWindow({ width: 1200, height: 800 })
  win.loadURL(`http://localhost:${serverPort}`)
}
app.whenReady().then(async () => {
  await startServer()
  await waitReady()
  createWindow()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
app.on('quit', () => { if (serverProc) serverProc.kill() })
