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
  onUpdateDescription?: (newDescription: string) => Promise<void>;
}

export default function CollectionHeader({
  title,
  filmCount,
  description,
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
  onUpdateDescription,
}: CollectionHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(title);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const isTitleCommitting = useRef(false);

  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [draftDescription, setDraftDescription] = useState(description ?? "");
  const descriptionInputRef = useRef<HTMLInputElement>(null);
  const isDescriptionCommitting = useRef(false);

  useEffect(() => {
    if (isEditing) {
      setDraftTitle(title);
      titleInputRef.current?.select();
    }
  }, [isEditing, title]);

  useEffect(() => {
    if (isEditingDescription) {
      setDraftDescription(description ?? "");
      descriptionInputRef.current?.select();
    }
  }, [isEditingDescription, description]);

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

  function startEditingDescription() {
    if (isSystemCollection) return;
    setIsEditingDescription(true);
  }

  function commitDescription() {
    if (isDescriptionCommitting.current) return;
    isDescriptionCommitting.current = true;
    setIsEditingDescription(false);

    const trimmed = draftDescription.trim();
    if (trimmed !== (description ?? "")) {
      onUpdateDescription?.(trimmed)
        .then(() => toast.success("Collection Description updated"))
        .catch(() => {});
    }

    isDescriptionCommitting.current = false;
  }

  function cancelDescription() {
    setDraftDescription(description ?? "");
    setIsEditingDescription(false);
  }

  function handleDescriptionKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      commitDescription();
    } else if (e.key === "Escape") {
      cancelDescription();
    }
  }

  return (
    <div
      className="flex flex-col gap-1"
      style={{ paddingLeft: navButtonWidth, paddingRight: navButtonWidth }}
    >
      <div className="flex justify-between">
        <div className="flex gap-2 items-center">
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
          <div className="hidden min-[832px]:flex min-[832px]:gap-1">
            <div className=""> {filmCount} films</div>
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
      <div className="flex gap-1 min-[832px]:hidden">
        <div className=""> {filmCount} films</div>
        {/* <div className=""> &bull; {totalRuntime} minutes</div> */}
      </div>

      {/* Click-editable description */}
      {isEditingDescription ? (
        <input
          ref={descriptionInputRef}
          autoFocus
          className="bg-transparent border-b border-current outline-none w-full"
          value={draftDescription}
          onChange={(e) => setDraftDescription(e.target.value)}
          onKeyDown={handleDescriptionKeyDown}
          onBlur={commitDescription}
        />
      ) : (
        <div className="w-auto" onClick={startEditingDescription}>
          {description ?? ""}
        </div>
      )}
    </div>
  );
}
