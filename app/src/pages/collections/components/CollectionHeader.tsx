import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import type { CollectionData } from "@/hooks/useCollections";
import CollectionActions from "./CollectionActions";

export interface CollectionHeaderProps extends Omit<
  CollectionData,
  "films" | "queryString"
> {
  filmCount: number;
  isSystemCollection: boolean;
  navButtonWidth: number;
  onAdd?: () => void;
  onEdit?: () => void;
  onDelete?: () => Promise<void>;
  onTogglePin?: () => Promise<void>;
  onToggleVisibility?: () => Promise<void>;
  onRename?: (newTitle: string) => Promise<void>;
}

export default function CollectionHeader({
  title,
  filmCount,
  isPublic,
  totalRuntime,
  isPinned,
  isSystemCollection,
  navButtonWidth,
  onAdd,
  onEdit,
  onDelete,
  onTogglePin,
  onToggleVisibility,
  onRename,
}: CollectionHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(title);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const isTitleCommitting = useRef(false);

  useEffect(() => {
    if (isEditing) {
      setDraftTitle(title);
      titleInputRef.current?.select();
    }
  }, [isEditing, title]);

  function startEditing() {
    if (isSystemCollection) return;
    setIsEditing(true);
  }

  function commit() {
    if (isTitleCommitting.current) return;
    isTitleCommitting.current = true;
    setIsEditing(false);

    const trimmed = draftTitle.trim();
    if (trimmed && trimmed !== title) {
      onRename?.(trimmed)
        .then(() => toast.success("Collection Name updated"))
        .catch(() => {});
    }

    isTitleCommitting.current = false;
  }

  function cancel() {
    setDraftTitle(title);
    setIsEditing(false);
  }

  function handleTitleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
    } else if (e.key === "Escape") {
      cancel();
    }
  }

  return (
    <div
      className="flex flex-col gap-2"
      style={{ paddingLeft: navButtonWidth, paddingRight: navButtonWidth }}
    >
      <div className="flex justify-between">
        <div className="flex gap-2 items-baseline">
          {/* Click-editable title */}
          {isEditing ? (
            <input
              ref={titleInputRef}
              autoFocus
              className="page-subtitle bg-transparent border-b border-current outline-none w-auto min-w-0"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              onKeyDown={handleTitleKeyDown}
              onBlur={commit}
            />
          ) : (
            <div className="w-auto page-subtitle" onClick={startEditing}>
              {title}
            </div>
          )}
          <div className="hidden min-[832px]:block">
            <div className="text-base lg:text-lg font-extralight">
              {filmCount} films
            </div>
            {/* <div className=""> &bull; {totalRuntime} minutes</div> */}
          </div>
        </div>
        <CollectionActions
          name={title}
          isPublic={isPublic}
          isPinned={isPinned}
          isSystemCollection={isSystemCollection}
          onAdd={onAdd}
          onEdit={onEdit}
          onDelete={onDelete}
          onTogglePin={onTogglePin}
          onToggleVisibility={onToggleVisibility}
        />
      </div>
    </div>
  );
}
