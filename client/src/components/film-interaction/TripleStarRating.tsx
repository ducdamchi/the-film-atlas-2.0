import { useState, useRef } from "react";
import type { StarRating } from "@/types/film";

interface TripleStarRatingProps {
  officialRating: StarRating | null;
  setRequestedRating: React.Dispatch<React.SetStateAction<StarRating | -1>>;
  showText: boolean;
}

/**
 * Renders inside an InteractionConsole variant wrapper — inherits all --console-* CSS custom properties.
 */
export default function TripleStarRating({
  officialRating,
  setRequestedRating,
  showText,
}: TripleStarRatingProps) {
  const [starHover, setStarHover] = useState(0); //1, 2, 3 for number of stars, 0 for not hover
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  return (
    <div
      className="hover:bg-[var(--console-hover-bg)] transition-all duration-200 ease-out h-full group flex items-center justify-center"
      style={{ padding: "var(--console-button-padding)" }}
      onMouseEnter={() => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        setIsHovered(true);
      }}
      onMouseLeave={() => {
        hoverTimeoutRef.current = setTimeout(() => setIsHovered(false), 200);
      }}
    >
      <div
        className={`console-button justify-center group/rating ${(officialRating ?? 0) >= 1 ? "bg-star/15" : ""}`}
        style={{
          borderColor:
            (officialRating ?? 0) >= 1
              ? "oklch(65.6% 0.241 354.308)"
              : "var(--console-text)",
          height: "var(--console-button-height)",
          padding: "var(--console-padding-tb) var(--console-padding-lr)",
        }}
      >
        <div
          className="flex items-center justify-center hover:text-[var(--console-hover-text)] transition-all duration-200 ease-out"
          style={{ fontSize: "var(--console-star-size)" }}
        >
          <button
            onMouseEnter={() => setStarHover(1)}
            onMouseLeave={() => setStarHover(0)}
            onClick={() =>
              setRequestedRating(!showText && officialRating === 1 ? 0 : 1)
            }
          >
            {starHover >= 1 || (officialRating ?? 0) >= 1 ? (
              <span className="text-star">&#10048;</span>
            ) : (
              <span>&#10048;</span>
            )}
          </button>
          <button
            onMouseEnter={() => setStarHover(2)}
            onMouseLeave={() => setStarHover(0)}
            onClick={() =>
              setRequestedRating(!showText && officialRating === 2 ? 0 : 2)
            }
          >
            {starHover >= 2 || (officialRating ?? 0) >= 2 ? (
              <span className="text-star">&#10048;</span>
            ) : (
              <span>&#10048;</span>
            )}
          </button>
          <button
            onMouseEnter={() => setStarHover(3)}
            onMouseLeave={() => setStarHover(0)}
            onClick={() =>
              setRequestedRating(!showText && officialRating === 3 ? 0 : 3)
            }
          >
            {starHover === 3 || (officialRating ?? 0) >= 3 ? (
              <span className="text-star">&#10048;</span>
            ) : (
              <span>&#10048;</span>
            )}
          </button>
        </div>
        {isHovered && !showText && (officialRating ?? 0) >= 1 && (
          <div className="w-0 overflow-hidden flex pointer-events-none transition-[width,opacity] duration-200 ease-out group-hover/rating:w-[0.75rem] flex items-center justify-center">
            <button
              onClick={() => setRequestedRating(0)}
              className="text-star hover:text-[var(--console-hover-text)] transition-colors duration-200 flex items-center"
              style={{ fontSize: "0.5rem", lineHeight: 1 }}
            >
              ✕
            </button>
          </div>
        )}
        {showText && (
          <div className="h-full flex items-center justify-center">
            {officialRating !== 0 &&
              officialRating !== undefined &&
              officialRating !== null && (
                <button
                  onClick={() => setRequestedRating(0)}
                  className="hover:text-[var(--console-hover-text)] transition-all duration-200 ease-out text-star"
                  style={{ fontSize: "var(--console-font-size)" }}
                >
                  Unrate
                </button>
              )}
            {(officialRating === 0 ||
              officialRating === undefined ||
              officialRating === null) && (
              <span
                className="hover:text-[var(--console-hover-text)] transition-all duration-200 ease-out"
                style={{
                  color: "var(--console-text)",
                  fontSize: "var(--console-font-size)",
                }}
              >
                Rate
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
