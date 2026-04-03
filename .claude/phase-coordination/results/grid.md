# CollectionGrid Results

## Summary
Created `CollectionGrid.tsx` — a constrained scrollable grid component that renders a flat list of `UserFilmCard` components inside a `max-h-[50vh]` overflow container, allowing two collections to remain simultaneously visible on the page.

## Files Changed
- **Created**: `client/src/components/collections/CollectionGrid.tsx`

## Key Decisions
- Outer wrapper uses `@container` so the existing `.filmGallery-grid` container queries (`@3xl`, `@5xl`, `@7xl` breakpoints) respond to the component's own width, not the viewport.
- The scroll container is `relative` to serve as the positioning context for the sticky fade overlay.
- The bottom fade overlay uses `position: sticky; bottom: 0` via Tailwind `sticky bottom-0`, is `h-12` (3rem), and carries `pointer-events-none` so it does not block clicks on cards near the bottom.
- `queryString` prop is typed `string | null` to match `UserFilmCard`'s expected prop signature (which accepts null for non-DB results).
- No wrapper `div` around individual `UserFilmCard` items — cards render directly inside the grid as specified.
- Color tokens only: `from-elevated`, `scrollbar-thumb-control` — no raw color values in JSX.

## Interfaces Exposed
```tsx
interface CollectionGridProps {
  films: UserFilm[]       // flat list, no grouping — caller is responsible for ordering
  queryString: string | null  // passed through to each UserFilmCard unchanged
}
```
