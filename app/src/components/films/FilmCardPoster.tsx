import PosterTrailerHover from "./PosterTrailerHover"

const imgBaseUrl = import.meta.env.VITE_TMDB_IMG_URL

interface FilmCardPosterProps {
  backdropPath: string | null
  filmId: number
  trailerKey: string | null
  isPosterHovered: boolean
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
  isPosterHovered,
  onPosterHoverEnter,
  onPosterHoverLeave,
  onNavigate,
  imgRef,
  onImageLoad,
}: FilmCardPosterProps) {
  return (
    <div
      className="w-full overflow-hidden relative"
      onMouseEnter={onPosterHoverEnter}
      onMouseLeave={onPosterHoverLeave}>
      {trailerKey ? (
        <PosterTrailerHover
          backdropPath={backdropPath}
          trailerKey={trailerKey}
          startOnMount={isPosterHovered}
          onClick={onNavigate}
          imgRef={imgRef}
          onImageLoad={onImageLoad}
        />
      ) : (
        <img
          ref={imgRef}
          id={`thumbnail-${filmId}`}
          className="w-full aspect-16/10 object-cover"
          src={
            backdropPath !== null
              ? `${imgBaseUrl}${backdropPath}`
              : "backdropnotfound.jpg"
          }
          onLoad={(e) => onImageLoad?.(e.currentTarget)}
          alt=""
          onClick={onNavigate}
        />
      )}
    </div>
  )
}
