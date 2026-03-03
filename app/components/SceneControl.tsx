'use client';

import React, { useRef, useState } from 'react';
import {
  Undo2,
  Redo2,
  Trash2,
  Upload,
  Save,
  Loader2,
  FileJson,
} from 'lucide-react';

interface SceneControlsProps {
  elementCount: number;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onExport: (format: 'json' | 'png' | 'svg') => Promise<void> | void;
  onLoad: (json: string) => void;
}

export const SceneControls: React.FC<SceneControlsProps> = ({
  elementCount,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClear,
  onExport,
  onLoad,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      onLoad(content);
    };
    reader.readAsText(file);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await onExport('png');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white border-b-2 border-slate-300 px-6 py-4 flex items-center justify-between shadow-sm">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Accident Scene Builder</h1>
        <p className="text-sm text-slate-500 mt-1">
          {elementCount} element{elementCount !== 1 ? 's' : ''} on canvas
        </p>
      </div>

      <div className="flex items-center gap-2">
        {/* Undo / Redo */}
        <div className="flex items-center gap-1 border-r border-slate-300 pr-2">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-slate-700"
          >
            <Undo2 size={20} />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-slate-700"
          >
            <Redo2 size={20} />
          </button>
        </div>

        {/* Save Button */}
        <div className="flex items-center gap-1 border-r border-slate-300 px-2">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
          >
            {isSaving ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={18} />
                Save
              </>
            )}
          </button>
        </div>
        {/* Export JSON */}

        {/* Clear */}
        <button
          onClick={onClear}
          title="Clear all elements"
          className="p-2 rounded-lg hover:bg-red-50 transition-colors text-red-600"
        >
          <Trash2 size={20} />
        </button>
      </div>
    </div>
  );
};