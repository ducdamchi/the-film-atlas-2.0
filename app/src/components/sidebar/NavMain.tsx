import * as React from "react"
import { ChevronRight, type LucideIcon } from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui-shadcn/collapsible"
import {
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui-shadcn/sidebar"
import { Link } from "@tanstack/react-router"

export interface NavItem {
  title: string
  icon: LucideIcon
  shortcut?: React.ReactNode
  isActive?: boolean
  items?: { title: string; url: string }[]
}

export function NavMenuItem({
  item,
  onClick,
}: {
  item: NavItem
  onClick?: () => void
}) {
  return (
    <Collapsible asChild defaultOpen={item.isActive}>
      <SidebarMenuItem>
        <SidebarMenuButton tooltip={item.title} onClick={onClick}>
          <item.icon />
          <span className="text-[16px] font-light">{item.title}</span>
          {item.shortcut && (
            <span className="ml-auto flex items-center text-muted-foreground group-data-[collapsible=icon]:hidden">
              {item.shortcut}
            </span>
          )}
        </SidebarMenuButton>
        {item.items?.length ? (
          <>
            <CollapsibleTrigger asChild>
              <SidebarMenuAction className="data-[state=open]:rotate-90">
                <ChevronRight />
                <span className="sr-only">Toggle</span>
              </SidebarMenuAction>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub>
                {item.items.map((subItem) => (
                  <SidebarMenuSubItem key={subItem.title}>
                    <SidebarMenuSubButton asChild>
                      <Link to={subItem.url}>
                        <span className="text-[16px] font-light">
                          {subItem.title}
                        </span>
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                ))}
              </SidebarMenuSub>
            </CollapsibleContent>
          </>
        ) : null}
      </SidebarMenuItem>
    </Collapsible>
  )
}

export function NavMain({ items }: { items: NavItem[] }) {
  return (
    <>
      {items.map((item) => (
        <NavMenuItem key={item.title} item={item} />
      ))}
    </>
  )
}
