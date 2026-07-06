import { X } from "lucide-react";

export default function ConfirmModal({ open, title, message, confirmLabel = "Delete", onConfirm, onCancel }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center px-4" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-sm bg-[#13131e]"
        style={{ borderRadius: "16px", border: "1px solid rgba(255,255,255,0.08)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          <button onClick={onCancel} className="icon-btn"><X className="w-4 h-4" /></button>
        </div>

        <p className="px-5 pb-5 text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>{message}</p>

        <div className="flex gap-2 px-5 pb-5">
          <button
            onClick={onCancel}
            className="flex-1 text-sm font-semibold text-white/60 py-2.5"
            style={{ background: "rgba(255,255,255,0.06)", borderRadius: "10px", border: "none", cursor: "pointer" }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 text-sm font-semibold text-white py-2.5"
            style={{ background: "rgba(239,68,68,0.8)", borderRadius: "10px", border: "none", cursor: "pointer" }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
