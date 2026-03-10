# MapPage Patterns and Decomposition Notes

## Identified Extraction Targets (2026-03-10)

### Hooks
1. `useMapFilmData` — owns: `mapFilmData`, `filmsPerCountryData`, the initial fetch from app DB, and the country-bucketing effect
2. `useDiscoverFilms` — owns: all discover-mode state (suggestedFilmList, page, discoverBy, ratingRange, voteCountRange, tempRanges, discoverTotalResults, calibratedCountryRef, lastFetchParamsRef, autoAdjustedRef, RATING_STEPS, RANDOM_BATCH_SIZE), plus the 4 discover effects (getSuggestions, fetchNewPage, adaptive rating, loadMore intersection observer)
3. `useUserFilms` — owns: `userFilmList`, the fetchFilmsByCountry effect
4. `useBottomSheet` — owns: `belowMapRef`, `showBelowMapContent`, `isDragEndRef`, `mapContainerRef`, `isXlBreakpoint`, `screenWidth`, `getSnapPositions`, `onDragHandlePointerDown`, and the snap animation effect
5. `useMapInteraction` — owns: `mapRef`, `firstSymbolId`, `isMapLoaded`, `setFeatureStates`, `onData`, `onMapLoad`, `onMapClick`, and the cleanup effect

### Components
1. `MapControls` (inside `<Map>`) — the `<Source>` + two `<Layer>`s + `<NavigationControl>` (static, no state needed, just receives `firstSymbolId` as prop)
2. `MapPopup` — the `<Popup>` JSX block (receives `popupInfo` and `setPopupInfo` as props)
3. `DiscoverControls` — the discover-mode filter panel: Sort By toggle + the dual slider filter box (receives discoverBy/setDiscoverBy, ratingRange, voteCountRange, tempRanges, setters as props)
4. `MyFilmsControls` — the My Films filter panel: Filter toggle + Sort By/Order toggles + Rating toggle (receives queryString, sortBy, sortDirection, numStars and their setters as props)
5. `BelowMapPanel` — the entire draggable sheet below the map (receives all sheet state + content props), OR keep the sheet wrapper in MapPage and only extract the controls

### Where each should live
- Hooks: `client/src/Hooks/`
- MapControls, MapPopup: `client/src/Components/Map/` (new subfolder)
- DiscoverControls, MyFilmsControls: `client/src/Components/Map/`
- BelowMapPanel: `client/src/Components/Map/`

## Anti-patterns noted
- MAPTILER_API_KEY hardcoded inline in MapPage (also duplicated in the style URL string)
- Duplicate `id="countriesLayer"` on both `<Layer>` elements (fill + symbol) — existing bug, not a structure issue
- Scroll restoration logic is self-contained and could become `useScrollRestoration` but is simple enough to stay inline for now
