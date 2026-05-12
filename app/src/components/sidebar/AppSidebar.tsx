import * as React from "react"
import { Settings2, Map, UserStar, CircleEllipsis } from "lucide-react"

import { NavMenuItem } from "#/components/sidebar/NavMain"
import { NavCollections } from "#/components/sidebar/NavCollections"
import { NavUser } from "#/components/sidebar/NavUser"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui-shadcn/sidebar"
import { Link } from "@tanstack/react-router"
import { useAuth } from "@/utils/authContext"
import { NavUserAnon } from "./NavUserAnon"

const MAP_NAV = { title: "Map", url: "/map", icon: Map }
const DIRECTORS_NAV = { title: "Directors", url: "/directors", icon: UserStar }
const MORE_NAV = {
  title: "More",
  url: "#",
  icon: CircleEllipsis,
  isActive: true,
  items: [
    { title: "Docs", url: "/docs" },
    { title: "About", url: "/about" },
    { title: "Contact", url: "/contact" },
  ],
}
// const SETTINGS_NAV = { title: "Settings", url: "/settings", icon: Settings2 }

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { authState } = useAuth()
  return (
    <Sidebar
      collapsible="icon"
      variant="sidebar"
      {...props}
      className="z-2000 border-foreground">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center">
            <SidebarMenuButton size="lg" asChild>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium text-base font-logo">
                  THE FILM ATLAS
                </span>
                <span className="truncate text-xs">
                  Discover. Share. Curate.
                </span>
              </div>
            </SidebarMenuButton>
            <SidebarTrigger />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <NavMenuItem item={MAP_NAV} />
            <NavCollections />
            <NavMenuItem item={DIRECTORS_NAV} />
            <NavMenuItem item={MORE_NAV} />
            {/* <NavMenuItem item={SETTINGS_NAV} /> */}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        {authState.status ? (
          <NavUser
            user={{
              name: authState.username,
              email: authState.email ?? "",
              avatar: "",
            }}
          />
        ) : (
          <NavUserAnon
            user={{
              name: "Anonymous User",
              email: "",
              avatar: "",
            }}
          />
        )}
      </SidebarFooter>
      {/* <SidebarRail /> */}
    </Sidebar>
  )
}
