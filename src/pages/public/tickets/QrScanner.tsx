import { useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'
import { CameraOff, Loader2 } from 'lucide-react'

interface QrScannerProps {
  /** Chamado a cada QR code lido (o mesmo texto não se repete em menos de 3s). */
  onScan: (text: string) => void
  /** Com true a leitura fica em pausa (ex.: enquanto o resultado está na tela). */
  paused?: boolean
}

/** Leitor de QR code pela câmera traseira (getUserMedia + jsQR). Exige HTTPS (ou localhost). */
export function QrScanner({ onScan, paused = false }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pausedRef = useRef(paused)
  const onScanRef = useRef(onScan)
  const lastRef = useRef<{ text: string; at: number } | null>(null)
  const [state, setState] = useState<'starting' | 'ready' | 'error'>('starting')
  const [error, setError] = useState('')

  pausedRef.current = paused
  onScanRef.current = onScan

  useEffect(() => {
    let stream: MediaStream | null = null
    let raf = 0
    let cancelled = false

    const tick = () => {
      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas || cancelled) return

      if (!pausedRef.current && video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth > 0) {
        const scale = Math.min(1, 640 / video.videoWidth)
        const w = Math.floor(video.videoWidth * scale)
        const h = Math.floor(video.videoHeight * scale)
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (ctx) {
          ctx.drawImage(video, 0, 0, w, h)
          const img = ctx.getImageData(0, 0, w, h)
          const result = jsQR(img.data, w, h, { inversionAttempts: 'dontInvert' })
          if (result?.data) {
            const now = Date.now()
            const last = lastRef.current
            if (!last || last.text !== result.data || now - last.at > 3000) {
              lastRef.current = { text: result.data, at: now }
              onScanRef.current(result.data)
            }
          }
        }
      }
      raf = requestAnimationFrame(tick)
    }

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Este navegador não permite usar a câmera (é preciso abrir em HTTPS).')
        setState('error')
        return
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        const video = videoRef.current
        if (!video) return
        video.srcObject = stream
        await video.play()
        setState('ready')
        raf = requestAnimationFrame(tick)
      } catch (e) {
        setError(
          e instanceof DOMException && e.name === 'NotAllowedError'
            ? 'Permita o acesso à câmera no navegador para ler os QR codes.'
            : 'Não foi possível abrir a câmera deste aparelho.'
        )
        setState('error')
      }
    }

    void start()
    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  return (
    <div className="relative aspect-square w-full max-w-md overflow-hidden rounded-2xl border border-border/60 bg-black">
      <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
      <canvas ref={canvasRef} className="hidden" />
      {state === 'ready' && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-2/3 w-2/3 rounded-2xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
        </div>
      )}
      {state === 'starting' && (
        <div className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-white/80">
          <Loader2 className="h-4 w-4 animate-spin" /> Abrindo a câmera...
        </div>
      )}
      {state === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center text-sm text-white/80">
          <CameraOff className="h-8 w-8" />
          {error}
        </div>
      )}
    </div>
  )
}
