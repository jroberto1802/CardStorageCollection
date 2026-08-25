import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Camera, ImagePlus, RefreshCw, SwitchCamera } from 'lucide-react'

export interface CardFrameRect {
  x: number
  y: number
  width: number
  height: number
}

export interface CapturedFrame {
  fullCanvas: HTMLCanvasElement
  /** Retângulo da moldura da carta em pixels do canvas/vídeo */
  frame: CardFrameRect
  previewUrl: string
}

interface ScannerCameraProps {
  disabled?: boolean
  identifying?: boolean
  onIdentify: (frame: CapturedFrame) => void
}

/** Fallback quando não há DOM da moldura (ex.: upload de arquivo). */
export function computeCardFrame(
  mediaWidth: number,
  mediaHeight: number,
): CardFrameRect {
  const targetRatio = 59 / 86
  let width = mediaWidth * 0.78
  let height = width / targetRatio
  if (height > mediaHeight * 0.88) {
    height = mediaHeight * 0.88
    width = height * targetRatio
  }
  return {
    x: Math.round((mediaWidth - width) / 2),
    y: Math.round((mediaHeight - height) / 2),
    width: Math.round(width),
    height: Math.round(height),
  }
}

/**
 * Área real do vídeo dentro do elemento com object-fit: contain
 * (exclui as barras pretas).
 */
function getContainedVideoContent(
  video: HTMLVideoElement,
): { offsetX: number; offsetY: number; scale: number } {
  const elW = video.clientWidth
  const elH = video.clientHeight
  const vw = video.videoWidth
  const vh = video.videoHeight
  if (!elW || !elH || !vw || !vh) {
    return { offsetX: 0, offsetY: 0, scale: 1 }
  }
  const scale = Math.min(elW / vw, elH / vh)
  const dispW = vw * scale
  const dispH = vh * scale
  return {
    offsetX: (elW - dispW) / 2,
    offsetY: (elH - dispH) / 2,
    scale,
  }
}

/** Converte a moldura visível (DOM) para pixels do frame de vídeo. */
export function mapGuideElementToVideoPixels(
  video: HTMLVideoElement,
  guideEl: HTMLElement,
): CardFrameRect | null {
  if (!video.videoWidth || !video.videoHeight) return null

  const videoRect = video.getBoundingClientRect()
  const guideRect = guideEl.getBoundingClientRect()
  const { offsetX, offsetY, scale } = getContainedVideoContent(video)
  if (scale <= 0) return null

  const relX = guideRect.left - videoRect.left - offsetX
  const relY = guideRect.top - videoRect.top - offsetY

  const x = Math.round(relX / scale)
  const y = Math.round(relY / scale)
  const width = Math.round(guideRect.width / scale)
  const height = Math.round(guideRect.height / scale)

  // Clamp dentro do frame
  const clampedX = Math.max(0, Math.min(x, video.videoWidth - 1))
  const clampedY = Math.max(0, Math.min(y, video.videoHeight - 1))
  const clampedW = Math.max(1, Math.min(width, video.videoWidth - clampedX))
  const clampedH = Math.max(1, Math.min(height, video.videoHeight - clampedY))

  return { x: clampedX, y: clampedY, width: clampedW, height: clampedH }
}

function captureVideoCanvas(video: HTMLVideoElement): HTMLCanvasElement | null {
  if (!video.videoWidth || !video.videoHeight) return null
  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
  return canvas
}

export function ScannerCamera({
  disabled = false,
  identifying = false,
  onIdentify,
}: ScannerCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const guideRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)
  const [ready, setReady] = useState(false)

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setReady(false)
  }, [])

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        'Este navegador não permite acesso à câmera. Use a opção de enviar foto.',
      )
      return
    }

    setStarting(true)
    setCameraError(null)
    stopCamera()

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      })
      streamRef.current = stream
      const video = videoRef.current
      if (video) {
        video.srcObject = stream
        await video.play()
        setReady(true)
      }
    } catch (err) {
      setReady(false)
      setCameraError(
        err instanceof Error
          ? `Não foi possível abrir a câmera: ${err.message}`
          : 'Não foi possível abrir a câmera.',
      )
    } finally {
      setStarting(false)
    }
  }, [facingMode, stopCamera])

  useEffect(() => {
    void startCamera()
    return () => stopCamera()
  }, [startCamera, stopCamera])

  function handleIdentify() {
    const video = videoRef.current
    const guide = guideRef.current
    if (!video || !ready) return

    const canvas = captureVideoCanvas(video)
    if (!canvas) return

    const frame =
      (guide ? mapGuideElementToVideoPixels(video, guide) : null) ??
      computeCardFrame(canvas.width, canvas.height)

    onIdentify({
      fullCanvas: canvas,
      frame,
      previewUrl: canvas.toDataURL('image/jpeg', 0.85),
    })
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        URL.revokeObjectURL(url)
        return
      }
      ctx.drawImage(img, 0, 0)
      onIdentify({
        fullCanvas: canvas,
        frame: computeCardFrame(canvas.width, canvas.height),
        previewUrl: canvas.toDataURL('image/jpeg', 0.85),
      })
      URL.revokeObjectURL(url)
    }
    img.onerror = () => URL.revokeObjectURL(url)
    img.src = url
  }

  const busy = disabled || identifying || starting || !ready

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-black">
        <video
          ref={videoRef}
          playsInline
          muted
          className="aspect-[3/4] w-full object-contain bg-black"
        />

        {/* Moldura alinhada 1:1 com o crop do OCR via getBoundingClientRect */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-5">
          <div
            ref={guideRef}
            className="relative aspect-[59/86] w-[78%] max-w-sm rounded-xl border-2 border-[var(--color-accent)]/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]"
          >
            {/* Só a área do NOME (esquerda). Direita = ícone Spell/Trap/Monster */}
            <div className="absolute top-[3.5%] left-[6%] h-[10%] w-[62%] rounded-md border border-dashed border-emerald-300/90 bg-emerald-400/20" />
            <div className="absolute top-[3.5%] right-[5%] h-[10%] w-[18%] rounded-md border border-dashed border-white/25 bg-white/5" />
            <p className="absolute -bottom-8 left-0 right-0 text-center text-[11px] text-white/90">
              Verde = nome · cinza = tipo (ignorado no OCR)
            </p>
          </div>
        </div>

        {(starting || !ready) && !cameraError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-sm text-white">
            {starting ? 'Abrindo câmera...' : 'Aguardando câmera...'}
          </div>
        )}
      </div>

      {cameraError && (
        <p className="rounded-lg border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 px-3 py-2 text-sm text-red-300">
          {cameraError}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={handleIdentify}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Camera className="h-4 w-4" />
          {identifying ? 'Identificando...' : 'Identificar carta'}
        </button>

        <button
          type="button"
          disabled={starting || identifying}
          onClick={() =>
            setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))
          }
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-3 text-sm text-[var(--color-muted)] transition hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)] disabled:opacity-50"
          title="Alternar câmera"
        >
          <SwitchCamera className="h-4 w-4" />
        </button>

        <button
          type="button"
          disabled={starting || identifying}
          onClick={() => void startCamera()}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-3 text-sm text-[var(--color-muted)] transition hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)] disabled:opacity-50"
          title="Reiniciar câmera"
        >
          <RefreshCw className="h-4 w-4" />
        </button>

        <button
          type="button"
          disabled={identifying}
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-3 text-sm text-[var(--color-muted)] transition hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)] disabled:opacity-50"
        >
          <ImagePlus className="h-4 w-4" />
          Foto
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </div>
  )
}
