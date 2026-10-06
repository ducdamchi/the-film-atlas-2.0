import { Map, Search, LibraryBig, UserStar, CircleEllipsis } from "lucide-react"
import { useNavigate, useRouterState } from "@tanstack/react-router"
import { useApp } from "@/utils/appContext"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui-shadcn/dropdown-menu"
import { cn } from "@/lib/utils"

const MORE_ITEMS = [
  { title: "Docs", url: "/docs" },
  { title: "About", url: "/about" },
  { title: "Contact", url: "/contact" },
  { title: "Privacy", url: "/privacy" },
  { title: "Terms", url: "/terms" },
]

export function MobileBottomNav() {
  const navigate = useNavigate()
  const { setSearchModalOpen } = useApp()
  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  })

  const isActive = (path: string) => pathname.startsWith(path)

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-100 bg-sidebar border-sidebar-border md:hidden">
      <div className="flex items-center justify-around h-14">
        <NavButton
          icon={Map}
          label="Map"
          active={isActive("/map")}
          onClick={() => navigate({ to: "/map" })}
        />
        <NavButton
          icon={Search}
          label="Search"
          active={false}
          onClick={() => setSearchModalOpen(true)}
        />
        <NavButton
          icon={LibraryBig}
          label="Collections"
          active={isActive("/collections")}
          onClick={() => navigate({ to: "/collections" })}
        />
        <NavButton
          icon={UserStar}
          label="Directors"
          active={isActive("/directors")}
          onClick={() => navigate({ to: "/directors" })}
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors">
              <CircleEllipsis className="size-5" />
              <span className="text-[10px] leading-tight">More</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="end" className="z-[60] mb-1">
            {MORE_ITEMS.map((item) => (
              <DropdownMenuItem
                key={item.title}
                onClick={() => navigate({ to: item.url })}>
                {item.title}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  )
}

function NavButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: typeof Map
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 transition-colors",
        active
          ? "text-sidebar-accent-foreground"
          : "text-sidebar-foreground/60 hover:text-sidebar-foreground",
      )}>
      <Icon className="size-5" />
      <span className="text-[10px] leading-tight">{label}</span>
    </button>
  )
}
