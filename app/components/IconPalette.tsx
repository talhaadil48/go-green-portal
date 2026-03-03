'use client';

import React, { useState } from 'react';
import { ICON_LIBRARY, IconType, ICON_CATEGORIES } from '@/lib/icons';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface IconPaletteProps {
  icons: IconType[];
  onIconSelect: (iconId: string, x: number, y: number) => void;
}

export const IconPalette: React.FC<IconPaletteProps> = ({
  icons,
  onIconSelect,
}) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['road', 'vehicle'])
  );

  const categories = Object.groupBy(icons, (icon) => icon.category) as Record<
    string,
    IconType[]
  >;

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const handleDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    iconId: string
  ) => {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('iconId', iconId);

    // Create larger custom drag image for bigger icons
    const previewSize = 80;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', previewSize.toString());
    svg.setAttribute('height', previewSize.toString());
    svg.setAttribute('viewBox', '-50 -50 100 100'); // adjusted centering

    const icon = icons.find((i) => i.id === iconId);
    if (icon) {
      // render at center with scale ~0.8–1.0 so it fits nicely in drag preview
      const rendered = icon.render(0, 0, 0, 0.9);
      svg.innerHTML = rendered;
      document.body.appendChild(svg); // needed for Firefox/Edge
      e.dataTransfer.setDragImage(svg, previewSize / 2, previewSize / 2);

      // Clean up (important!)
      setTimeout(() => {
        document.body.removeChild(svg);
      }, 0);
    }
  };

  const handleIconClick = (iconId: string) => {
    // Default position when clicking instead of dragging
    onIconSelect(iconId, 600, 400);
  };

  return (
    <div className="w-80 bg-white border-r-2 border-slate-300 overflow-y-auto shadow-sm">
      <div className="sticky top-0 bg-gradient-to-r from-slate-900 to-slate-800 text-white p-5 z-10">
        <h2 className="text-xl font-bold">Scene Elements</h2>
        <p className="text-sm text-slate-300 mt-1">Drag or click to add to canvas</p>
      </div>

      <div className="divide-y divide-slate-200">
        {Object.entries(ICON_CATEGORIES).map(([categoryKey, categoryLabel]) => {
          const categoryIcons = categories[categoryKey] || [];
          if (categoryIcons.length === 0) return null;

          const isExpanded = expandedCategories.has(categoryKey);

          return (
            <div key={categoryKey}>
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(categoryKey)}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-100 transition-colors font-semibold text-slate-800 text-base"
              >
                <span>{categoryLabel}</span>
                {isExpanded ? (
                  <ChevronUp size={20} />
                ) : (
                  <ChevronDown size={20} />
                )}
              </button>

              {/* Icons */}
              {isExpanded && (
                <div className="px-4 py-4 space-y-3 bg-slate-50">
                  {categoryIcons.map((icon) => (
                    <div
                      key={icon.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, icon.id)}
                      onClick={() => handleIconClick(icon.id)}
                      className="flex items-center gap-4 p-3 rounded-xl bg-white border-2 border-slate-200 hover:border-blue-500 hover:shadow-lg cursor-grab active:cursor-grabbing transition-all hover:bg-blue-50/70 active:bg-blue-100 select-none"
                    >
                      {/* Larger Icon Preview */}
                      <svg
                        width="80"
                        height="80"
                        viewBox="-60 -60 120 120" // adjusted to better center most icons
                        className="flex-shrink-0 drop-shadow-sm"
                      >
                        <g
                          dangerouslySetInnerHTML={{
                            __html: icon.render(0, 0, 0, 0.85), // slightly smaller scale to fit nicely
                          }}
                        />
                      </svg>

                      {/* Label */}
                      <span className="text-base font-medium text-slate-800">
                        {icon.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};