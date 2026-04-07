import { ChevronLeft, ChevronRight } from "lucide-react";

interface CarouselNavPanelProps {
  direction: "left" | "right";
  showArrows: boolean;
  onClick?: () => void;
  width: number;
}

export default function CarouselNavPanel({
  direction,
  showArrows,
  onClick,
  width,
}: CarouselNavPanelProps) {
  const isLeft = direction === "left";

  return (
    <div
      onClick={showArrows ? onClick : undefined}
      className={`absolute ${isLeft ? "left-0" : "right-0"} top-0 h-full z-20 flex items-center justify-center transition-opacity duration-200 ${showArrows ? "opacity-100 cursor-pointer" : "opacity-0 cursor-default"}`}
      style={{ width }}
      aria-label={isLeft ? "Previous" : "Next"}
      role="button"
    >
      {/* Edge blur */}
      <div
        className={`pointer-events-none absolute ${isLeft ? "left-0" : "right-0"} top-0 h-full z-10 ${isLeft ? "bg-linear-to-r from-white to-transparent" : "bg-linear-to-l from-white to-transparent"}`}
        style={{ width }}
      />
      <div className="absolute inset-0 bg-elevated group-hover/carousel:opacity-0 transition-all duration-200 ease-out" />
      <button className="z-10 p-2 border-0 flex items-center justify-center rounded-full backdrop-blur-sm group-hover/carousel:backdrop-brightness-70 transition-all duration-200 ease-out hover:backdrop-brightness-50">
        {isLeft ? (
          <ChevronLeft
            size={24}
            className="text-dark group-hover/carousel:text-white"
          />
        ) : (
          <ChevronRight
            size={24}
            className="text-dark group-hover/carousel:text-white"
          />
        )}
      </button>
    </div>
  );
}
