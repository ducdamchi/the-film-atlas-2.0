import { ChevronRight, LibraryBig, BookOpen, Folder } from "lucide-react"
import { useAtom } from "jotai"
import { sidebarSectionsAtom } from "@/atoms/sidebarAtoms"
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
import { useCollections } from "@/hooks/useCollections"

export function NavCollections() {
  const collections = useCollections()
  const [sections, setSections] = useAtom(sidebarSectionsAtom)
  const isOpen = sections.collections ?? true

  return (
    <Collapsible
      asChild
      open={isOpen}
      onOpenChange={(open) =>
        setSections((prev) => ({ ...prev, collections: open }))
      }>
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
                    <SidebarMenuSubButton>
                      <Folder />
                      <span className="text-[16px] font-light">
                        {col.title}
                      </span>
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
