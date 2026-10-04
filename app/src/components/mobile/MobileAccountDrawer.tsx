import { useNavigate } from "@tanstack/react-router"
import { useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/utils/authContext"
import { authClient, clearAuthToken } from "@/lib/authClient"
import { clearAllPersistedState } from "@/utils/localStorage"
import { getInitials } from "@/lib/utils"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui-shadcn/sheet"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui-shadcn/avatar"
import { LogIn, LogOut, Settings2 } from "lucide-react"
import { Separator } from "@/components/ui-shadcn/separator"

interface MobileAccountDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MobileAccountDrawer({
  open,
  onOpenChange,
}: MobileAccountDrawerProps) {
  const { authState } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const logOut = async () => {
    clearAllPersistedState()
    clearAuthToken()
    queryClient.clear()
    await authClient.signOut()
    onOpenChange(false)
    navigate({ to: "/login" })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-64 p-0" showCloseButton={false}>
        <SheetHeader className="sr-only">
          <SheetTitle>Account</SheetTitle>
          <SheetDescription>Account menu</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col h-full">
          {/* User info */}
          <div className="flex items-center gap-3 p-4">
            <Avatar className="h-10 w-10 rounded-lg">
              <AvatarImage
                src={authState.image ?? ""}
                alt={authState.username}
              />
              <AvatarFallback className="rounded-lg">
                {authState.status ? getInitials(authState.username) : "A"}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col text-sm leading-tight">
              <span className="font-medium">
                {authState.status ? authState.username : "Anonymous"}
              </span>
              {authState.email && (
                <span className="text-xs text-muted-foreground">
                  {authState.email}
                </span>
              )}
            </div>
          </div>

          <Separator />

          {/* Menu items */}
          <div className="flex flex-col py-2">
            {authState.status ? (
              <>
                <DrawerItem
                  icon={Settings2}
                  label="Settings"
                  onClick={() => {
                    onOpenChange(false)
                    navigate({ to: "/settings" })
                  }}
                />
                <DrawerItem icon={LogOut} label="Log out" onClick={logOut} />
              </>
            ) : (
              <DrawerItem
                icon={LogIn}
                label="Log in"
                onClick={() => {
                  onOpenChange(false)
                  navigate({ to: "/login" })
                }}
              />
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function DrawerItem({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Settings2
  label: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-surface-hover transition-colors text-left">
      <Icon className="size-4" />
      {label}
    </button>
  )
}
