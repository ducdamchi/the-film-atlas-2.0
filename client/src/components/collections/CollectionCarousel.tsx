import {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import UserFilmCard from "../films/UserFilmCard";
import LoadingPage from "../layout/LoadingPage";
import type { UserFilm } from "@/types/film";

interface CollectionCarouselProps {
  films: UserFilm[];
  queryString: string | null;
  title: string | null;
}

const CARD_WIDTH = 352; // 22rem — fixed, matches .filmGallery-grid
const NAV_BUTTON_WIDTH = 64;
const GAP = 12;

function getSlidesPerPage(containerPx: number): number {
  if (containerPx < 832) return 1; //48rem + 4rem
  if (containerPx < 1216) return 2; //72rem + 4rem
  if (containerPx < 1600) return 3; //100rem + 4rem
  return 4;
}

export default function CollectionCarousel({
  films,
  queryString,
  title,
}: CollectionCarouselProps) {
  const [outerEl, setOuterEl] = useState<HTMLDivElement | null>(null);
  const outerRef = useCallback(
    (node: HTMLDivElement | null) => setOuterEl(node),
    [],
  );
  const trackRef = useRef<HTMLDivElement>(null);

  const [slidesPerPage, setSlidesPerPage] = useState(1);
  const [layoutReady, setLayoutReady] = useState(false);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const pendingInitialIndex = useRef<number | null>(null);

  const realCount = films.length;

  const showArrows = realCount > slidesPerPage;

  const carouselWidth =
    slidesPerPage * CARD_WIDTH +
    (slidesPerPage - 1) * GAP +
    2 * NAV_BUTTON_WIDTH;

  // Recompute layout on container resize.
  // We measure outerRef.current.parentElement — the full-width section in Collections.tsx —
  // to avoid a feedback loop where measuring our own constrained width never escapes slidesPerPage=1.
  const updateLayout = useCallback(() => {
    const parent = outerEl?.parentElement;
    if (!parent) return;
    const containerPx = parent.offsetWidth;
    const next = getSlidesPerPage(containerPx);
    setSlidesPerPage((prev) => {
      if (prev === next) {
        setLayoutReady(true);
        return prev;
      }
      const startIndex = realCount > next ? next : 0;
      setCurrentIndex(startIndex);
      // Apply transform immediately to avoid a flash of wrong offset.
      // If trackRef is already mounted (resize case), apply directly.
      // If not (initial mount), store the index so useLayoutEffect can apply
      // it synchronously before the first paint when layoutReady becomes true.
      if (trackRef.current) {
        trackRef.current.style.transition = "none";
        trackRef.current.style.transform = `translateX(-${startIndex * (CARD_WIDTH + GAP)}px)`;
      } else {
        pendingInitialIndex.current = startIndex;
      }
      setLayoutReady(true);
      return next;
    });
  }, [outerEl]);

  useEffect(() => {
    const parent = outerEl?.parentElement;
    if (!parent) return;
    const observer = new ResizeObserver(updateLayout);
    observer.observe(parent);
    updateLayout();
    return () => observer.disconnect();
  }, [outerEl, updateLayout]);

  // Apply transform directly to avoid re-renders
  const applyTransform = useCallback(
    (index: number, durationMs: number = 300) => {
      if (!trackRef.current) {
        return;
      }
      const tx = index * (CARD_WIDTH + GAP);

      trackRef.current.style.transition =
        durationMs === 0 ? "none" : `transform ${durationMs}ms ease-in-out`;
      trackRef.current.style.transform = `translateX(-${tx}px)`;
    },
    [],
  );

  useEffect(() => {
    applyTransform(currentIndex, 300);
  }, [currentIndex, applyTransform]);

  // On initial mount, trackRef doesn't exist until layoutReady becomes true.
  // Apply the correct starting position instantly (no transition) before the
  // first paint so the user never sees carousel[0] sliding to carousel[1].
  useLayoutEffect(() => {
    if (!layoutReady || pendingInitialIndex.current === null) return;
    applyTransform(pendingInitialIndex.current, 0);
    pendingInitialIndex.current = null;
  }, [layoutReady, applyTransform]);

  // Clone slices: prepend last N, append first N (only when arrows are active)
  const prepend: UserFilm[] = showArrows ? films.slice(-slidesPerPage) : [];
  const append: UserFilm[] = showArrows ? films.slice(0, slidesPerPage) : [];
  const allSlides = showArrows ? [...prepend, ...films, ...append] : films;

  // Fill remaining slots up to slidesPerPage with empty placeholders
  const fillerCount = showArrows ? 0 : Math.max(0, slidesPerPage - realCount);

  const handleNext = useCallback(() => {
    if (isTransitioning || realCount === 0) return;
    setIsTransitioning(true);

    // Page sequence: spp, 2*spp, ..., floor(n/spp)*spp, realCount
    // The second-to-last page takes a partial step of `remainder` to land cleanly on
    // the last page (allSlides index = realCount), instead of overshooting into clones.
    const remainder = realCount % slidesPerPage;
    const step =
      remainder !== 0 &&
      currentIndex < realCount &&
      currentIndex + slidesPerPage > realCount
        ? remainder
        : slidesPerPage;

    const next = currentIndex + step;

    if (next >= realCount + slidesPerPage) {
      // Animate into appended clones, then instant-snap to the equivalent real position
      applyTransform(next, 300);
      setTimeout(() => {
        const snapTo = next - realCount;
        applyTransform(snapTo, 0);
        setCurrentIndex(snapTo);
        setIsTransitioning(false);
      }, 300);
    } else {
      setCurrentIndex(next);
      setTimeout(() => setIsTransitioning(false), 300);
    }
  }, [isTransitioning, realCount, currentIndex, slidesPerPage, applyTransform]);

  const handlePrev = useCallback(() => {
    if (isTransitioning || realCount === 0) return;
    setIsTransitioning(true);

    // Mirror of handleNext: the second page (index = spp + rem) steps back by `remainder`
    // to reach the first page cleanly. All other steps are full slidesPerPage.
    const remainder = realCount % slidesPerPage;
    const step =
      remainder !== 0 && currentIndex === slidesPerPage + remainder
        ? remainder
        : slidesPerPage;

    const prev = currentIndex - step;

    if (prev < slidesPerPage) {
      // Animate into prepended clones, then instant-snap to the equivalent real position
      applyTransform(prev, 300);
      setTimeout(() => {
        const snapTo = prev + realCount;
        applyTransform(snapTo, 0);
        setCurrentIndex(snapTo);
        setIsTransitioning(false);
      }, 300);
    } else {
      setCurrentIndex(prev);
      setTimeout(() => setIsTransitioning(false), 300);
    }
  }, [isTransitioning, realCount, currentIndex, slidesPerPage, applyTransform]);

  if (realCount === 0) return null;

  return (
    <>
      {!layoutReady && <LoadingPage variant="loading" />}
      <div
        ref={outerRef}
        style={{ width: layoutReady ? carouselWidth : 0 }}
        className="group/carousel relative hover:z-[50] flex flex-col gap-2"
      >
        {layoutReady && (
          <>
            <div
              className="flex justify-between"
              style={{
                paddingLeft: NAV_BUTTON_WIDTH,
                paddingRight: NAV_BUTTON_WIDTH,
              }}
            >
              <div className="page-subtitle">{title}</div>
              <div>{films.length} films</div>
            </div>

            <div className="relative">
              {/* Left nav panel — full-height masking panel with centered arrow */}
              <div
                onClick={showArrows ? handlePrev : undefined}
                className={`absolute left-0 top-0 h-full z-20 flex items-center justify-center transition-opacity duration-200 ${showArrows ? "opacity-100 cursor-pointer" : "opacity-0 cursor-default"}`}
                style={{ width: NAV_BUTTON_WIDTH }}
                aria-label="Previous"
                role="button"
              >
                {/* Left edge blur */}
                <div
                  className="pointer-events-none absolute left-0 top-0 h-full z-10 bg-linear-to-r from-white to-transparent"
                  style={{ width: NAV_BUTTON_WIDTH }}
                />
                <div className="absolute inset-0 bg-elevated  group-hover/carousel:opacity-0 transition-all duration-200 ease-out" />
                <button className="z-10 p-2 border-0 flex items-center justify-center rounded-full backdrop-blur-sm group-hover/carousel:backdrop-brightness-70 transition-all duration-200 ease-out hover:backdrop-brightness-50">
                  <ChevronLeft
                    size={24}
                    className="text-dark group-hover/carousel:text-white"
                  />
                </button>
              </div>

              {/* Overflow container — inset by nav button width so cards start/end at nav edges */}
              <div
                style={{
                  overflowX: "clip",
                  overflowY: "visible",
                  paddingLeft: NAV_BUTTON_WIDTH,
                  paddingRight: NAV_BUTTON_WIDTH,
                  position: "relative",
                }}
              >
                {/* Flex track */}
                <div ref={trackRef} className="flex gap-3">
                  {allSlides.map((film, idx) => (
                    <div key={`${film.id}-${idx}`} style={{ flexShrink: 0 }}>
                      <UserFilmCard
                        filmObject={film}
                        queryString={queryString}
                      />
                    </div>
                  ))}
                  {Array.from({ length: fillerCount }).map((_, idx) => (
                    <div
                      key={`filler-${idx}`}
                      className="filmCard-width md:aspect-16/10"
                      style={{ flexShrink: 0 }}
                    />
                  ))}
                </div>
              </div>

              {/* Right nav panel — full-height masking panel with centered arrow */}
              <div
                onClick={showArrows ? handleNext : undefined}
                className={`absolute right-0 top-0 h-full z-20 flex items-center justify-center transition-opacity duration-200 ${showArrows ? "opacity-100 cursor-pointer" : "opacity-0 cursor-default"}`}
                style={{ width: NAV_BUTTON_WIDTH }}
                aria-label="Next"
                role="button"
              >
                {/* Right edge blur */}
                <div className="pointer-events-none absolute w-[64px] right-0 top-0 h-full z-10 bg-linear-to-l from-white to-transparent" />
                <div className="absolute inset-0 bg-elevated transition-all duration-200 group-hover/carousel:opacity-0" />
                <button className="z-10 p-2 border-0 flex items-center justify-center rounded-full backdrop-blur-sm group-hover/carousel:backdrop-brightness-70 transition-all duration-200 ease-out hover:backdrop-brightness-50">
                  <ChevronRight
                    size={24}
                    className="text-dark group-hover/carousel:text-white"
                  />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
