"use client";

import { useState } from "react";
import { CheckSquare, Square, FileText } from "lucide-react";

export function MoveOutChecklist({ onChecklistChange, initialNotes = "" }) {
  const [inspectionCompleted, setInspectionCompleted] = useState(false);
  const [keysReturned, setKeysReturned] = useState(false);
  const [finalCleaning, setFinalCleaning] = useState(false);
  const [utilitiesDisconnected, setUtilitiesDisconnected] = useState(false);
  const [otherNotes, setOtherNotes] = useState(initialNotes);

  const handleChecklistChange = () => {
    const checklistItems = [];
    if (inspectionCompleted) checklistItems.push("✓ Inspection completed");
    if (keysReturned) checklistItems.push("✓ Keys returned");
    if (finalCleaning) checklistItems.push("✓ Final cleaning done");
    if (utilitiesDisconnected) checklistItems.push("✓ Utilities disconnected");

    const notes = [
      ...checklistItems,
      otherNotes.trim() ? `Notes: ${otherNotes.trim()}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    onChecklistChange?.(notes);
  };

  const handleCheckboxChange = (setter) => {
    setter((prev) => {
      const newValue = !prev;
      setTimeout(() => handleChecklistChange(), 0);
      return newValue;
    });
  };

  const handleNotesChange = (value) => {
    setOtherNotes(value);
    setTimeout(() => handleChecklistChange(), 0);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <FileText size={16} className="text-slate-400" />
        Move-Out Checklist
      </div>

      <div className="space-y-3">
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 transition hover:bg-slate-50">
          <button
            type="button"
            onClick={() => handleCheckboxChange(setInspectionCompleted)}
            className="mt-0.5 text-primary"
          >
            {inspectionCompleted ? (
              <CheckSquare size={20} className="text-primary" />
            ) : (
              <Square size={20} className="text-slate-300" />
            )}
          </button>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-900">
              Inspection completed
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Property inspection has been completed
            </p>
          </div>
        </label>

        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 transition hover:bg-slate-50">
          <button
            type="button"
            onClick={() => handleCheckboxChange(setKeysReturned)}
            className="mt-0.5 text-primary"
          >
            {keysReturned ? (
              <CheckSquare size={20} className="text-primary" />
            ) : (
              <Square size={20} className="text-slate-300" />
            )}
          </button>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-900">Keys returned</p>
            <p className="mt-0.5 text-xs text-slate-500">
              All keys have been returned by the tenant
            </p>
          </div>
        </label>

        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 transition hover:bg-slate-50">
          <button
            type="button"
            onClick={() => handleCheckboxChange(setFinalCleaning)}
            className="mt-0.5 text-primary"
          >
            {finalCleaning ? (
              <CheckSquare size={20} className="text-primary" />
            ) : (
              <Square size={20} className="text-slate-300" />
            )}
          </button>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-900">Final cleaning</p>
            <p className="mt-0.5 text-xs text-slate-500">
              Final cleaning has been completed
            </p>
          </div>
        </label>

        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 transition hover:bg-slate-50">
          <button
            type="button"
            onClick={() => handleCheckboxChange(setUtilitiesDisconnected)}
            className="mt-0.5 text-primary"
          >
            {utilitiesDisconnected ? (
              <CheckSquare size={20} className="text-primary" />
            ) : (
              <Square size={20} className="text-slate-300" />
            )}
          </button>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-900">
              Utilities disconnected
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              All utilities have been disconnected
            </p>
          </div>
        </label>
      </div>

      <div>
        <label
          htmlFor="other_notes"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Additional Notes
        </label>
        <textarea
          id="other_notes"
          value={otherNotes}
          onChange={(e) => handleNotesChange(e.target.value)}
          rows={3}
          placeholder="Add any additional notes about the move-out..."
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>
    </div>
  );
}

