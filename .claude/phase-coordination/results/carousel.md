# CollectionCarousel Results

## Summary

Created `CollectionCarousel.tsx` — an infinite-loop horizontal carousel rendering `UserFilmCard` components at their natural `filmCard-width` CSS-class width (22rem default, responsive via container queries). User-driven only; no autoplay.

## Files Changed

- **Created**: `client/src/components/collections/CollectionCarousel.tsx`

## Key Decisions

- **Transform via ref**: `trackRef.current.style.transform` is set directly (not via state) to avoid re-renders on every animation tick. `currentIndex` state drives logic; transform is a side-effect applied in `useEffect`.
- **ResizeObserver** on `containerRef` recomputes `slidesPerPage` whenever the container resizes. On layout change, `currentIndex` is reset to the new `slidesPerPage` (first real item).
- **cardRef** targets the wrapper `<div>` around the first real `UserFilmCard` (index `slidesPerPage` in the cloned `allSlides` array) to read `offsetWidth` for accurate card measurement including container-query-responsive sizing.
- **Snap-reset timing**: After a 300ms animated advance into the clone zone, a `setTimeout` fires `snapReset`, which uses two nested `requestAnimationFrame` calls with a 20ms `setTimeout` between them to reliably apply a 0ms transition jump before restoring the 300ms transition.
- **Overflow**: `overflowX: "hidden"` + `overflowY: "visible"` set as inline styles (not Tailwind utilities) because the two overflow axes must be set together to avoid the `overflow: hidden` shorthand collapsing the visible axis — preserving `CardHoverOverlay`'s slide-down panel below each card.
- **Clone count** equals `slidesPerPage` on both ends, which covers any partial final page by definition.
- **isTransitioning** guard blocks double-clicks during the 300ms animation window.

## Interfaces Exposed

```tsx
interface CollectionCarouselProps {
  films: UserFilm[];
  queryString: string | null;
}

export default function CollectionCarousel(props: CollectionCarouselProps): JSX.Element | null
```

Returns `null` when `films` is empty.
