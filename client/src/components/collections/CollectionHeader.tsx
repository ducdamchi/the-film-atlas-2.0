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
  onDelete?: () => void;
}

export default function CollectionHeader({
  title,
  filmCount,
  description,
  isSystemCollection,
  navButtonWidth,
  onEdit,
  onDelete,
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
        {!isSystemCollection && (
          <CollectionActions onEdit={onEdit} onDelete={onDelete} />
        )}
      </div>
      <div className="">{description}</div>
    </div>
  );
}
