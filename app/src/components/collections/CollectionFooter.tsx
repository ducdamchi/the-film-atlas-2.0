import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";

interface CollectionFooterProps {
  description?: string | null;
  isSystemCollection: boolean;
  navButtonWidth: number;
  onUpdateDescription?: (newDescription: string) => Promise<void>;
}

export default function CollectionFooter({
  description,
  isSystemCollection,
  navButtonWidth,
  onUpdateDescription,
}: CollectionFooterProps) {
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [draftDescription, setDraftDescription] = useState(description ?? "");
  const descriptionInputRef = useRef<HTMLInputElement>(null);
  const isDescriptionCommitting = useRef(false);

  useEffect(() => {
    if (isEditingDescription) {
      setDraftDescription(description ?? "");
      descriptionInputRef.current?.select();
    }
  }, [isEditingDescription, description]);

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
    <div style={{ paddingLeft: navButtonWidth, paddingRight: navButtonWidth }}>
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
