import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'
import { ImagePlus, Pause, Play, RefreshCw, SwitchCamera } from 'lucide-react'

export interface CapturedFrame {
  /** Canvas com o frame inteiro da câmera */
  fullCanvas: HTMLCanvasElement
  /** Retângulo da moldura da carta no canvas (pixels) */
  frame: { x: number; y: number; width: number; height: number }
  /** Preview data URL */
  previewUrl: string
}

interface ScannerCameraProps {
  /** Pausa o scan ao vivo (ex.: modal aberto) */
  paused?: boolean
  /** OCR em andamento — evita acumular frames */
  busy?: boolean
  /** Intervalo entre tentativas ao vivo (ms) */
  liveIntervalMs?: number
  onLiveFrame: (frame: CapturedFrame) => void
  onFileFrame?: (frame: CapturedFrame) => void
}

/** Moldura central com proporção de carta YGO (mesma lógica do overlay). */
export function computeCardFrame(
  videoWidth: number,
  videoHeight: number,
): { x: number; y: number; width: number; height: number } {
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
    previewUrl: canvas.toDataURL('image/jpeg', 0.7),
  }
}

export function ScannerCamera({
  paused = false,
  busy = false,
  liveIntervalMs = 1600,
  onLiveFrame,
  onFileFrame,
}: ScannerCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const onLiveFrameRef = useRef(onLiveFrame)
  const busyRef = useRef(busy)
  const pausedRef = useRef(paused)

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)
  const [ready, setReady] = useState(false)
  const [liveEnabled, setLiveEnabled] = useState(true)
  const [status, setStatus] = useState('Aguardando câmera...')

  useEffect(() => {
    onLiveFrameRef.current = onLiveFrame
  }, [onLiveFrame])

  useEffect(() => {
    busyRef.current = busy
  }, [busy])

  useEffect(() => {
    pausedRef.current = paused
  }, [paused])

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
        setStatus('Aponte a carta — identificação automática ativa')
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

  // Scan contínuo sem botão Capturar
  useEffect(() => {
    if (!ready || !liveEnabled) return

    let cancelled = false

    async function tick() {
      if (cancelled) return
      if (pausedRef.current || busyRef.current) return
      const video = videoRef.current
      if (!video) return
      const frame = canvasFromVideo(video)
      if (!frame) return
      setStatus('Lendo texto da carta...')
      onLiveFrameRef.current(frame)
    }

    const first = window.setTimeout(() => void tick(), 600)
    const id = window.setInterval(() => void tick(), liveIntervalMs)

    return () => {
      cancelled = true
      window.clearTimeout(first)
      window.clearInterval(id)
    }
  }, [ready, liveEnabled, liveIntervalMs])

  useEffect(() => {
    if (!ready) return
    if (paused) {
      setStatus('Scan pausado')
      return
    }
    if (busy) {
      setStatus('Processando OCR...')
      return
    }
    if (liveEnabled) {
      setStatus('Aponte a carta — identificação automática ativa')
    } else {
      setStatus('Scan ao vivo pausado')
    }
  }, [ready, paused, busy, liveEnabled])

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
      const captured: CapturedFrame = {
        fullCanvas: canvas,
        frame,
        previewUrl: canvas.toDataURL('image/jpeg', 0.85),
      }
      ;(onFileFrame ?? onLiveFrame)(captured)
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
          // contain: moldura alinha com o conteúdo real usado no OCR
          className="aspect-[3/4] w-full object-contain bg-black"
        />

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
          <div className="relative aspect-[59/86] w-[72%] max-w-sm rounded-xl border-2 border-[var(--color-accent)]/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
            <div className="absolute top-[3%] right-[7%] left-[7%] h-[13%] rounded-md border border-dashed border-emerald-300/90 bg-emerald-400/10" />
            <p className="absolute -bottom-8 left-0 right-0 text-center text-[11px] text-white/90">
              Encaixe a carta · a faixa verde é o nome
            </p>
          </div>
        </div>

        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
          <span className="rounded-md bg-black/65 px-2 py-1 text-[11px] text-white">
            {status}
          </span>
          {liveEnabled && ready && !paused && (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600/90 px-2 py-1 text-[11px] font-medium text-white">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
              Ao vivo
            </span>
          )}
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
          disabled={!ready || starting}
          onClick={() => setLiveEnabled((v) => !v)}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
        >
          {liveEnabled ? (
            <>
              <Pause className="h-4 w-4" />
              Pausar scan
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Retomar scan
            </>
          )}
        </button>

        <button
          type="button"
          disabled={starting}
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
          disabled={starting}
          onClick={() => void startCamera()}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2.5 text-sm text-[var(--color-muted)] transition hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)] disabled:opacity-50"
          title="Reiniciar câmera"
        >
          <RefreshCw className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2.5 text-sm text-[var(--color-muted)] transition hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]"
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
