import { Trash2, SquarePen } from "lucide-react";

interface CollectionActionsProps {
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function CollectionActions({
  onEdit,
  onDelete,
}: CollectionActionsProps) {
  return (
    <div className="flex items-center">
      <button
        className="text-xl text-dark hover:bg-control/50 transition-all ease-out duration-200 p-1 rounded-sm"
        aria-label="Edit"
        onClick={onEdit}
      >
        <SquarePen className="size-[18px]" />
      </button>
      <button
        className="text-xl text-red-600 hover:bg-red-600/20 transition-all ease-out duration-200 p-1 rounded-sm"
        aria-label="Delete"
        onClick={onDelete}
      >
        <Trash2 className="size-[18px]" />
      </button>
    </div>
  );
}
