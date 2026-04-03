# Collections Page Results

## Summary

Created the Collections page component and its TanStack Router route file. The page fetches the user's watched and watchlisted films in parallel on mount (when logged in) and renders them as `CollectionRow` sections. Unauthenticated users see a login prompt.

## Files Changed

- `client/src/routes/collections.tsx` — new file, mirrors `directors.tsx` route pattern exactly
- `client/src/components/Collections.tsx` — new page component

## Key Decisions

- Auth gate uses `authState.status !== "loggedIn"` (string comparison), matching the `AuthContextValue` type shape confirmed in `authContext.tsx`.
- `fetchListByParams` is imported from `@/utils/apiCalls` (`.ts` extension, not `.tsx` as listed in spec — corrected after checking actual filename).
- No `searchInput` filtering is wired to the data — the `SearchBar` captures input but collection filtering is left as a future concern, consistent with the spec which only specifies the state and UI slot.
- Color tokens only — no raw color values in JSX.
- `CollectionRow` receives `queryString` as `string | null` per its `Collection` interface (confirmed from `CollectionRow.tsx`).
