import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Camera, ImagePlus, RefreshCw, SwitchCamera } from 'lucide-react'

export interface CapturedFrame {
  /** Canvas com o frame inteiro da câmera */
  fullCanvas: HTMLCanvasElement
  /** Retângulo da moldura da carta no canvas (pixels) */
  frame: { x: number; y: number; width: number; height: number }
  /** Preview data URL */
  previewUrl: string
}

interface ScannerCameraProps {
  disabled?: boolean
  onCapture: (frame: CapturedFrame) => void
}

function computeCardFrame(
  videoWidth: number,
  videoHeight: number,
): { x: number; y: number; width: number; height: number } {
  // Proporção aproximada de carta YGO (59:86)
  const targetRatio = 59 / 86
  let width = videoWidth * 0.72
  let height = width / targetRatio
  if (height > videoHeight * 0.82) {
    height = videoHeight * 0.82
    width = height * targetRatio
  }
  const x = (videoWidth - width) / 2
  const y = (videoHeight - height) / 2
  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
  }
}

export function ScannerCamera({ disabled = false, onCapture }: ScannerCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
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
          width: { ideal: 1280 },
          height: { ideal: 720 },
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

  function captureFromVideo() {
    const video = videoRef.current
    if (!video || !ready || video.videoWidth === 0) return

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    const frame = computeCardFrame(canvas.width, canvas.height)
    onCapture({
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
      const frame = computeCardFrame(canvas.width, canvas.height)
      onCapture({
        fullCanvas: canvas,
        frame,
        previewUrl: canvas.toDataURL('image/jpeg', 0.85),
      })
      URL.revokeObjectURL(url)
    }
    img.onerror = () => URL.revokeObjectURL(url)
    img.src = url
  }

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-black">
        <video
          ref={videoRef}
          playsInline
          muted
          className="aspect-[3/4] w-full object-cover"
        />

        {/* Moldura guia */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
          <div className="relative aspect-[59/86] w-[72%] max-w-sm rounded-xl border-2 border-[var(--color-accent)]/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
            <div className="absolute top-[4%] right-[6%] left-[6%] h-[14%] rounded-md border border-dashed border-white/70" />
            <p className="absolute -bottom-8 left-0 right-0 text-center text-[11px] text-white/90">
              Alinhe a carta e foque a faixa do nome
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
          disabled={disabled || !ready}
          onClick={captureFromVideo}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Camera className="h-4 w-4" />
          Capturar
        </button>

        <button
          type="button"
          disabled={disabled || starting}
          onClick={() =>
            setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))
          }
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2.5 text-sm text-[var(--color-muted)] transition hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)] disabled:opacity-50"
          title="Alternar câmera"
        >
          <SwitchCamera className="h-4 w-4" />
        </button>

        <button
          type="button"
          disabled={disabled || starting}
          onClick={() => void startCamera()}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2.5 text-sm text-[var(--color-muted)] transition hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)] disabled:opacity-50"
          title="Reiniciar câmera"
        >
          <RefreshCw className="h-4 w-4" />
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2.5 text-sm text-[var(--color-muted)] transition hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)] disabled:opacity-50"
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
