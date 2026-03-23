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
      setPhase("dimming");
      dimTimerRef.current = setTimeout(() => {
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
    if (fadeTimerRef.current) {
      clearTimeout(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }
    intentTimerRef.current = setTimeout(() => {
      setPhase("dimming");
      dimTimerRef.current = setTimeout(() => {
        setPhase("playing");
      }, 300);
    }, 1000);
  };

  const handleMouseLeave = () => {
    if (intentTimerRef.current) {
      clearTimeout(intentTimerRef.current);
      intentTimerRef.current = null;
    }
    if (dimTimerRef.current) {
      clearTimeout(dimTimerRef.current);
      dimTimerRef.current = null;
    }
    if (phase !== "idle") {
      setPhase("fading-out");
      fadeTimerRef.current = setTimeout(() => {
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
