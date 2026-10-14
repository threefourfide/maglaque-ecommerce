import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Play, X } from "lucide-react";
import { mediaUrl } from "../api";

export default function ReviewMedia({ items = [], size = "h-20 w-20" }) {
  const [open, setOpen] = useState(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(null);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open]);

  if (!items.length) return null;

  return (
    <>
      <ul className="mt-3 flex list-none flex-wrap gap-2 p-0">
        {items.map((m) => (
          <li key={m.id}>
            <button
              type="button"
              onClick={() => setOpen(m)}
              aria-label={m.type === "video" ? "Play video" : "View photo"}
              className={`relative block ${size} overflow-hidden bg-[#EBE5DE] p-1 transition-opacity hover:opacity-80`}
            >
              {m.type === "video" ? (
                <>
                  <video src={`${mediaUrl(m.url)}#t=0.1`} preload="metadata" muted playsInline className="h-full w-full object-cover" />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/25 text-white">
                    <Play className="h-6 w-6 fill-white" />
                  </span>
                </>
              ) : (
                <img src={mediaUrl(m.url)} alt="Review photo" loading="lazy" className="h-full w-full object-contain" />
              )}
            </button>
          </li>
        ))}
      </ul>

      {open && (
        createPortal(
          <div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4"
            onClick={() => setOpen(null)}
          >
            <button
              type="button"
              onClick={() => setOpen(null)}
              aria-label="Close"
              className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-[#2D3831]"
            >
              <X className="h-5 w-5" />
            </button>
            <div onClick={(e) => e.stopPropagation()} className="max-h-full max-w-full">
              {open.type === "video" ? (
                <video src={mediaUrl(open.url)} controls autoPlay playsInline className="max-h-[85vh] max-w-[90vw]" />
              ) : (
                <img src={mediaUrl(open.url)} alt="Customer review" className="max-h-[85vh] max-w-[90vw] object-contain" />
              )}
            </div>
          </div>,
          document.body
        )
      )}
    </>
  );
}
