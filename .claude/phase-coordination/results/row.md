# CollectionRow Results

## Summary

Created `CollectionRow.tsx` — a collapsible row component that owns expand/collapse state and switches between `CollectionCarousel` (collapsed, default) and `CollectionGrid` (expanded).

## Files Changed

- **Created**: `client/src/components/collections/CollectionRow.tsx`

## Key Decisions

- Default state is `isExpanded = false` (carousel view), matching the spec.
- Toggle button icon: `LayoutGrid` when collapsed (click to expand), `GalleryHorizontal` when expanded (click to collapse). Icons communicate the action that will happen on click.
- Film count badge uses `text-label text-sm` classes matching the project's color token convention.
- `page-subtitle` CSS class applied to the title as specified (defined in styles.css via `@apply font-bold text-base @3xl:text-xl @5xl:text-2xl w-auto`).
- Header padding follows the `px-4 md:px-8` pattern consistent with other collection components.
- No raw color values — all styling uses Tailwind color tokens (`bg-control`, `text-dark`, `text-label`, `border-control`, `bg-dark/10`).

## Interfaces Exposed

```tsx
interface Collection {
  title: string
  films: UserFilm[]
  queryString: string | null
}

interface CollectionRowProps {
  collection: Collection
}

export default function CollectionRow({ collection }: CollectionRowProps)
```
