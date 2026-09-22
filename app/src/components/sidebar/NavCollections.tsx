import { ChevronRight, LibraryBig, BookOpen, Folder } from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui-shadcn/collapsible"
import {
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarMenuAction,
} from "@/components/ui-shadcn/sidebar"
import { Link } from "@tanstack/react-router"
import { useCollections, type CollectionData } from "@/hooks/useCollections"

function collectionUrl(col: CollectionData): string {
  if (col.collectionType === "watched") return "/collections?q=watched"
  if (col.collectionType === "watchlist") return "/collections?q=watchlisted"
  return `/collections/${col.id}`
}

export function NavCollections() {
  const collections = useCollections()

  return (
    <Collapsible asChild defaultOpen>
      <SidebarMenuItem>
        <SidebarMenuButton asChild tooltip="Collections">
          <Link to="/collections">
            <LibraryBig />
            <span className="text-[16px] font-light">Collections</span>
          </Link>
        </SidebarMenuButton>
        {collections.length > 0 && (
          <>
            <CollapsibleTrigger asChild>
              <SidebarMenuAction className="data-[state=open]:rotate-90">
                <ChevronRight />
                <span className="sr-only">Toggle</span>
              </SidebarMenuAction>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub>
                {collections.map((col) => (
                  <SidebarMenuSubItem key={col.id}>
                    <SidebarMenuSubButton asChild>
                      <Link to={collectionUrl(col)}>
                        <Folder />
                        <span className="text-[16px] font-light">
                          {col.title}
                        </span>
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                ))}
              </SidebarMenuSub>
            </CollapsibleContent>
          </>
        )}
      </SidebarMenuItem>
    </Collapsible>
  )
}
