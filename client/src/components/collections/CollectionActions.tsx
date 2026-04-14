import {
  Trash2,
  SquarePen,
  Globe,
  Lock,
  ImagePlus,
  Pin,
  PinOff,
  Plus,
} from "lucide-react";
import { TiPin, TiPinOutline } from "react-icons/ti";
import { toast } from "sonner";
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
} from "@/components/ui/alert-dialog";

interface CollectionActionsProps {
  name: string;
  isPublic: boolean;
  isPinned: boolean;
  isSystemCollection: boolean;
  onAdd?: () => void;
  onEdit?: () => void;
  onDelete?: () => Promise<void>;
  onTogglePin?: () => Promise<void>;
  onToggleVisibility?: () => Promise<void>;
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
      .catch(() => toast.error("Failed to delete collection"));
  }

  function handleTogglePin() {
    onTogglePin?.()
      .then(() =>
        toast.success(isPinned ? "Collection Unpinned" : "Collection Pinned"),
      )
      .catch(() => toast.error("Failed to update pin"));
  }

  function handleToggleVisibility() {
    onToggleVisibility?.()
      .then(() =>
        toast.success(
          isPublic ? "Collection set to Private" : "Collection set to Public",
        ),
      )
      .catch(() => toast.error("Failed to update visibility"));
  }

  return (
    <div className="flex items-center gap-0">
      <button
        className="text-xl text-dark hover:bg-control/50 transition-all ease-out duration-200 p-0.5 rounded-sm"
        aria-label="Add films"
        title="Add films"
        onClick={onAdd}
      >
        <Plus className="size-[18px]" />
      </button>
      <button
        className="text-xl text-dark hover:bg-control/50 transition-all ease-out duration-200 p-0.5 rounded-sm"
        aria-label={isPublic ? "Make Private" : "Make Public"}
        title={isPublic ? "Make Private" : "Make Public"}
        onClick={handleToggleVisibility}
      >
        {isPublic ? (
          <Globe className="size-[18px] text-saved" />
        ) : (
          <Lock className="size-[18px] text-red-700" />
        )}
      </button>
      <button
        className="text-xl text-dark hover:bg-control/50 transition-all ease-out duration-200 p-0.5 rounded-sm"
        aria-label={isPinned ? "Unpin" : "Pin"}
        title={isPinned ? "Unpin" : "Pin"}
        onClick={handleTogglePin}
      >
        {isPinned ? (
          <Pin className={`size-[18px] text-saved`} />
        ) : (
          <PinOff className={`size-[18px] `} />
        )}
      </button>
      {!isSystemCollection && (
        <>
          <button
            className="text-xl text-dark hover:bg-control/50 transition-all ease-out duration-200 p-0.5 rounded-sm"
            aria-label="Edit"
            title="Edit"
            onClick={onEdit}
          >
            <ImagePlus className="size-[18px]" />
          </button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                className="text-xl text-red-700 hover:bg-red-600/20 transition-all ease-out duration-200 p-0.5 rounded-sm"
                aria-label="Delete"
                title="Delete"
              >
                <Trash2 className="size-[18px]" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Collection</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete "{name}" collection? This
                  action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-700 hover:bg-red-800"
                  onClick={handleDelete}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
}
