import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Camera, ImagePlus, RefreshCw, SwitchCamera } from 'lucide-react'

export interface CapturedFrame {
  fullCanvas: HTMLCanvasElement
  frame: { x: number; y: number; width: number; height: number }
  previewUrl: string
}

interface ScannerCameraProps {
  disabled?: boolean
  identifying?: boolean
  onIdentify: (frame: CapturedFrame) => void
}

export function computeCardFrame(
  videoWidth: number,
  videoHeight: number,
): { x: number; y: number; width: number; height: number } {
  const targetRatio = 59 / 86
  let width = videoWidth * 0.78
  let height = width / targetRatio
  if (height > videoHeight * 0.88) {
    height = videoHeight * 0.88
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

function canvasFromVideo(video: HTMLVideoElement): CapturedFrame | null {
  if (video.videoWidth === 0 || video.videoHeight === 0) return null
  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
  const frame = computeCardFrame(canvas.width, canvas.height)
  return {
    fullCanvas: canvas,
    frame,
    previewUrl: canvas.toDataURL('image/jpeg', 0.85),
  }
}

export function ScannerCamera({
  disabled = false,
  identifying = false,
  onIdentify,
}: ScannerCameraProps) {
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
    if (!video || !ready) return
    const frame = canvasFromVideo(video)
    if (frame) onIdentify(frame)
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
      onIdentify({
        fullCanvas: canvas,
        frame,
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

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-5">
          <div className="relative aspect-[59/86] w-[78%] max-w-sm rounded-xl border-2 border-[var(--color-accent)]/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
            <div className="absolute top-[3%] right-[8%] left-[8%] h-[12%] rounded-md border border-dashed border-emerald-300/90 bg-emerald-400/15" />
            <p className="absolute -bottom-8 left-0 right-0 text-center text-[11px] text-white/90">
              Encaixe a carta · nome na faixa verde · depois Identificar
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
