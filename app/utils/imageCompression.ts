const KB = 1024
const MB = 1024 * KB

/** A photo over this size is compressed when it is added. */
export const COMPRESS_ABOVE_BYTES = 500 * KB

/**
 * New photos allowed in one save. Data URLs travel in a text field the backend caps
 * at 16 MB, and base64 adds a third, so 11 MB leaves room for captions and JSON.
 */
export const SAVE_BUDGET_BYTES = 11 * MB

const MAX_EDGE_PX = 1920
const MIN_EDGE_PX = 480
const EDGE_SHRINK = 0.85
const QUALITY_STEPS = [0.82, 0.72, 0.6]
const MIN_PER_PHOTO_BYTES = 50 * KB
// Canvas would drop a GIF's animation, so it keeps its bytes up to the backend's limit per image.
const GIF_TYPE = 'image/gif'
const MAX_GIF_BYTES = 5 * MB
// The backend rejects anything else, so another type must be converted even when it is small.
const UPLOADABLE_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp'])

export interface CompressedImage {
  file: File
  dataUrl: string
  bytes: number
}

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not encode image.'))),
      'image/jpeg',
      quality
    )
  })
}

/** Lowers quality first and only then the size, so a photo keeps as much detail as it can. */
async function encodeUnderBytes(source: ImageBitmap, maxBytes: number): Promise<Blob> {
  const longestEdge = Math.max(source.width, source.height)
  let edge = Math.min(MAX_EDGE_PX, longestEdge)

  while (true) {
    const scale = edge / longestEdge
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(source.width * scale))
    canvas.height = Math.max(1, Math.round(source.height * scale))
    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('Could not prepare image.')
    }
    // JPEG has no transparency, and transparent pixels would otherwise turn black.
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(source, 0, 0, canvas.width, canvas.height)

    let smallest: Blob | null = null
    for (const quality of QUALITY_STEPS) {
      smallest = await canvasToJpeg(canvas, quality)
      if (smallest.size <= maxBytes) {
        return smallest
      }
    }
    if (edge <= MIN_EDGE_PX) {
      return smallest as Blob
    }
    edge = Math.max(MIN_EDGE_PX, Math.round(edge * EDGE_SHRINK))
  }
}

async function compressBlob(blob: Blob, maxBytes: number): Promise<Blob> {
  const bitmap = await createImageBitmap(blob)
  try {
    return await encodeUnderBytes(bitmap, maxBytes)
  } finally {
    bitmap.close()
  }
}

/** Throws when a file cannot be made into something the backend accepts. */
export async function compressImageFile(file: File): Promise<CompressedImage> {
  if (file.type === GIF_TYPE && file.size > MAX_GIF_BYTES) {
    throw new Error('GIF is too large.')
  }
  const isSmallUploadable = file.size <= COMPRESS_ABOVE_BYTES && UPLOADABLE_TYPES.has(file.type)
  if (isSmallUploadable || file.type === GIF_TYPE) {
    return { file, dataUrl: await readAsDataUrl(file), bytes: file.size }
  }
  const blob = await compressBlob(file, COMPRESS_ABOVE_BYTES)
  return { file, dataUrl: await readAsDataUrl(blob), bytes: blob.size }
}

/** Compresses in order, one at a time, because decoding phone photos takes a lot of memory. */
export async function compressImageFiles(
  files: File[]
): Promise<{ images: CompressedImage[]; failedNames: string[] }> {
  const images: CompressedImage[] = []
  const failedNames: string[] = []
  for (const file of files) {
    try {
      images.push(await compressImageFile(file))
    } catch {
      failedNames.push(file.name)
    }
  }
  return { images, failedNames }
}

export function failedImagesMessage(names: string[]): string {
  return `Could not read ${names.join(', ')}. Try a JPG or PNG instead.`
}

function isDataUrl(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.startsWith('data:')
}

function dataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1)
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0
  return Math.floor((base64.length * 3) / 4) - padding
}

function dataUrlToBlob(dataUrl: string): Blob {
  const type = dataUrl.slice(5, dataUrl.indexOf(';'))
  const binary = atob(dataUrl.slice(dataUrl.indexOf(',') + 1))
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return new Blob([bytes], { type })
}

function isCompressibleDataUrl(dataUrl: string): boolean {
  return dataUrl.slice(5, dataUrl.indexOf(';')) !== GIF_TYPE
}

/** Bytes of the given images that still have to be uploaded. Hosted URLs count as nothing. */
export function pendingImageBytes(values: Array<string | null | undefined>): number {
  return values.filter(isDataUrl).reduce((total, value) => total + dataUrlBytes(value), 0)
}

/**
 * Shrinks new photos so one save fits the budget, so a big batch never blocks a save.
 * Hosted URLs are already uploaded and pass through. A photo that cannot be decoded
 * keeps its bytes, and the backend then explains the limit if the save is still too large.
 */
export async function fitImagesToBudget(urls: string[], reservedBytes = 0): Promise<string[]> {
  const budget = SAVE_BUDGET_BYTES - reservedBytes
  if (pendingImageBytes(urls) <= budget) {
    return urls
  }

  const compressible = urls.filter((url) => isDataUrl(url) && isCompressibleDataUrl(url))
  const fixedBytes = pendingImageBytes(urls) - pendingImageBytes(compressible)
  const perPhoto = Math.max(
    MIN_PER_PHOTO_BYTES,
    Math.floor((budget - fixedBytes) / Math.max(1, compressible.length))
  )

  const fitted: string[] = []
  for (const url of urls) {
    if (!isDataUrl(url) || !isCompressibleDataUrl(url) || dataUrlBytes(url) <= perPhoto) {
      fitted.push(url)
      continue
    }
    try {
      fitted.push(await readAsDataUrl(await compressBlob(dataUrlToBlob(url), perPhoto)))
    } catch {
      fitted.push(url)
    }
  }
  return fitted
}
