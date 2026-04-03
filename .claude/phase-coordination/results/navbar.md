# Navbar Results

## Summary

Added a `COLLECTIONS` navigation link to both navbar components, positioned between `DIRECTORS` and the `INFO` dropdown/button.

- Desktop: inserted `<CustomLink to="/collections" exact={false}>COLLECTIONS</CustomLink>` inside the `<ul>` in `NavBarDesktopSection.tsx`, after `DIRECTORS` and before the `<div className="relative" ref={infoDropdownRef}>` INFO block.
- Mobile: inserted `<CustomLink to="/collections" exact={false} onClick={closeAll}>COLLECTIONS</CustomLink>` inside the `<ul>` in `NavBarMobileSection.tsx`, after `DIRECTORS` and before the INFO dropdown `<div>`, matching the `onClick={closeAll}` pattern used by MAP, FILMS, and DIRECTORS.

## Files Changed

- `client/src/components/layout/navbar/NavBarDesktopSection.tsx`
- `client/src/components/layout/navbar/NavBarMobileSection.tsx`
