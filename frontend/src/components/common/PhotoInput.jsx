import { useRef } from "react";
import { Camera, ImagePlus, Trash2 } from "lucide-react";

/**
 * Photo picker with preview.
 *  src      - image URL to preview (uploaded file URL or object URL)
 *  onSelect - called with the chosen File
 *  onRemove - optional; shows a remove button when a photo is set
 *  camera   - open the rear camera directly on phones
 */
const PhotoInput = ({
  src,
  onSelect,
  onRemove,
  busy = false,
  label = "Add photo",
  hint = "JPG, PNG or WebP",
  camera = false,
  className = "",
}) => {
  const inputRef = useRef(null);

  const handleChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow picking the same file again
    if (file) onSelect(file);
  };

  const Icon = camera ? Camera : ImagePlus;

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture={camera ? "environment" : undefined}
        onChange={handleChange}
        className="hidden"
      />
      {src ? (
        <div className="group relative overflow-hidden rounded-xl border border-ink-200 bg-ink-50">
          <img src={src} alt="" className="h-48 w-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 flex justify-end gap-2 bg-linear-to-t from-ink-950/60 to-transparent p-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-ink-800 shadow-card hover:bg-ink-50"
            >
              {busy ? "Uploading…" : "Change"}
            </button>
            {onRemove && (
              <button
                type="button"
                onClick={onRemove}
                disabled={busy}
                aria-label="Remove photo"
                className="rounded-lg bg-white p-1.5 text-rose-700 shadow-card hover:bg-rose-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex h-32 w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-ink-300 bg-ink-50 text-ink-500 transition hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700 disabled:opacity-60"
        >
          <Icon className="h-6 w-6" />
          <span className="text-sm font-semibold">{busy ? "Uploading…" : label}</span>
          <span className="text-xs">{hint}</span>
        </button>
      )}
    </div>
  );
};

export default PhotoInput;
