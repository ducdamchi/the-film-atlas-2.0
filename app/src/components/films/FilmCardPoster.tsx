import PosterTrailerHover from "./PosterTrailerHover";

const imgBaseUrl = "https://image.tmdb.org/t/p/original";

interface FilmCardPosterProps {
  backdropPath: string | null;
  filmId: number;
  trailerKey: string | null;
  isPosterHovered: boolean;
  onPosterHoverEnter: () => void;
  onPosterHoverLeave: () => void;
  onNavigate: () => void;
}

export default function FilmCardPoster({
  backdropPath,
  filmId,
  trailerKey,
  isPosterHovered,
  onPosterHoverEnter,
  onPosterHoverLeave,
  onNavigate,
}: FilmCardPosterProps) {
  return (
    <div
      className="w-full overflow-hidden relative"
      onMouseEnter={onPosterHoverEnter}
      onMouseLeave={onPosterHoverLeave}
    >
      {trailerKey ? (
        <PosterTrailerHover
          backdropPath={backdropPath}
          trailerKey={trailerKey}
          startOnMount={isPosterHovered}
          onClick={onNavigate}
        />
      ) : (
        <img
          id={`thumbnail-${filmId}`}
          className="w-full aspect-16/10 object-cover"
          src={
            backdropPath !== null
              ? `${imgBaseUrl}${backdropPath}`
              : "backdropnotfound.jpg"
          }
          alt=""
          onClick={onNavigate}
        />
      )}
    </div>
  );
}
