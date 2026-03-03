'use client';

import React from 'react';
import { Trash2 } from 'lucide-react';
import type { SceneElement } from './SceneBuilder';
import type { IconType } from '@/lib/icons';

interface ElementControlsProps {
  element: SceneElement;
  icon: IconType;
  onUpdate: (id: string, updates: Partial<SceneElement>) => void;
  onDelete: (id: string) => void;
}

export const ElementControls: React.FC<ElementControlsProps> = ({
  element,
  icon,
  onUpdate,
  onDelete,
}) => {
  return (
    <div 
      className="
        w-72 bg-white rounded-lg border-2 border-slate-300 
        shadow-md overflow-hidden flex flex-col
        max-h-[80vh]
      "
    >
      {/* Header - kept compact */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3">
        <h3 className="text-sm font-bold">Element Properties</h3>
        <p className="text-xs text-blue-100 mt-0.5 truncate">{icon.label}</p>
      </div>

      {/* Main scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5 min-h-0">
        {/* Icon Preview - smaller now */}
        <div className="flex items-center justify-center bg-slate-50 rounded-xl p-4 border border-slate-200 shadow-sm">
          <svg
            width="100"
            height="100"
            viewBox="-80 -80 160 160"
            className="overflow-visible drop-shadow-md"
          >
            <g
              dangerouslySetInnerHTML={{
                __html: icon.render(0, 0, 0,0.5),
              }}
            />
          </svg>
        </div>

        {/* Position X */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">
            X: {Math.round(element.x)}
          </label>
          <input
            type="range"
            min="0"
            max="1150"
            value={element.x}
            onChange={(e) => onUpdate(element.id, { x: parseFloat(e.target.value) })}
            className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-blue-600"
          />
        </div>

        {/* Position Y */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">
            Y: {Math.round(element.y)}
          </label>
          <input
            type="range"
            min="0"
            max="750"
            value={element.y}
            onChange={(e) => onUpdate(element.id, { y: parseFloat(e.target.value) })}
            className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-blue-600"
          />
        </div>

        {/* Rotation */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">
            Rotation: {Math.round(element.rotation)}°
          </label>
          <input
            type="range"
            min="0"
            max="360"
            value={element.rotation}
            onChange={(e) => onUpdate(element.id, { rotation: parseFloat(e.target.value) })}
            className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-blue-600"
          />
        </div>

        {/* Scale */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">
            Scale: {(element.scale * 100).toFixed(0)}%
          </label>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={element.scale}
            onChange={(e) => onUpdate(element.id, { scale: parseFloat(e.target.value) })}
            className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-blue-600"
          />
        </div>

        {/* Z-Index / Layer */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">
            Layer: {element.zIndex}
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={element.zIndex}
            onChange={(e) => onUpdate(element.id, { zIndex: parseInt(e.target.value) })}
            className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-blue-600"
          />
        </div>
      </div>

      {/* Footer - compact delete button */}
      <div className="border-t border-slate-200 p-3">
        <button
          onClick={() => {
            if (window.confirm('Delete this element? This cannot be undone.')) {
              onDelete(element.id);
            }
          }}
          className="
            w-full flex items-center justify-center gap-2 
            bg-red-50 hover:bg-red-100 text-red-700 
            font-medium py-2 px-4 rounded-lg transition-colors text-sm
          "
        >
          <Trash2 size={16} />
          Delete Element
        </button>
      </div>
    </div>
  );
};