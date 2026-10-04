import { useRouterState } from "@tanstack/react-router"
import { useAuth } from "@/utils/authContext"
import { useScrollDirection } from "@/hooks/useScrollDirection"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui-shadcn/avatar"
import { getInitials } from "@/lib/utils"
import { cn } from "@/lib/utils"

function getPageTitle(pathname: string): string {
  if (pathname === "/map" || pathname.startsWith("/map/")) return "Map"
  if (pathname === "/collections" || pathname.startsWith("/collections/"))
    return "Your Collections"
  if (pathname === "/directors" || pathname.startsWith("/directors/"))
    return "Your Directors"
  if (pathname.startsWith("/films/")) return "Film"
  if (pathname === "/films") return "Films"
  if (pathname === "/settings") return "Settings"
  if (pathname === "/docs") return "Docs"
  if (pathname === "/about") return "About"
  if (pathname === "/contact") return "Contact"
  if (pathname === "/privacy") return "Privacy"
  if (pathname === "/terms") return "Terms"
  if (pathname === "/login") return "Login"
  if (pathname === "/register") return "Register"
  if (pathname.startsWith("/director/")) return "Director"
  if (pathname.startsWith("/actor/")) return "Actor"
  if (pathname === "/") return "Home"
  return ""
}

interface MobileTopHeaderProps {
  onAvatarClick: () => void
  drawerOpen?: boolean
}

export function MobileTopHeader({
  onAvatarClick,
  drawerOpen,
}: MobileTopHeaderProps) {
  const { authState } = useAuth()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const scrollDir = useScrollDirection()

  const pageTitle = getPageTitle(pathname)

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-100 bg-background/15 backdrop-blur-md text-foreground md:hidden",
        "h-12 flex items-center gap-3 px-4",
        "transition-transform duration-200",
        scrollDir === "down" || drawerOpen
          ? "-translate-y-full"
          : "translate-y-0",
      )}>
      <button onClick={onAvatarClick} className="shrink-0">
        <Avatar className="h-8 w-8 rounded-lg">
          <AvatarImage src={authState.image ?? ""} alt={authState.username} />
          <AvatarFallback className="rounded-lg text-xs">
            {authState.status ? getInitials(authState.username) : "A"}
          </AvatarFallback>
        </Avatar>
      </button>
      <span className="text-base font-semibold truncate">{pageTitle}</span>
    </header>
  )
}
