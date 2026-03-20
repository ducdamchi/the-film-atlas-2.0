import { useState, useRef, useEffect } from "react";

type Phase = "idle" | "dimming" | "playing" | "fading-out";

interface PosterTrailerHoverProps {
  backdropPath: string | null;
  trailerKey: string;
  startOnMount: boolean;
  onClick: () => void;
}

const imgBaseUrl = "https://image.tmdb.org/t/p/original";

export default function PosterTrailerHover({
  backdropPath,
  trailerKey,
  startOnMount,
  onClick,
}: PosterTrailerHoverProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const intentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dimTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (startOnMount) {
      console.log("[TrailerHover] mounted while already hovered — starting DIMMING immediately");
      setPhase("dimming");
      dimTimerRef.current = setTimeout(() => {
        console.log("[TrailerHover] 300ms elapsed → PLAYING (iframe visible)");
        setPhase("playing");
      }, 300);
    }
    return () => {
      if (intentTimerRef.current) clearTimeout(intentTimerRef.current);
      if (dimTimerRef.current) clearTimeout(dimTimerRef.current);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
  }, []);

  const handleMouseEnter = () => {
    console.log("[TrailerHover] mouseenter — waiting 1000ms before DIMMING");
    if (fadeTimerRef.current) {
      clearTimeout(fadeTimerRef.current);
      fadeTimerRef.current = null;
      console.log("[TrailerHover] fade-out timer cancelled (fast re-enter)");
    }
    intentTimerRef.current = setTimeout(() => {
      console.log("[TrailerHover] 1000ms elapsed → DIMMING");
      setPhase("dimming");
      dimTimerRef.current = setTimeout(() => {
        console.log("[TrailerHover] 300ms elapsed → PLAYING (iframe visible)");
        setPhase("playing");
      }, 300);
    }, 1000);
  };

  const handleMouseLeave = () => {
    console.log("[TrailerHover] mouseleave — current phase:", phase);
    if (intentTimerRef.current) {
      clearTimeout(intentTimerRef.current);
      intentTimerRef.current = null;
      console.log("[TrailerHover] intent timer cancelled (left before 1000ms)");
    }
    if (dimTimerRef.current) {
      clearTimeout(dimTimerRef.current);
      dimTimerRef.current = null;
      console.log("[TrailerHover] dim timer cancelled (left before trailer started)");
    }
    if (phase !== "idle") {
      console.log("[TrailerHover] → FADING-OUT (iframe fading, poster returning)");
      setPhase("fading-out");
      fadeTimerRef.current = setTimeout(() => {
        console.log("[TrailerHover] 200ms elapsed → IDLE (iframe unmounted)");
        setPhase("idle");
      }, 200);
    }
  };

  const posterSrc = backdropPath
    ? `${imgBaseUrl}${backdropPath}`
    : "backdropnotfound.jpg";

  const iframeUrl = `https://www.youtube-nocookie.com/embed/${trailerKey}?autoplay=1&mute=1&controls=0&modestbranding=1&loop=1&playlist=${trailerKey}&rel=0&showinfo=0&iv_load_policy=3&start=30`;

  // Poster fades out on dimming/playing, fades back in on fading-out/idle
  const posterVisible = phase === "idle" || phase === "fading-out";
  // Iframe mounts during dimming (starts loading), unmounts on idle
  const iframeMounted = phase === "dimming" || phase === "playing" || phase === "fading-out";

  return (
    <div
      className="filmCard-width aspect-16/10 relative overflow-hidden cursor-pointer"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
    >
      {/* Poster */}
      <img
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
          posterVisible ? "opacity-100" : "opacity-0"
        }`}
        src={posterSrc}
        alt=""
      />

      {/* YouTube iframe — mounts during dimming to pre-load, visible only when playing */}
      {iframeMounted && (
        <iframe
          className={`absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-200 ${
            phase === "playing" ? "opacity-100" : "opacity-0"
          }`}
          src={iframeUrl}
          allow="autoplay; encrypted-media"
        />
      )}
    </div>
  );
}
