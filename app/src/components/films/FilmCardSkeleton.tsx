import SkeletonBlock from "../ui-custom/SkeletonBlock"

export default function FilmCardSkeleton() {
  return (
    <div className="filmCard-width md:aspect-16/10 flex flex-col justify-center items-center rounded-none relative border-1 md:border-0 overflow-hidden">
      {/* Poster area */}
      <div className="relative w-full h-full bg-muted-foreground/20 animate-pulse" />

      {/* Bottom overlay — mirrors the gradient text area on real cards */}
      <div className="absolute bottom-0 left-0 w-full p-3 bg-gradient-to-t from-foreground/20 to-transparent flex justify-between items-end gap-2">
        {/* Left: title + subtitle bars */}
        <div className="flex flex-col gap-1 ml-1 min-w-0 flex-1">
          <SkeletonBlock className="h-4 w-3/4 rounded bg-muted-foreground/20" />
          {/* <div className="h-4 w-3/4 rounded bg-muted-foreground/20" /> */}
          <div className="flex gap-1">
            <SkeletonBlock className="h-3 w-1/4 rounded bg-muted-foreground/20" />
            <SkeletonBlock className="h-3 w-1/4 rounded bg-muted-foreground/20" />
          </div>
        </div>
        {/* Right: small stat bars */}
        <div className="flex items-center gap-2 shrink-0 mr-1">
          <SkeletonBlock className="h-9 aspect-square rounded-full bg-muted-foreground/20" />
        </div>
      </div>
    </div>
  )
}
