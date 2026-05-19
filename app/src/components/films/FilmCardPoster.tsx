import { useState, useRef, useEffect } from "react"

const imgBaseUrl = import.meta.env.VITE_TMDB_IMG_URL

type Phase = "idle" | "dimming" | "playing" | "fading-out"

interface FilmCardPosterProps {
  backdropPath: string | null
  filmId: number
  trailerKey: string | null
  onPosterHoverEnter: () => void
  onPosterHoverLeave: () => void
  onNavigate: () => void
  imgRef?: (node: HTMLImageElement | null) => void
  onImageLoad?: (el: HTMLImageElement) => void
}

export default function FilmCardPoster({
  backdropPath,
  filmId,
  trailerKey,
  onPosterHoverEnter,
  onPosterHoverLeave,
  onNavigate,
  imgRef,
  onImageLoad,
}: FilmCardPosterProps) {
  const [phase, setPhase] = useState<Phase>("idle")
  const isHoveredRef = useRef(false)
  const intentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dimTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // When trailerKey becomes available while the user is already hovering, start immediately
  useEffect(() => {
    if (trailerKey && isHoveredRef.current && phase === "idle") {
      setPhase("dimming")
      dimTimerRef.current = setTimeout(() => setPhase("playing"), 300)
    }
  }, [trailerKey])

  useEffect(() => {
    return () => {
      if (intentTimerRef.current) clearTimeout(intentTimerRef.current)
      if (dimTimerRef.current) clearTimeout(dimTimerRef.current)
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current)
    }
  }, [])

  const handleMouseEnter = () => {
    isHoveredRef.current = true
    onPosterHoverEnter()
    if (!trailerKey) return
    if (fadeTimerRef.current) {
      clearTimeout(fadeTimerRef.current)
      fadeTimerRef.current = null
    }
    intentTimerRef.current = setTimeout(() => {
      setPhase("dimming")
      dimTimerRef.current = setTimeout(() => setPhase("playing"), 300)
    }, 1000)
  }

  const handleMouseLeave = () => {
    isHoveredRef.current = false
    onPosterHoverLeave()
    if (intentTimerRef.current) {
      clearTimeout(intentTimerRef.current)
      intentTimerRef.current = null
    }
    if (dimTimerRef.current) {
      clearTimeout(dimTimerRef.current)
      dimTimerRef.current = null
    }
    if (phase !== "idle") {
      setPhase("fading-out")
      fadeTimerRef.current = setTimeout(() => setPhase("idle"), 200)
    }
  }

  const posterSrc = backdropPath
    ? `${imgBaseUrl}${backdropPath}`
    : "backdropnotfound.jpg"

  // Poster fades out when trailer is playing, fades back in otherwise
  const posterVisible = !trailerKey || phase === "idle" || phase === "fading-out"
  const iframeMounted =
    trailerKey &&
    (phase === "dimming" || phase === "playing" || phase === "fading-out")
  const iframeUrl = trailerKey
    ? `https://www.youtube-nocookie.com/embed/${trailerKey}?autoplay=1&mute=1&controls=0&modestbranding=1&loop=1&playlist=${trailerKey}&rel=0&showinfo=0&iv_load_policy=3&start=30`
    : null

  return (
    <div
      className="w-full aspect-16/10 relative overflow-hidden cursor-pointer"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onNavigate}>
      {/* Single img — always mounted with consistent crossOrigin to prevent CORS cache conflicts */}
      <img
        ref={imgRef}
        id={`thumbnail-${filmId}`}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
          posterVisible ? "opacity-100" : "opacity-0"
        }`}
        src={posterSrc}
        crossOrigin="anonymous"
        onLoad={(e) => onImageLoad?.(e.currentTarget)}
        alt=""
      />

      {/* Trailer iframe overlay — mounts during dimming to pre-load, visible only when playing */}
      {iframeMounted && (
        <iframe
          className={`absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-200 ${
            phase === "playing" ? "opacity-100" : "opacity-0"
          }`}
          src={iframeUrl!}
          allow="autoplay; encrypted-media"
        />
      )}
    </div>
  )
}
