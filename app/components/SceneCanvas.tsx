'use client';

import React, { useRef, useState, useCallback } from 'react';
import { ICON_LIBRARY } from '@/lib/icons';
import type { SceneElement } from './SceneBuilder';

interface SceneCanvasProps {
  elements: SceneElement[];
  selectedElementId: string | null;
  onCanvasClick: (e: React.MouseEvent<SVGSVGElement>) => void;
  onElementClick: (id: string) => void;
  onElementMove: (id: string, x: number, y: number) => void;
  onElementSelect: (id: string) => void;
  onDropIcon?: (iconId: string, x: number, y: number) => void;
}

export const SceneCanvas = React.forwardRef<SVGSVGElement, SceneCanvasProps>(
  (
    {
      elements,
      selectedElementId,
      onCanvasClick,
      onElementClick,
      onElementMove,
      onElementSelect,
      onDropIcon,
    },
    ref
  ) => {
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const svgRef = useRef<SVGSVGElement>(null);

    React.useImperativeHandle(ref, () => svgRef.current!);

    const getIcon = (iconId: string) =>
      ICON_LIBRARY.find((icon) => icon.id === iconId);

    const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>, elementId?: string) => {
      if (elementId) {
        setDraggingId(elementId);
        onElementSelect(elementId);
        e.stopPropagation();
      } else {
        onCanvasClick(e);
      }

      setDragStart({
        x: e.clientX,
        y: e.clientY,
      });
    };

    const handleMouseMove = useCallback(
      (e: React.MouseEvent<SVGSVGElement>) => {
        if (!draggingId || !svgRef.current) return;

        const rect = svgRef.current.getBoundingClientRect();
        const element = elements.find((el) => el.id === draggingId);
        if (!element) return;

        const deltaX = e.clientX - dragStart.x;
        const deltaY = e.clientY - dragStart.y;

        const margin = 120;
        const newX = Math.max(-margin, Math.min(1200 + margin - 100, element.x + deltaX));
        const newY = Math.max(-margin, Math.min(800 + margin - 100, element.y + deltaY));

        onElementMove(draggingId, newX, newY);
        setDragStart({ x: e.clientX, y: e.clientY });
      },
      [draggingId, elements, dragStart, onElementMove]
    );

    const handleMouseUp = () => {
      setDraggingId(null);
    };

    const handleDragOver = (e: React.DragEvent<SVGSVGElement>) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    };

    const handleDrop = (e: React.DragEvent<SVGSVGElement>) => {
      e.preventDefault();
      const iconId = e.dataTransfer.getData('iconId');
      if (!iconId || !svgRef.current) return;

      const rect = svgRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (1200 / rect.width);
      const y = (e.clientY - rect.top) * (800 / rect.height);

      const margin = 100;
      const safeX = Math.max(-margin, Math.min(1200 + margin - 100, x));
      const safeY = Math.max(-margin, Math.min(800 + margin - 100, y));

      onDropIcon?.(iconId, safeX, safeY);
    };

    return (
      <div className="w-96 h-96 rounded-xl border-2 border-slate-300 bg-white overflow-hidden shadow-lg">
        <svg
          ref={svgRef}
          viewBox="0 0 1200 800"
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-full bg-white touch-none select-none"
          onMouseDown={(e) => handleMouseDown(e)}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <defs>
            <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#e2e8f0" strokeWidth="0.8" />
            </pattern>
          </defs>
          <rect width="1200" height="800" fill="url(#grid)" />

          {elements
            .sort((a, b) => a.zIndex - b.zIndex)
            .map((element) => {
              const icon = getIcon(element.iconId);
              if (!icon) return null;

              const isSelected = element.id === selectedElementId;

              // ────────────────────────────────────────────────
              // HIT AREA – makes dragging possible in a larger zone
              // Adjust size according to your largest icons
              // ────────────────────────────────────────────────
              const hitSize = 180;           // diameter/width of clickable area
              const hitHalf = hitSize / 2;

              return (
                <g
                  key={element.id}
                  onMouseDown={(e) => handleMouseDown(e as any, element.id)}
                  className={`cursor-${draggingId === element.id ? 'grabbing' : 'grab'}`}
                  style={{
                    opacity: isSelected ? 1 : 0.92,
                    filter: isSelected
                      ? 'drop-shadow(0 0 14px rgba(59, 130, 246, 0.7))'
                      : 'drop-shadow(0 3px 8px rgba(0,0,0,0.14))',
                  }}
                >
                  {/* Invisible hit area – makes the whole zone draggable */}
                  <rect
                    x={element.x - hitHalf}
                    y={element.y - hitHalf}
                    width={hitSize}
                    height={hitSize}
                    fill="transparent"
                    // pointer-events only on this rect when not selected
                    // (prevents blocking other elements when dragging over them)
                    pointerEvents={isSelected ? 'all' : 'visiblePainted'}
                    // You can make it visible temporarily for debugging:
                    // stroke="red" strokeWidth="1" strokeDasharray="4 4" opacity="0.3"
                  />

                  {/* The actual icon */}
                  <g
                    dangerouslySetInnerHTML={{
                      __html: icon.render(element.x, element.y, element.rotation, element.scale),
                    }}
                  />

                  {/* Visual selection feedback (only when selected) */}
                  {isSelected && (
                    <>
                      <rect
                        x={element.x - 100}
                        y={element.y - 100}
                        width={200}
                        height={200}
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="4"
                        strokeDasharray="10 6"
                        rx="8"
                        pointerEvents="none" // don't block mouse events
                      />
                      <circle
                        cx={element.x}
                        cy={element.y}
                        r="6"
                        fill="#3b82f6"
                        stroke="white"
                        strokeWidth="2"
                        pointerEvents="none"
                      />
                    </>
                  )}
                </g>
              );
            })}
        </svg>
      </div>
    );
  }
);

SceneCanvas.displayName = 'SceneCanvas';