import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const port = process.env.PORT || 3000
const envPath = path.join(root, '.env')

let backend = null
let frontend = null
let restartingBackend = false
let pendingBackendRestart = false

function attachBackendHandlers(proc) {
  proc.on('exit', (code, signal) => {
    if (restartingBackend) {
      return
    }

    if (signal === 'SIGINT' || signal === 'SIGTERM') {
      return
    }

    if (code !== 0 && code !== null) {
      console.error(`[dev] backend exited with code ${code}`)
      shutdown(1)
    }
  })
}

function spawnBackend() {
  const proc = spawn('node', ['server.js'], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  })

  attachBackendHandlers(proc)
  backend = proc
  return proc
}

function stopBackend() {
  return new Promise((resolve) => {
    if (!backend) {
      resolve()
      return
    }

    const proc = backend
    backend = null

    const finish = () => resolve()
    proc.once('exit', finish)
    proc.kill('SIGTERM')

    setTimeout(() => {
      if (!proc.killed) {
        proc.kill('SIGKILL')
      }
    }, 3000)
  })
}

async function waitForBackend() {
  const url = `http://127.0.0.1:${port}/api/health`

  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      const response = await fetch(url)
      if (response.ok) {
        return
      }
    } catch {
      // backend still starting
    }

    await new Promise((resolve) => setTimeout(resolve, 250))
  }

  throw new Error(`Backend did not start on port ${port}. Check server.js for errors.`)
}

async function restartBackend() {
  if (restartingBackend) {
    pendingBackendRestart = true
    return
  }

  restartingBackend = true

  try {
    console.log('[dev] .env changed — restarting backend…')
    await stopBackend()
    await new Promise((resolve) => setTimeout(resolve, 150))
    spawnBackend()
    await waitForBackend()
    console.log(`[dev] Backend ready at http://localhost:${port}`)
  } finally {
    restartingBackend = false

    if (pendingBackendRestart) {
      pendingBackendRestart = false
      await restartBackend()
    }
  }
}

function startFrontend() {
  frontend = spawn('npx', ['vite'], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  })

  frontend.on('exit', (code, signal) => {
    if (signal === 'SIGINT' || signal === 'SIGTERM') {
      return
    }

    if (code !== 0 && code !== null) {
      console.error(`[dev] frontend exited with code ${code}`)
      shutdown(1)
    }
  })
}

function shutdown(code = 0) {
  if (backend) {
    backend.kill('SIGTERM')
  }
  if (frontend) {
    frontend.kill('SIGTERM')
  }
  process.exit(code)
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

spawnBackend()

try {
  await waitForBackend()
  console.log(`[dev] Backend ready at http://localhost:${port}`)
  startFrontend()

  if (fs.existsSync(envPath)) {
    let debounce = null
    fs.watch(envPath, () => {
      clearTimeout(debounce)
      debounce = setTimeout(() => {
        restartBackend().catch((error) => {
          console.error(`[dev] ${error instanceof Error ? error.message : error}`)
        })
      }, 500)
    })
  }
} catch (error) {
  console.error(`[dev] ${error instanceof Error ? error.message : error}`)
  shutdown(1)
}
