import { Eye, Star, Pencil, Trash2 } from "lucide-react";

interface DocumentActionButtonsProps {
  doc: any;
  onView: (doc: any) => void;
  onFavorite: (doc: any) => void;
  onRename: (doc: any) => void;
  onDelete: (doc: any) => void;
}

const BASE =
  "p-1.5 rounded-lg text-gray-500 dark:text-cream-100/55 hover:bg-cream-100 dark:hover:bg-navy-800 hover:text-navy-950 dark:hover:text-white transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-500";

export default function DocumentActionButtons({
  doc,
  onView,
  onFavorite,
  onRename,
  onDelete,
}: DocumentActionButtonsProps) {
  // stopPropagation: these sit inside clickable cards/rows.
  const act = (fn: (d: any) => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    fn(doc);
  };

  return (
    <div className="flex items-center gap-0.5">
      <button onClick={act(onView)} title="View document" aria-label="View document" className={BASE}>
        <Eye size={16} />
      </button>
      <button
        onClick={act(onFavorite)}
        title={doc.isFavorite ? "Remove from favorites" : "Add to favorites"}
        aria-label={doc.isFavorite ? "Remove from favorites" : "Add to favorites"}
        aria-pressed={!!doc.isFavorite}
        className={BASE}
      >
        <Star
          size={16}
          className={doc.isFavorite ? "fill-gold-500 text-gold-500" : ""}
        />
      </button>
      <button onClick={act(onRename)} title="Rename" aria-label="Rename document" className={BASE}>
        <Pencil size={16} />
      </button>
      <button
        onClick={act(onDelete)}
        title="Delete"
        aria-label="Delete document"
        className={`${BASE} hover:!text-risk-high-fg dark:hover:!text-risk-high-fg-dark`}
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}
