import type { CollectionData } from "@/hooks/useCollections";
import CollectionActions from "./CollectionActions";

export interface CollectionHeaderProps extends Omit<
  CollectionData,
  "films" | "queryString"
> {
  filmCount: number;
  isSystemCollection: boolean;
  navButtonWidth: number;
  onEdit?: () => void;
  onDelete?: () => Promise<void>;
  onTogglePin?: () => Promise<void>;
  onToggleVisibility?: () => Promise<void>;
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
  onEdit,
  onDelete,
  onTogglePin,
  onToggleVisibility,
}: CollectionHeaderProps) {
  return (
    <div
      className="flex flex-col gap-1"
      style={{ paddingLeft: navButtonWidth, paddingRight: navButtonWidth }}
    >
      <div className="flex justify-between">
        <div className="flex gap-2 items-center">
          <div className="page-subtitle">{title}</div>
          <div>{filmCount} films</div>
        </div>
        <CollectionActions
          name={title}
          isPublic={isPublic}
          isPinned={isPinned}
          isSystemCollection={isSystemCollection}
          onEdit={onEdit}
          onDelete={onDelete}
          onTogglePin={onTogglePin}
          onToggleVisibility={onToggleVisibility}
        />
      </div>
      <div className="">{description}</div>
    </div>
  );
}
