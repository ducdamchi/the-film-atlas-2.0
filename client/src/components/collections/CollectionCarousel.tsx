import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import UserFilmCard from "../films/UserFilmCard";
import type { UserFilm } from "@/types/film";

interface CollectionCarouselProps {
  films: UserFilm[];
  queryString: string | null;
}

const GAP = 16; // px between cards
const DEFAULT_CARD_WIDTH = 352; // 22rem fallback

export default function CollectionCarousel({
  films,
  queryString,
}: CollectionCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const [slidesPerPage, setSlidesPerPage] = useState(1);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const realCount = films.length;

  // Recompute slidesPerPage on container resize
  const updateSlidesPerPage = useCallback(() => {
    if (!containerRef.current) return;
    const containerPx = containerRef.current.offsetWidth;
    const cardPx = cardRef.current?.offsetWidth ?? DEFAULT_CARD_WIDTH;
    const next = Math.max(1, Math.floor(containerPx / (cardPx + GAP)));
    setSlidesPerPage((prev) => {
      if (prev !== next) {
        // Reset to first real item when layout changes
        setCurrentIndex(next);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const observer = new ResizeObserver(updateSlidesPerPage);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    updateSlidesPerPage();
    return () => observer.disconnect();
  }, [updateSlidesPerPage]);

  // Initialise index once slidesPerPage is known
  useEffect(() => {
    setCurrentIndex(slidesPerPage);
  }, [slidesPerPage]);

  // Apply transform directly to avoid re-renders
  const applyTransform = useCallback(
    (index: number, durationMs: number = 300) => {
      if (!trackRef.current || !cardRef.current) return;
      const cardPx = cardRef.current.offsetWidth ?? DEFAULT_CARD_WIDTH;
      trackRef.current.style.transition = `transform ${durationMs}ms ease-in-out`;
      trackRef.current.style.transform = `translateX(-${index * (cardPx + GAP)}px)`;
    },
    [],
  );

  useEffect(() => {
    applyTransform(currentIndex);
  }, [currentIndex, applyTransform]);

  // Clone slices: prepend last N, append first N
  const prepend = films.slice(-slidesPerPage);
  const append = films.slice(0, slidesPerPage);
  const allSlides = [...prepend, ...films, ...append];

  const snapReset = useCallback(
    (targetIndex: number, afterIndex: number) => {
      // Jump without animation, then animate to next position
      requestAnimationFrame(() => {
        applyTransform(targetIndex, 0);
        setCurrentIndex(targetIndex);
        requestAnimationFrame(() => {
          setTimeout(() => {
            applyTransform(afterIndex, 300);
            setCurrentIndex(afterIndex);
            setIsTransitioning(false);
          }, 20);
        });
      });
    },
    [applyTransform],
  );

  const handleNext = useCallback(() => {
    if (isTransitioning || realCount === 0) return;
    setIsTransitioning(true);

    const next = currentIndex + 1;

    if (next >= realCount + slidesPerPage) {
      // Moved into appended clones — snap back to first real item
      applyTransform(next, 300);
      setCurrentIndex(next);
      setTimeout(() => {
        snapReset(slidesPerPage, slidesPerPage + 1);
      }, 300);
    } else {
      setCurrentIndex(next);
      setTimeout(() => setIsTransitioning(false), 300);
    }
  }, [
    isTransitioning,
    realCount,
    currentIndex,
    slidesPerPage,
    applyTransform,
    snapReset,
  ]);

  const handlePrev = useCallback(() => {
    if (isTransitioning || realCount === 0) return;
    setIsTransitioning(true);

    const prev = currentIndex - 1;

    if (prev < slidesPerPage) {
      // Moved into prepended clones — snap back to last real item
      applyTransform(prev, 300);
      setCurrentIndex(prev);
      setTimeout(() => {
        snapReset(realCount + slidesPerPage - 1, realCount + slidesPerPage - 2);
      }, 300);
    } else {
      setCurrentIndex(prev);
      setTimeout(() => setIsTransitioning(false), 300);
    }
  }, [
    isTransitioning,
    realCount,
    currentIndex,
    slidesPerPage,
    applyTransform,
    snapReset,
  ]);

  if (realCount === 0) return null;

  return (
    <div className="relative w-full">
      {/* Left arrow */}
      <button
        onClick={handlePrev}
        className="absolute left-2 top-1/2 -translate-y-1/2 z-[300] bg-control rounded-full hover:bg-dark/10 text-dark p-2 shadow-md"
        aria-label="Previous"
      >
        <ChevronLeft size={24} />
      </button>

      {/* Overflow container — x hidden, y visible so CardHoverOverlay isn't clipped */}
      <div
        ref={containerRef}
        style={{ overflowX: "hidden", overflowY: "visible" }}
        className="w-full"
      >
        {/* Flex track */}
        <div
          ref={trackRef}
          style={{
            display: "flex",
            flexWrap: "nowrap",
            willChange: "transform",
            gap: `${GAP}px`,
          }}
        >
          {allSlides.map((film, idx) => {
            // The first real card (index = slidesPerPage in allSlides) gets cardRef
            const isFirstReal = idx === slidesPerPage;
            return (
              <div
                key={`${film.id}-${idx}`}
                ref={isFirstReal ? cardRef : undefined}
                style={{ flexShrink: 0 }}
              >
                <UserFilmCard filmObject={film} queryString={queryString} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Right arrow */}
      <button
        onClick={handleNext}
        className="absolute right-2 top-1/2 -translate-y-1/2 z-[300] bg-control rounded-full hover:bg-dark/10 text-dark p-2 shadow-md"
        aria-label="Next"
      >
        <ChevronRight size={24} />
      </button>
    </div>
  );
}
