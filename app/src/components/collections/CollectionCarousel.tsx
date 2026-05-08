import {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
} from "react"

import UserFilmCard from "../films/UserFilmCard"
import LoadingPage from "../layout/LoadingPage"
import CollectionHeader from "./CollectionHeader"
import CarouselNavPanel from "./CarouselNavPanel"
import CollectionSearchModal from "../search/CollectionSearchModal"
import CollectionFooter from "./CollectionFooter"
import type { UserFilm } from "@/types/film"
import type { CollectionData } from "@/hooks/useCollections"
import { deleteCollectionFn } from "@/server/collections"
import { CirclePlus } from "lucide-react"

interface CollectionCarouselProps {
  collection: CollectionData
  onDelete?: (id: string) => void
  onTogglePin?: (id: string) => Promise<void>
  onToggleVisibility?: (id: string) => Promise<void>
  onRename?: (id: string, newTitle: string) => Promise<void>
  onUpdateDescription?: (id: string, newDescription: string) => Promise<void>
  onFilmAdded?: (collectionId: string, film: UserFilm) => void
  onFilmRemoved?: (collectionId: string, filmId: number) => void
  counterpartCollection?: CollectionData
  onCounterpartFilmRemoved?: (filmId: number) => void
}

const CARD_WIDTH = 352 // 22rem — fixed, matches .filmGallery-grid
const NAV_BUTTON_WIDTH = 64
const GAP = 12

function getSlidesPerPage(containerPx: number): number {
  if (containerPx < 958) return 1 //48rem + 10rem
  if (containerPx < 1312) return 2 //72rem + 10rem
  if (containerPx < 1969) return 3 //100rem + 10rem
  return 4
}

export default function CollectionCarousel({
  collection,
  onDelete,
  onTogglePin,
  onToggleVisibility,
  onRename,
  onUpdateDescription,
  onFilmAdded,
  onFilmRemoved,
  counterpartCollection,
  onCounterpartFilmRemoved,
}: CollectionCarouselProps) {
  const { films, queryString, ...collectionHeaderProps } = collection
  const { id, collectionType = "standard" } = collectionHeaderProps
  const isSystemCollection =
    collectionType === "watched" || collectionType === "watchlist"
  const [outerEl, setOuterEl] = useState<HTMLDivElement | null>(null)
  const outerRef = useCallback(
    (node: HTMLDivElement | null) => setOuterEl(node),
    [],
  )
  const trackRef = useRef<HTMLDivElement>(null)

  const [slidesPerPage, setSlidesPerPage] = useState(1)
  const [layoutReady, setLayoutReady] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const pendingInitialIndex = useRef<number | null>(null)

  const realCount = films.length

  const showArrows = realCount > slidesPerPage

  const carouselWidth =
    slidesPerPage * CARD_WIDTH +
    (slidesPerPage - 1) * GAP +
    2 * NAV_BUTTON_WIDTH

  // Recompute layout on container resize.
  // We measure outerRef.current.parentElement — the full-width section in Collections.tsx —
  // to avoid a feedback loop where measuring our own constrained width never escapes slidesPerPage=1.
  const updateLayout = useCallback(() => {
    const parent = outerEl?.parentElement
    if (!parent) return
    const containerPx = parent.offsetWidth
    const next = getSlidesPerPage(containerPx)
    setSlidesPerPage((prev) => {
      if (prev === next) {
        setLayoutReady(true)
        return prev
      }
      const startIndex = realCount > next ? next : 0
      setCurrentIndex(startIndex)
      // Apply transform immediately to avoid a flash of wrong offset.
      // If trackRef is already mounted (resize case), apply directly.
      // If not (initial mount), store the index so useLayoutEffect can apply
      // it synchronously before the first paint when layoutReady becomes true.
      if (trackRef.current) {
        trackRef.current.style.transition = "none"
        trackRef.current.style.transform = `translateX(-${startIndex * (CARD_WIDTH + GAP)}px)`
      } else {
        pendingInitialIndex.current = startIndex
      }
      setLayoutReady(true)
      return next
    })
  }, [outerEl])

  useEffect(() => {
    const parent = outerEl?.parentElement
    if (!parent) return
    const observer = new ResizeObserver(updateLayout)
    observer.observe(parent)
    updateLayout()
    return () => observer.disconnect()
  }, [outerEl, updateLayout])

  // Apply transform directly to avoid re-renders
  const applyTransform = useCallback(
    (index: number, durationMs: number = 300) => {
      if (!trackRef.current) {
        return
      }
      const tx = index * (CARD_WIDTH + GAP)

      trackRef.current.style.transition =
        durationMs === 0 ? "none" : `transform ${durationMs}ms ease-in-out`
      trackRef.current.style.transform = `translateX(-${tx}px)`
    },
    [],
  )

  useEffect(() => {
    applyTransform(currentIndex, 300)
  }, [currentIndex, applyTransform])

  // When realCount crosses the slidesPerPage boundary, showArrows flips.
  // Entering clone mode (false→true): index 0 now points at prepended clones; snap to slidesPerPage.
  // Leaving clone mode (true→false): clones are gone; reset to 0.
  const prevShowArrowsRef = useRef(showArrows)
  useEffect(() => {
    const wasShowing = prevShowArrowsRef.current
    prevShowArrowsRef.current = showArrows

    if (!wasShowing && showArrows) {
      setCurrentIndex(slidesPerPage)
      applyTransform(slidesPerPage, 0)
    } else if (wasShowing && !showArrows) {
      setCurrentIndex(0)
      applyTransform(0, 0)
    }
  }, [showArrows, slidesPerPage, applyTransform])

  // When a film is added or removed while already in arrow mode (both before and after the change),
  // animate back to the first real index. Boundary crossings (showArrows flipping) are handled
  // separately by the prevShowArrowsRef effect above.
  const prevRealCountRef = useRef(realCount)
  useEffect(() => {
    const prevCount = prevRealCountRef.current
    prevRealCountRef.current = realCount

    if (
      realCount !== prevCount &&
      prevCount > slidesPerPage &&
      realCount > slidesPerPage &&
      currentIndex !== slidesPerPage
    ) {
      setCurrentIndex(slidesPerPage)
      applyTransform(slidesPerPage, 300)
    }
  }, [realCount, slidesPerPage, currentIndex, applyTransform])

  // On initial mount, trackRef doesn't exist until layoutReady becomes true.
  // Apply the correct starting position instantly (no transition) before the
  // first paint so the user never sees carousel[0] sliding to carousel[1].
  useLayoutEffect(() => {
    if (!layoutReady || pendingInitialIndex.current === null) return
    applyTransform(pendingInitialIndex.current, 0)
    pendingInitialIndex.current = null
  }, [layoutReady, applyTransform])

  // Clone slices: prepend last N, append first N (only when arrows are active)
  const prepend: UserFilm[] = showArrows ? films.slice(-slidesPerPage) : []
  const append: UserFilm[] = showArrows ? films.slice(0, slidesPerPage) : []
  const allSlides = showArrows ? [...prepend, ...films, ...append] : films

  // Fill remaining slots up to slidesPerPage with empty placeholders
  const fillerCount = showArrows ? 0 : Math.max(0, slidesPerPage - realCount)

  const handleNext = useCallback(() => {
    if (isTransitioning || realCount === 0) return
    setIsTransitioning(true)

    // Page sequence: spp, 2*spp, ..., floor(n/spp)*spp, realCount
    // The second-to-last page takes a partial step of `remainder` to land cleanly on
    // the last page (allSlides index = realCount), instead of overshooting into clones.
    const remainder = realCount % slidesPerPage
    const step =
      remainder !== 0 &&
      currentIndex < realCount &&
      currentIndex + slidesPerPage > realCount
        ? remainder
        : slidesPerPage

    const next = currentIndex + step

    if (next >= realCount + slidesPerPage) {
      // Animate into appended clones, then instant-snap to the equivalent real position
      applyTransform(next, 300)
      setTimeout(() => {
        const snapTo = next - realCount
        applyTransform(snapTo, 0)
        setCurrentIndex(snapTo)
        setIsTransitioning(false)
      }, 300)
    } else {
      setCurrentIndex(next)
      setTimeout(() => setIsTransitioning(false), 300)
    }
  }, [isTransitioning, realCount, currentIndex, slidesPerPage, applyTransform])

  const handlePrev = useCallback(() => {
    if (isTransitioning || realCount === 0) return
    setIsTransitioning(true)

    // Mirror of handleNext: the second page (index = spp + rem) steps back by `remainder`
    // to reach the first page cleanly. All other steps are full slidesPerPage.
    const remainder = realCount % slidesPerPage
    const step =
      remainder !== 0 && currentIndex === slidesPerPage + remainder
        ? remainder
        : slidesPerPage

    const prev = currentIndex - step

    if (prev < slidesPerPage) {
      // Animate into prepended clones, then instant-snap to the equivalent real position
      applyTransform(prev, 300)
      setTimeout(() => {
        const snapTo = prev + realCount
        applyTransform(snapTo, 0)
        setCurrentIndex(snapTo)
        setIsTransitioning(false)
      }, 300)
    } else {
      setCurrentIndex(prev)
      setTimeout(() => setIsTransitioning(false), 300)
    }
  }, [isTransitioning, realCount, currentIndex, slidesPerPage, applyTransform])

  const innerWidth = slidesPerPage * CARD_WIDTH + (slidesPerPage - 1) * GAP
  const innerHeight = (CARD_WIDTH / 16) * 10

  return (
    <>
      {!layoutReady && realCount > 0 && <LoadingPage variant="loading" />}
      <div
        ref={outerRef}
        style={{ width: layoutReady ? carouselWidth : 0 }}
        className={`flex flex-col gap-3 ${realCount > 0 ? " group/carousel relative hover:z-[50]" : ""}`}>
        {layoutReady && (
          <>
            <CollectionHeader
              {...collectionHeaderProps}
              filmCount={realCount}
              isSystemCollection={isSystemCollection}
              navButtonWidth={NAV_BUTTON_WIDTH}
              onAdd={() => setIsAddModalOpen(true)}
              onDelete={() =>
                deleteCollectionFn({ data: id }).then(() => {
                  onDelete?.(id)
                })
              }
              onTogglePin={onTogglePin ? () => onTogglePin(id) : undefined}
              onToggleVisibility={
                onToggleVisibility ? () => onToggleVisibility(id) : undefined
              }
              onRename={
                onRename ? (newTitle) => onRename(id, newTitle) : undefined
              }
            />

            {realCount === 0 ? (
              <div
                className="relative"
                style={{
                  paddingLeft: NAV_BUTTON_WIDTH,
                  paddingRight: NAV_BUTTON_WIDTH,
                }}>
                <button
                  style={{ width: innerWidth, height: innerHeight }}
                  className="flex items-center justify-center border-1 border-muted/40 bg-muted/40 rounded-md hover:bg-muted transition-all ease-out duration-200"
                  onClick={() => setIsAddModalOpen(true)}>
                  <span className="text-base text-muted flex items-center justify-center gap-1">
                    <CirclePlus className="size-[24px]" />
                    Add films
                  </span>
                </button>
              </div>
            ) : (
              <div className="relative">
                <CarouselNavPanel
                  direction="left"
                  showArrows={showArrows}
                  onClick={handlePrev}
                  width={NAV_BUTTON_WIDTH}
                />

                {/* Overflow container — inset by nav button width so cards start/end at nav edges */}
                <div
                  style={{
                    overflowX: "clip",
                    overflowY: "visible",
                    paddingLeft: NAV_BUTTON_WIDTH,
                    paddingRight: NAV_BUTTON_WIDTH,
                    position: "relative",
                  }}>
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

                <CarouselNavPanel
                  direction="right"
                  showArrows={showArrows}
                  onClick={handleNext}
                  width={NAV_BUTTON_WIDTH}
                />
              </div>
            )}
            <CollectionFooter
              description={collectionHeaderProps.description}
              isSystemCollection={isSystemCollection}
              navButtonWidth={NAV_BUTTON_WIDTH}
              onUpdateDescription={
                onUpdateDescription
                  ? (newDesc) => onUpdateDescription(id, newDesc)
                  : undefined
              }
            />
          </>
        )}
      </div>

      {isAddModalOpen && (
        <CollectionSearchModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          collection={collection}
          onFilmAdded={(film) => onFilmAdded?.(id, film)}
          onFilmRemoved={(filmId) => onFilmRemoved?.(id, filmId)}
          counterpartCollection={counterpartCollection}
          onCounterpartFilmRemoved={onCounterpartFilmRemoved}
        />
      )}
    </>
  )
}
