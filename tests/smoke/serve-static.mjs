// Serves the generated site the way public/.htaccess does in production:
// the file if it exists, otherwise the SPA fallback.
import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize, resolve, sep } from 'node:path'

const ROOT = resolve('.output/public')
const PORT = Number(process.argv[2] || 4173)
const TYPES = {
  '.css': 'text/css',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.mjs': 'text/javascript',
  '.mp4': 'video/mp4',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
}

if (!existsSync(join(ROOT, '200.html'))) {
  console.error('Run `pnpm run generate` before the smoke tests.')
  process.exit(1)
}

function resolveFile(urlPath) {
  const target = normalize(join(ROOT, decodeURIComponent(urlPath)))
  if (target !== ROOT && !target.startsWith(ROOT + sep)) return null
  if (existsSync(target) && statSync(target).isFile()) return target
  const index = join(target, 'index.html')
  return existsSync(index) ? index : null
}

createServer((req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost')
  const file = resolveFile(pathname) ?? join(ROOT, '200.html')
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' })
  createReadStream(file).pipe(res)
}).listen(PORT, '127.0.0.1', () => {
  console.log(`Serving ${ROOT} on port ${PORT}`)
})
