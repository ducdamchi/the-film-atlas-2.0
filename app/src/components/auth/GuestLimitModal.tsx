import { useAtom } from "jotai"
import { useNavigate } from "@tanstack/react-router"
import { guestLimitModalOpenAtom } from "@/atoms/guestAtoms"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui-shadcn/alert-dialog"
import { GUEST_FILM_LIMIT } from "@/utils/guestStore"

export function GuestLimitModal() {
  const [open, setOpen] = useAtom(guestLimitModalOpenAtom)
  const navigate = useNavigate()

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>You've hit {GUEST_FILM_LIMIT} films</AlertDialogTitle>
          <AlertDialogDescription>
            Create a free account to keep tracking films, rate them, and sync
            your data across devices.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Maybe later</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              setOpen(false)
              navigate({ to: "/register" })
            }}>
            Sign up
          </AlertDialogAction>
          <AlertDialogAction
            variant="outline"
            onClick={() => {
              setOpen(false)
              navigate({ to: "/login" })
            }}>
            Log in
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
