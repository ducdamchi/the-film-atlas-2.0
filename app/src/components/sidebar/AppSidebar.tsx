import * as React from "react"
import { Map, UserStar, CircleEllipsis, Search, Command } from "lucide-react"

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
  useSidebar,
} from "@/components/ui-shadcn/sidebar"
import { Link, useNavigate } from "@tanstack/react-router"
import { useAuth } from "@/utils/authContext"
import { NavUserAnon } from "./NavUserAnon"
import { useApp } from "@/utils/appContext"

const SEARCH_NAV = {
  title: "Search",
  icon: Search,
  shortcut: (
    <span className="text-[14px] flex items-center justify-center gap-0.5">
      <Command /> K
    </span>
  ),
}
const MAP_NAV = { title: "Map", icon: Map }
const DIRECTORS_NAV = { title: "Directors", icon: UserStar }
const MORE_NAV = {
  title: "More",
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
  const { state } = useSidebar()
  const { setSearchModalOpen } = useApp()
  const navigate = useNavigate()
  return (
    <Sidebar
      collapsible="icon"
      variant="sidebar"
      {...props}
      className="z-2000 border-foreground">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center justify-center pl-0">
            <SidebarMenuButton size="lg" asChild className="">
              <Link
                to="/about"
                className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium text-base font-logo">
                  <span className="group-data-[collapsible=icon]:hidden uppercase">
                    The Film Atlas
                  </span>
                  <span className="hidden group-data-[collapsible=icon]:flex pl-1">
                    TFA
                  </span>
                </span>
                <span className="truncate text-sm font-thin group-data-[collapsible=icon]:hidden">
                  Discover. Share. Curate.
                </span>
              </Link>
            </SidebarMenuButton>
            {state === "expanded" && <SidebarTrigger className="ml-auto" />}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <NavMenuItem
              item={SEARCH_NAV}
              onClick={() => setSearchModalOpen(true)}
            />
            <NavMenuItem
              item={MAP_NAV}
              onClick={() => navigate({ to: "/map" })}
            />
            <NavCollections />
            <NavMenuItem
              item={DIRECTORS_NAV}
              onClick={() => navigate({ to: "/directors" })}
            />
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
