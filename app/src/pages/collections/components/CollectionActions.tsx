import { Trash2, Image, EllipsisVertical } from "lucide-react"
import {
  MdLock,
  MdPublic,
  MdBookmark,
  MdBookmarkBorder,
  MdLibraryAdd,
} from "react-icons/md"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui-shadcn/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui-shadcn/dropdown-menu"

interface CollectionActionsProps {
  name: string
  isPublic: boolean
  isPinned: boolean
  isSystemCollection: boolean
  onAdd?: () => void
  onEdit?: () => void
  onDelete?: () => Promise<void>
  onTogglePin?: () => Promise<void>
  onToggleVisibility?: () => Promise<void>
}

export default function CollectionActions({
  name,
  isPublic,
  isPinned,
  isSystemCollection,
  onAdd,
  onEdit,
  onDelete,
  onTogglePin,
  onToggleVisibility,
}: CollectionActionsProps) {
  function handleDelete() {
    onDelete?.()
      .then(() => toast.success("Collection Deleted"))
      .catch(() => toast.error("Failed to delete collection"))
  }

  function handleTogglePin() {
    onTogglePin?.()
      .then(() =>
        toast.success(isPinned ? "Collection Unpinned" : "Collection Pinned"),
      )
      .catch(() => toast.error("Failed to update pin"))
  }

  function handleToggleVisibility() {
    onToggleVisibility?.()
      .then(() =>
        toast.success(
          isPublic ? "Collection set to Private" : "Collection set to Public",
        ),
      )
      .catch(() => toast.error("Failed to update visibility"))
  }

  return (
    <div className="flex items-center gap-0">
      <button
        className="text-xl text-dark hover:bg-muted/50 transition-all ease-out duration-200 p-0.5 rounded-sm"
        aria-label="Add films"
        title="Add films"
        onClick={onAdd}>
        <MdLibraryAdd className="size-[22px]" />
      </button>
      <button
        className="text-xl text-dark hover:bg-muted/50 transition-all ease-out duration-200 p-0.5 rounded-sm"
        aria-label={isPublic ? "Make Private" : "Make Public"}
        title={isPublic ? "Make Private" : "Make Public"}
        onClick={handleToggleVisibility}>
        {isPublic ? (
          <MdPublic className="size-[22px] text-saved" />
        ) : (
          <MdLock className="size-[22px] text-red-700" />
        )}
      </button>
      <button
        className="text-xl text-dark hover:bg-muted/50 transition-all ease-out duration-200 p-0.5 rounded-sm"
        aria-label={isPinned ? "Unpin" : "Pin"}
        title={isPinned ? "Unpin" : "Pin"}
        onClick={handleTogglePin}>
        {isPinned ? (
          <MdBookmark className={`size-[22px] text-saved`} />
        ) : (
          <MdBookmarkBorder className={`size-[22px] `} />
        )}
      </button>

      <AlertDialog>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="text-xl text-dark hover:bg-muted/50 transition-all ease-out duration-200 p-0.5 rounded-sm"
              aria-label="More options"
              title="More options">
              <EllipsisVertical className="size-[22px]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit} className="focus:bg-gray-600/10">
              <Image className="size-4" />
              Edit cover
            </DropdownMenuItem>
            {!isSystemCollection && (
              <AlertDialogTrigger asChild>
                <DropdownMenuItem className="text-red-700 focus:text-red-700 focus:bg-red-600/10">
                  <Trash2 className="size-4" />
                  Delete
                </DropdownMenuItem>
              </AlertDialogTrigger>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        {!isSystemCollection && (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Collection</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{name}" collection? This action
                cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-700 hover:bg-red-800"
                onClick={handleDelete}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>
    </div>
  )
}
