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
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/utils/authContext"
import { collectionsQueryOptions } from "@/queries/collections.queries"
import type { AppCollection } from "@/types/api"

function collectionUrl(col: AppCollection): string {
  if (col.collection_type === "watched") return "/collections?q=watched"
  if (col.collection_type === "watchlist") return "/collections?q=watchlisted"
  return `/collections/${col.id}`
}

export function NavCollections() {
  const { authState } = useAuth()
  const { data: collections = [] } = useQuery({
    ...collectionsQueryOptions,
    enabled: !!authState.status,
  })

  return (
    <Collapsible asChild defaultOpen>
      <SidebarMenuItem>
        <SidebarMenuButton asChild tooltip="Collections">
          <Link to="/collections">
            <LibraryBig />
            <span>Collections</span>
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
                        <span>{col.title}</span>
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
