import sharp from 'sharp'
import fs from 'fs'
import path from 'path'

const DIRS = ['app/assets/bpb-images', 'public/images']

async function optimizeDirectory(dir) {
  if (!fs.existsSync(dir)) return
  const files = fs.readdirSync(dir)

  for (const file of files) {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)
    if (stat.isDirectory()) continue

    const ext = path.extname(file).toLowerCase()
    const base = path.parse(file).name

    if (ext === '.jpg' || ext === '.jpeg') {
      const webpPath = path.join(dir, `${base}.webp`)
      await sharp(filePath)
        .resize({ width: 1920, withoutEnlargement: true })
        .webp({ quality: 80, effort: 5 })
        .toFile(webpPath)

      const tempPath = path.join(dir, `_opt_${file}`)
      await sharp(filePath)
        .resize({ width: 1920, withoutEnlargement: true })
        .jpeg({ quality: 82, progressive: true, mozjpeg: true })
        .toFile(tempPath)

      fs.unlinkSync(filePath)
      fs.renameSync(tempPath, filePath)

      const newStat = fs.statSync(filePath)
      const webpStat = fs.statSync(webpPath)
      console.log(`[Optimized] ${file}: ${Math.round(stat.size / 1024)} KB -> JPG: ${Math.round(newStat.size / 1024)} KB | WebP: ${Math.round(webpStat.size / 1024)} KB`)
    } else if (ext === '.png' && !file.includes('icon')) {
      const webpPath = path.join(dir, `${base}.webp`)
      await sharp(filePath)
        .resize({ width: 1920, withoutEnlargement: true })
        .webp({ quality: 80, effort: 5 })
        .toFile(webpPath)
      console.log(`[Optimized WebP] ${file} -> ${base}.webp`)
    }
  }
}

async function main() {
  console.log('Optimizing static image assets...')
  for (const dir of DIRS) {
    await optimizeDirectory(dir)
  }
  console.log('Asset optimization complete.')
}

main().catch(console.error)
