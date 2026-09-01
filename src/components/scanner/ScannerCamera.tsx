import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Camera, ImagePlus, RefreshCw, SwitchCamera } from 'lucide-react'
import {
  detectCardFrame,
  regionRatioToStyle,
  YGO_REGION_RATIOS,
} from '@/utils/cardFrameDetector'
import {
  blurWarningMessage,
  extremeBlurWarningMessage,
  isExtremelyBlurry,
  measureSharpness,
  shouldWarnBlur,
} from '@/utils/imageSharpness'
import {
  computeGuideFrameInVideoPixels,
  computeGuideLayout,
  type GuideLayout,
} from '@/utils/scannerGuideLayout'
import {
  SCANNER_BURST_COUNT,
  SCANNER_BURST_INTERVAL_MS,
  type CardFrameRect,
} from '@/services/cardScannerService'

export type { CardFrameRect }

export interface CapturedFrame {
  fullCanvas: HTMLCanvasElement
  /** Retângulo da moldura da carta em pixels do canvas/vídeo */
  frame: CardFrameRect
  previewUrl: string
  /** camera = guia na tela · photo = upload (prioriza auto-enquadramento) */
  source?: 'camera' | 'photo'
  /** Burst da câmera (ordenado por nitidez, inclui o frame principal) */
  burstFrames?: CapturedFrame[]
}

interface ScannerCameraProps {
  disabled?: boolean
  identifying?: boolean
  onIdentify: (frame: CapturedFrame) => void
}

/** @deprecated Use computeGuideFrameInVideoPixels — mantido para compatibilidade */
export function computeCardFrame(
  mediaWidth: number,
  mediaHeight: number,
): CardFrameRect {
  return computeGuideFrameInVideoPixels(mediaWidth, mediaHeight)
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function releaseMediaStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop())
}

function isCameraBusyError(err: unknown): boolean {
  const name = err instanceof DOMException ? err.name : ''
  const message = err instanceof Error ? err.message : String(err ?? '')
  return (
    name === 'NotReadableError' ||
    name === 'AbortError' ||
    /could not start video|device in use|busy|interrupted by a new load/i.test(
      message,
    )
  )
}

async function applyContinuousFocus(stream: MediaStream): Promise<void> {
  const track = stream.getVideoTracks()[0]
  if (!track?.applyConstraints) return

  try {
    const caps = track.getCapabilities?.() as MediaTrackCapabilities & {
      focusMode?: string[]
    }
    if (caps?.focusMode?.includes('continuous')) {
      await track.applyConstraints({
        focusMode: 'continuous',
      } as MediaTrackConstraints)
    }
  } catch {
    // Dispositivo pode não suportar focusMode — segue sem
  }
}

async function waitForVideoReady(video: HTMLVideoElement): Promise<void> {
  if (video.readyState >= 2 && video.videoWidth > 0) return
  await new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup()
      reject(new Error('Timeout ao carregar o vídeo da câmera'))
    }, 8000)
    const onReady = () => {
      cleanup()
      resolve()
    }
    const onError = () => {
      cleanup()
      reject(new Error('Falha ao carregar o vídeo da câmera'))
    }
    const cleanup = () => {
      window.clearTimeout(timeout)
      video.removeEventListener('loadeddata', onReady)
      video.removeEventListener('loadedmetadata', onReady)
      video.removeEventListener('error', onError)
    }
    video.addEventListener('loadeddata', onReady)
    video.addEventListener('loadedmetadata', onReady)
    video.addEventListener('error', onError)
  })
}

export function ScannerCamera({
  disabled = false,
  identifying = false,
  onIdentify,
}: ScannerCameraProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const cameraGenRef = useRef(0)
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
  const [restartKey, setRestartKey] = useState(0)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [captureWarning, setCaptureWarning] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)
  const [ready, setReady] = useState(false)
  const [guideLayout, setGuideLayout] = useState<GuideLayout | null>(null)

  const updateGuideLayout = useCallback(() => {
    const video = videoRef.current
    const container = containerRef.current
    if (!video?.videoWidth || !container) return

    setGuideLayout(
      computeGuideLayout(
        video.videoWidth,
        video.videoHeight,
        container.clientWidth,
        container.clientHeight,
      ),
    )
  }, [])

  useEffect(() => {
    if (!ready) return

    updateGuideLayout()
    const container = containerRef.current
    if (!container || typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateGuideLayout)
      return () => window.removeEventListener('resize', updateGuideLayout)
    }

    const observer = new ResizeObserver(() => updateGuideLayout())
    observer.observe(container)
    window.addEventListener('resize', updateGuideLayout)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateGuideLayout)
    }
  }, [ready, updateGuideLayout, facingMode, restartKey])

  const restartCamera = useCallback(() => {
    setRestartKey((key) => key + 1)
  }, [])

  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        'Este navegador não permite acesso à câmera. Use a opção de enviar foto.',
      )
      setStarting(false)
      setReady(false)
      return
    }

    const gen = ++cameraGenRef.current
    let cancelled = false

    const detachVideo = () => {
      const video = videoRef.current
      if (video) video.srcObject = null
    }

    const stopActiveStream = () => {
      releaseMediaStream(streamRef.current)
      streamRef.current = null
      detachVideo()
    }

    async function openCamera() {
      setStarting(true)
      setCameraError(null)
      setReady(false)
      setGuideLayout(null)
      stopActiveStream()

      await sleep(120)
      if (cancelled || gen !== cameraGenRef.current) return

      let lastError: unknown = null
      for (let attempt = 0; attempt < 4; attempt++) {
        if (cancelled || gen !== cameraGenRef.current) return
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
              facingMode: { ideal: facingMode },
              width: { ideal: 1920, min: 1280 },
              height: { ideal: 1080, min: 720 },
            },
          })
          if (cancelled || gen !== cameraGenRef.current) {
            releaseMediaStream(stream)
            return
          }

          const video = videoRef.current
          if (!video) {
            releaseMediaStream(stream)
            throw new Error('Elemento de vídeo indisponível')
          }

          streamRef.current = stream
          video.srcObject = stream
          await applyContinuousFocus(stream)
          await waitForVideoReady(video)
          if (cancelled || gen !== cameraGenRef.current) return

          try {
            await video.play()
          } catch (playErr) {
            if (!video.videoWidth) throw playErr
          }

          if (cancelled || gen !== cameraGenRef.current) return
          setReady(true)
          setStarting(false)
          updateGuideLayout()
          return
        } catch (err) {
          lastError = err
          stopActiveStream()
          if (isCameraBusyError(err) && attempt < 3) {
            await sleep(250 * (attempt + 1))
            continue
          }
          break
        }
      }

      if (cancelled || gen !== cameraGenRef.current) return
      setReady(false)
      setStarting(false)
      const message = lastError instanceof Error ? lastError.message : ''
      if (/interrupted by a new load request/i.test(message)) {
        setCameraError(null)
        return
      }
      setCameraError(
        lastError instanceof Error
          ? `Não foi possível abrir a câmera: ${lastError.message}`
          : 'Não foi possível abrir a câmera.',
      )
    }

    void openCamera()

    return () => {
      cancelled = true
      cameraGenRef.current += 1
      stopActiveStream()
    }
  }, [facingMode, restartKey, updateGuideLayout])

  async function handleIdentify() {
    const video = videoRef.current
    if (!video || !ready) return

    setCaptureWarning(null)

    const burst: CapturedFrame[] = []

    for (let i = 0; i < SCANNER_BURST_COUNT; i++) {
      const canvas = captureVideoCanvas(video)
      if (!canvas) continue

      const frame = computeGuideFrameInVideoPixels(canvas.width, canvas.height)

      burst.push({
        fullCanvas: canvas,
        frame,
        previewUrl: canvas.toDataURL('image/jpeg', 0.85),
        source: 'camera',
      })

      if (i < SCANNER_BURST_COUNT - 1) {
        await sleep(SCANNER_BURST_INTERVAL_MS)
      }
    }

    if (burst.length === 0) {
      setCaptureWarning(
        'Não foi possível capturar a imagem. Aguarde a câmera carregar e tente de novo.',
      )
      return
    }

    const ranked = [...burst].sort(
      (a, b) =>
        measureSharpness(b.fullCanvas, b.frame) -
        measureSharpness(a.fullCanvas, a.frame),
    )
    const best = ranked[0]

    if (isExtremelyBlurry(best.fullCanvas, best.frame)) {
      setCaptureWarning(extremeBlurWarningMessage('camera'))
      return
    }

    if (shouldWarnBlur(best.fullCanvas, best.frame, 'camera')) {
      setCaptureWarning(blurWarningMessage('camera'))
    }

    onIdentify({
      ...best,
      burstFrames: ranked,
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
      const detected = detectCardFrame(canvas)
      const frame =
        detected ?? computeGuideFrameInVideoPixels(canvas.width, canvas.height)

      setCaptureWarning(null)

      if (isExtremelyBlurry(canvas, frame)) {
        setCaptureWarning(extremeBlurWarningMessage('photo'))
        URL.revokeObjectURL(url)
        return
      }

      if (shouldWarnBlur(canvas, frame, 'photo')) {
        setCaptureWarning(blurWarningMessage('photo'))
      }

      onIdentify({
        fullCanvas: canvas,
        frame,
        previewUrl: canvas.toDataURL('image/jpeg', 0.85),
        source: 'photo',
      })
      URL.revokeObjectURL(url)
    }
    img.onerror = () => URL.revokeObjectURL(url)
    img.src = url
  }

  const busy = disabled || identifying || starting || !ready

  return (
    <div className="space-y-3">
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-black"
      >
        <video
          ref={videoRef}
          playsInline
          muted
          onLoadedMetadata={updateGuideLayout}
          className="aspect-[3/4] w-full object-contain bg-black"
        />

        {guideLayout && (
          <div className="pointer-events-none absolute inset-0">
            <div
              className="absolute rounded-xl border-2 border-[var(--color-accent)]/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]"
              style={{
                left: guideLayout.guide.x,
                top: guideLayout.guide.y,
                width: guideLayout.guide.width,
                height: guideLayout.guide.height,
              }}
            >
              <div
                className="absolute rounded-md border border-dashed border-emerald-300/90 bg-emerald-400/20"
                style={regionRatioToStyle(YGO_REGION_RATIOS.name)}
              />
              <div
                className="absolute rounded-md border border-dashed border-white/25 bg-white/5"
                style={regionRatioToStyle(YGO_REGION_RATIOS.typeIcon)}
              />
              <div
                className="absolute rounded-md border border-dashed border-amber-300/95 bg-amber-400/25"
                style={regionRatioToStyle(YGO_REGION_RATIOS.setCode)}
              />
            </div>
            <p
              className="absolute left-0 right-0 text-center text-[11px] text-white/90"
              style={{ top: guideLayout.guide.y + guideLayout.guide.height + 8 }}
            >
              Alinhe a carta na moldura · verde = nome · âmbar = set code
            </p>
          </div>
        )}

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

      {captureWarning && (
        <p className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-sm text-amber-200">
          {captureWarning}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void handleIdentify()}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Camera className="h-4 w-4" />
          {identifying ? 'Identificando...' : `Identificar carta (${SCANNER_BURST_COUNT} fotos)`}
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
          onClick={restartCamera}
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
