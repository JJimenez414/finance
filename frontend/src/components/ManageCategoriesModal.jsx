import { useState } from "react";
import { X, Pencil, Trash2, Check, Plus } from "lucide-react";
import { useBudgetContext } from "../context/useBudgetContext";
import ConfirmModal from "./ConfirmModal";

const PRESET_COLORS = [
  "#14b8a6", "#f59e0b", "#60a5fa", "#a78bfa",
  "#f472b6", "#a3e635", "#f87171", "#fb923c",
  "#facc15", "#4ade80", "#22d3ee", "#818cf8",
  "#e879f9", "#fb7185", "#38bdf8", "#94a3b8",
];

function ColorPicker({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {PRESET_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          style={{
            width: "22px", height: "22px", borderRadius: "50%",
            background: c, border: "none", cursor: "pointer",
            outline: value === c ? "2px solid white" : "2px solid transparent",
            outlineOffset: "2px",
          }}
        />
      ))}
    </div>
  );
}

export default function ManageCategoriesModal({ open, onClose }) {
  const { userCategories, addUserCategory, updateUserCategory, deleteUserCategory } = useBudgetContext();

  const [editingId, setEditingId]         = useState(null);
  const [editName, setEditName]           = useState("");
  const [editColor, setEditColor]         = useState("");
  const [newName, setNewName]             = useState("");
  const [newBudget, setNewBudget]         = useState(0);
  const [newColor, setNewColor]           = useState(PRESET_COLORS[0]);
  const [error, setError]                 = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [confirmDeleteName, setConfirmDeleteName] = useState("");

  if (!open) return null;

  function startEdit(cat) {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditColor(cat.color);
    setError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setError("");
  }

  function saveEdit() {
    if (!editName.trim()) { setError("Name cannot be empty."); return; }
    updateUserCategory(editingId, editName.trim(), editColor)
      .then(() => setEditingId(null))
      .catch(() => setError("Failed to update."));
  }

  function promptDelete(cat) {
    setConfirmDeleteId(cat.id);
    setConfirmDeleteName(cat.name);
  }

  function confirmDelete() {
    deleteUserCategory(confirmDeleteId)
      .catch(() => setError("Failed to delete."))
      .finally(() => { setConfirmDeleteId(null); setConfirmDeleteName(""); });
  }

  function handleAdd() {
    if (!newName.trim()) { setError("Enter a category name."); return; }
    addUserCategory(newName.trim(), newColor, newBudget)
      .then(() => { setNewName(""); setNewColor(PRESET_COLORS[0]); setError(""); })
      .catch(() => setError("Failed to add. Name may already exist."));
  }

  return (
    <>
    <div className="fixed inset-0 z-[900] flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md bg-[#13131e] border-t border-white/8"
        style={{ borderRadius: "20px 20px 0 0", maxHeight: "90vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-8 h-1 rounded-full bg-white/15 mx-auto mt-3 mb-4" />
        <div className="flex items-center justify-between px-6 pb-4 border-b border-white/8">
          <h2 className="text-sm font-semibold text-white">Manage Categories</h2>
          <button onClick={onClose} className="icon-btn"><X className="w-4 h-4" /></button>
        </div>

        <div className="px-6 py-5 space-y-2">
          {(userCategories ?? []).map((cat) =>
            editingId === cat.id ? (
              <div key={cat.id} className="px-4 py-3" style={{ background: "rgba(255,255,255,0.05)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)" }}>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => { setEditName(e.target.value); setError(""); }}
                  className="w-full bg-transparent text-sm text-white focus:outline-none mb-2"
                  placeholder="Category name"
                  autoFocus
                />
                <ColorPicker value={editColor} onChange={setEditColor} />
                <div className="flex gap-2 mt-3">
                  <button onClick={cancelEdit} className="flex-1 text-xs text-white/50 py-1.5" style={{ background: "rgba(255,255,255,0.06)", borderRadius: "8px", border: "none", cursor: "pointer" }}>
                    Cancel
                  </button>
                  <button onClick={saveEdit} className="flex-1 flex items-center justify-center gap-1 text-xs text-white py-1.5" style={{ background: "linear-gradient(135deg, #14b8a6, #0ea5e9)", borderRadius: "8px", border: "none", cursor: "pointer" }}>
                    <Check className="w-3 h-3" /> Save
                  </button>
                </div>
              </div>
            ) : (
              <div
                key={cat.id}
                className="flex items-center gap-3 px-4 py-3"
                style={{ background: "#13131e", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.07)", borderLeft: `3px solid ${cat.color}` }}
              >
                <span className="flex-1 text-sm text-white">{cat.name}</span>
                <button onClick={() => startEdit(cat)} className="icon-btn"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => promptDelete(cat)} className="icon-btn-danger"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            )
          )}
        </div>

        <div className="px-6 pb-8">
          <div className="pt-4 border-t border-white/8">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">Add Category</p>
            <input
              type="text"
              value={newName}
              onChange={(e) => { setNewName(e.target.value); setError(""); }}
              placeholder="Category name"
              className="w-full h-10 px-4 text-sm text-white placeholder:text-white/25 focus:outline-none"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: "10px" }}
            />
            <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3 pt-3">Amount</p>
            <input
              type="text"
              value={newBudget}
              onChange={(e) => { setNewBudget(e.target.value); setError(""); }}
              placeholder="Allocated"
              className="w-full h-10 px-4 text-sm text-white placeholder:text-white/25 focus:outline-none mb-2"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: "10px" }}
            />
            <ColorPicker value={newColor} onChange={setNewColor} />

            {error && (
              <p className="text-xs mt-2" style={{ color: "#f87171" }}>{error}</p>
            )}

            <button
              onClick={handleAdd}
              className="mt-4 w-full flex items-center justify-center gap-2 text-white text-sm font-semibold"
              style={{ height: "44px", background: "linear-gradient(135deg, #14b8a6, #0ea5e9)", borderRadius: "12px", border: "none", cursor: "pointer" }}
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
        </div>
      </div>
    </div>

    <ConfirmModal
      open={!!confirmDeleteId}
      title="Delete category"
      message={`Are you sure you want to delete "${confirmDeleteName}"? This will also remove its budget allocation and all related transactions.`}
      confirmLabel="Delete"
      onConfirm={confirmDelete}
      onCancel={() => { setConfirmDeleteId(null); setConfirmDeleteName(""); }}
    />
    </>
  );
}
