import { toCanvas } from 'html-to-image'

export interface CardCaptureOptions {
  fixedWidth?: number
  quality?: number
  maxBytes?: number
  backgroundColor?: string
}

export function useCardCapture() {
  const isCapturing = ref(false)

  async function captureCardAsBlob(
    element: HTMLElement | null | undefined,
    options: CardCaptureOptions = {}
  ): Promise<Blob | null> {
    if (!element || typeof window === 'undefined') return null

    isCapturing.value = true
    let clone: HTMLElement | null = null

    try {
      // 1. Wait for fonts to be ready
      if (document.fonts) {
        try {
          await document.fonts.ready
        } catch {
          // ignore font loading error
        }
      }

      // 2. Wait for all images inside the source element to finish loading
      const images = Array.from(element.querySelectorAll('img'))
      await Promise.all(
        images.map((img) => {
          if (img.complete && img.naturalHeight !== 0) return Promise.resolve()
          return new Promise<void>((resolve) => {
            img.onload = () => resolve()
            img.onerror = () => resolve()
            if ('decode' in img) {
              img.decode().then(resolve).catch(resolve)
            }
            setTimeout(resolve, 800)
          })
        })
      )

      // 3. Clone node to an offscreen container with fixed width (580 CSS px)
      // Capturing at 580px ensures email desktop clients don't see a narrow mobile card
      const fixedWidth = options.fixedWidth ?? 580
      clone = element.cloneNode(true) as HTMLElement
      clone.style.width = `${fixedWidth}px`
      clone.style.maxWidth = `${fixedWidth}px`
      clone.style.minWidth = `${fixedWidth}px`
      clone.style.position = 'fixed'
      clone.style.left = '-99999px'
      clone.style.top = '0'
      clone.style.zIndex = '-99999'
      clone.style.pointerEvents = 'none'
      clone.style.opacity = '1'
      clone.style.display = 'block'
      document.body.appendChild(clone)

      // Ensure clone images are ready
      const cloneImages = Array.from(clone.querySelectorAll('img'))
      await Promise.all(
        cloneImages.map((img) => {
          if (img.complete && img.naturalHeight !== 0) return Promise.resolve()
          return new Promise<void>((resolve) => {
            img.onload = () => resolve()
            img.onerror = () => resolve()
            setTimeout(resolve, 400)
          })
        })
      )

      // Give browser a frame to compute clone layout
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))

      // 4. Render to Canvas at 2x resolution
      const canvas = await toCanvas(clone, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: options.backgroundColor ?? '#f7f4ef',
      })

      // 5. Convert to JPEG Blob, ensuring size is under 1 MB
      const maxBytes = options.maxBytes ?? 1024 * 1024
      const initialQuality = options.quality ?? 0.90

      let blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', initialQuality)
      )
      if (!blob) return null

      if (blob.size > maxBytes) {
        for (const q of [0.82, 0.72, 0.60]) {
          const nextBlob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, 'image/jpeg', q)
          )
          if (nextBlob) {
            blob = nextBlob
            if (blob.size <= maxBytes) break
          }
        }
      }

      return blob
    } catch (err) {
      console.warn('Card capture failed:', err)
      return null
    } finally {
      if (clone && clone.parentNode) {
        clone.parentNode.removeChild(clone)
      }
      isCapturing.value = false
    }
  }

  return {
    isCapturing,
    captureCardAsBlob,
  }
}

