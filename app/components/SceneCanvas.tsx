'use client';

import React, { useRef, useState, useCallback } from 'react';
import { ICON_LIBRARY } from '@/lib/icons';
import type { SceneElement } from './SceneBuilder';

export interface TextElement {
  id: string;
  type: 'text';
  x: number;
  y: number;
  text: string;
  fontSize: number;
  color: string;
  zIndex: number;
}

export interface DrawPath {
  id: string;
  type: 'path';
  points: { x: number; y: number }[];
  color: string;
  strokeWidth: number;
  zIndex: number;
}

export type CanvasOverlay = TextElement | DrawPath;

export type ActiveTool = 'select' | 'text' | 'pencil';

interface SceneCanvasProps {
  elements: SceneElement[];
  overlays: CanvasOverlay[];
  selectedElementId: string | null;
  activeTool: ActiveTool;
  pencilColor: string;
  pencilWidth: number;
  textColor: string;
  fontSize: number;
  onCanvasClick: (e: React.MouseEvent<SVGSVGElement>) => void;
  onElementClick: (id: string) => void;
  onElementMove: (id: string, x: number, y: number) => void;
  onElementSelect: (id: string) => void;
  onDropIcon?: (iconId: string, x: number, y: number) => void;
  onAddTextElement: (el: TextElement) => void;
  onAddDrawPath: (path: DrawPath) => void;
  onUpdateTextElement: (id: string, text: string) => void;
  onDeleteOverlay: (id: string) => void;
}

export const SceneCanvas = React.forwardRef<SVGSVGElement, SceneCanvasProps>(
  (
    {
      elements,
      overlays,
      selectedElementId,
      activeTool,
      pencilColor,
      pencilWidth,
      textColor,
      fontSize,
      onCanvasClick,
      onElementClick,
      onElementMove,
      onElementSelect,
      onDropIcon,
      onAddTextElement,
      onAddDrawPath,
      onUpdateTextElement,
      onDeleteOverlay,
    },
    ref
  ) => {
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [editingTextId, setEditingTextId] = useState<string | null>(null);
    const [editingTextValue, setEditingTextValue] = useState('');
    const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[] | null>(null);
    const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const nextIdRef = useRef(1000);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    React.useImperativeHandle(ref, () => svgRef.current!);

    const getIcon = (iconId: string) =>
      ICON_LIBRARY.find((icon) => icon.id === iconId);

    const svgCoords = (clientX: number, clientY: number) => {
      if (!svgRef.current) return { x: 0, y: 0 };
      const rect = svgRef.current.getBoundingClientRect();
      return {
        x: (clientX - rect.left) * (1200 / rect.width),
        y: (clientY - rect.top) * (800 / rect.height),
      };
    };

    // ── Text placement ────────────────────────────────────────────────
    const commitTextEdit = () => {
      if (!editingTextId) return;
      if (editingTextValue.trim()) {
        onUpdateTextElement(editingTextId, editingTextValue);
      } else {
        onDeleteOverlay(editingTextId);
      }
      setEditingTextId(null);
      setEditingTextValue('');
    };

    const startTextEdit = (id: string, currentText: string) => {
      setEditingTextId(id);
      setEditingTextValue(currentText);
      setTimeout(() => textareaRef.current?.focus(), 30);
    };

    // ── Mouse handlers ────────────────────────────────────────────────
    const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>, elementId?: string) => {
      if (editingTextId) { commitTextEdit(); return; }

      const { x, y } = svgCoords(e.clientX, e.clientY);

      if (activeTool === 'text') {
        const newId = `text-${nextIdRef.current++}`;
        const el: TextElement = {
          id: newId,
          type: 'text',
          x,
          y,
          text: '',
          fontSize,
          color: textColor,
          zIndex: elements.length + overlays.length,
        };
        onAddTextElement(el);
        setEditingTextId(newId);
        setEditingTextValue('');
        setTimeout(() => textareaRef.current?.focus(), 30);
        return;
      }

      if (activeTool === 'pencil') {
        setCurrentPath([{ x, y }]);
        return;
      }

      // select tool
      if (elementId) {
        setDraggingId(elementId);
        onElementSelect(elementId);
        e.stopPropagation();
      } else {
        setSelectedOverlayId(null);
        onCanvasClick(e);
      }
      setDragStart({ x: e.clientX, y: e.clientY });
    };

    const handleMouseMove = useCallback(
      (e: React.MouseEvent<SVGSVGElement>) => {
        if (activeTool === 'pencil' && currentPath) {
          const { x, y } = svgCoords(e.clientX, e.clientY);
          setCurrentPath((prev) => (prev ? [...prev, { x, y }] : null));
          return;
        }

        if (!draggingId || !svgRef.current) return;
        const element = elements.find((el) => el.id === draggingId);
        if (!element) return;

        const rect = svgRef.current.getBoundingClientRect();
        const scaleX = 1200 / rect.width;
        const scaleY = 800 / rect.height;

        const deltaX = (e.clientX - dragStart.x) * scaleX;
        const deltaY = (e.clientY - dragStart.y) * scaleY;

        const margin = 120;
        const newX = Math.max(-margin, Math.min(1200 + margin - 100, element.x + deltaX));
        const newY = Math.max(-margin, Math.min(800 + margin - 100, element.y + deltaY));

        onElementMove(draggingId, newX, newY);
        setDragStart({ x: e.clientX, y: e.clientY });
      },
      [draggingId, elements, dragStart, onElementMove, activeTool, currentPath]
    );

    const handleMouseUp = () => {
      if (activeTool === 'pencil' && currentPath && currentPath.length > 1) {
        const newPath: DrawPath = {
          id: `path-${nextIdRef.current++}`,
          type: 'path',
          points: currentPath,
          color: pencilColor,
          strokeWidth: pencilWidth,
          zIndex: elements.length + overlays.length,
        };
        onAddDrawPath(newPath);
      }
      setCurrentPath(null);
      setDraggingId(null);
    };

    const pointsToD = (pts: { x: number; y: number }[]) => {
      if (!pts.length) return '';
      return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    };

    const handleDragOver = (e: React.DragEvent<SVGSVGElement>) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    };

    const handleDrop = (e: React.DragEvent<SVGSVGElement>) => {
      e.preventDefault();
      const iconId = e.dataTransfer.getData('iconId');
      if (!iconId || !svgRef.current) return;
      const { x, y } = svgCoords(e.clientX, e.clientY);
      const margin = 100;
      onDropIcon?.(iconId, Math.max(-margin, Math.min(1200 + margin - 100, x)), Math.max(-margin, Math.min(800 + margin - 100, y)));
    };

    // ── Inline textarea position ──────────────────────────────────────
    const editingEl = overlays.find((o) => o.id === editingTextId) as TextElement | undefined;
    let textareaStyle: React.CSSProperties = { display: 'none' };
    if (editingEl && svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const scaleX = rect.width / 1200;
      const scaleY = rect.height / 800;
      textareaStyle = {
        position: 'absolute',
        left: editingEl.x * scaleX,
        top: editingEl.y * scaleY,
        fontSize: editingEl.fontSize * scaleY,
        color: editingEl.color,
        background: 'rgba(255,255,255,0.85)',
        border: '2px dashed #3b82f6',
        borderRadius: 4,
        outline: 'none',
        minWidth: 120,
        minHeight: 32,
        padding: '2px 6px',
        resize: 'both',
        zIndex: 100,
        fontFamily: 'inherit',
        lineHeight: 1.4,
      };
    }

    return (
      <div
        className="w-full rounded-xl border-2 border-slate-300 bg-white overflow-hidden shadow-lg"
        style={{ aspectRatio: '1000 / 560', position: 'relative' }}
      >
        {/* Floating textarea for text editing */}
        <textarea
          ref={textareaRef}
          style={textareaStyle}
          value={editingTextValue}
          onChange={(e) => setEditingTextValue(e.target.value)}
          onBlur={commitTextEdit}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { commitTextEdit(); }
            if (e.key === 'Enter' && e.metaKey) { commitTextEdit(); }
          }}
          placeholder="Type here…"
          rows={2}
        />

        <svg
          ref={svgRef}
          viewBox="0 0 1200 800"
          preserveAspectRatio="none"
          className="w-full h-full bg-white touch-none select-none"
          style={{ cursor: activeTool === 'text' ? 'text' : activeTool === 'pencil' ? 'crosshair' : 'default' }}
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

          {/* Icons */}
          {elements
            .sort((a, b) => a.zIndex - b.zIndex)
            .map((element) => {
              const icon = getIcon(element.iconId);
              if (!icon) return null;
              const isSelected = element.id === selectedElementId;
              const hitSize = 180;
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
                  <rect x={element.x - hitHalf} y={element.y - hitHalf} width={hitSize} height={hitSize} fill="transparent" pointerEvents={isSelected ? 'all' : 'visiblePainted'} />
                  <g dangerouslySetInnerHTML={{ __html: icon.render(element.x, element.y, element.rotation, element.scale) }} />
                  {isSelected && (
                    <>
                      <rect x={element.x - 100} y={element.y - 100} width={200} height={200} fill="none" stroke="#3b82f6" strokeWidth="4" strokeDasharray="10 6" rx="8" pointerEvents="none" />
                      <circle cx={element.x} cy={element.y} r="6" fill="#3b82f6" stroke="white" strokeWidth="2" pointerEvents="none" />
                    </>
                  )}
                </g>
              );
            })}

          {/* Overlay: draw paths */}
          {overlays
            .filter((o): o is DrawPath => o.type === 'path')
            .map((path) => (
              <path
                key={path.id}
                d={pointsToD(path.points)}
                stroke={path.color}
                strokeWidth={path.strokeWidth}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ cursor: activeTool === 'select' ? 'pointer' : 'default' }}
                onClick={() => activeTool === 'select' && setSelectedOverlayId(path.id)}
                opacity={selectedOverlayId === path.id ? 1 : 0.85}
              />
            ))}

          {/* Overlay: text elements */}
          {overlays
            .filter((o): o is TextElement => o.type === 'text')
            .map((el) => {
              if (el.id === editingTextId) return null; // hidden while editing
              const lines = el.text.split('\n');
              return (
                <g
                  key={el.id}
                  style={{ cursor: activeTool === 'select' ? 'pointer' : 'text' }}
                  onDoubleClick={() => startTextEdit(el.id, el.text)}
                  onClick={() => activeTool === 'select' && setSelectedOverlayId(el.id)}
                >
                  {lines.map((line, i) => (
                    <text
                      key={i}
                      x={el.x}
                      y={el.y + i * el.fontSize * 1.4}
                      fontSize={el.fontSize}
                      fill={el.color}
                      fontFamily="Georgia, serif"
                      paintOrder="stroke"
                      stroke="white"
                      strokeWidth={3}
                      strokeLinejoin="round"
                    >
                      {line}
                    </text>
                  ))}
                  {selectedOverlayId === el.id && (
                    <rect
                      x={el.x - 4}
                      y={el.y - el.fontSize}
                      width={Math.max(...lines.map((l) => l.length)) * el.fontSize * 0.6 + 8}
                      height={lines.length * el.fontSize * 1.4 + 4}
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="2"
                      strokeDasharray="6 4"
                      rx="3"
                      pointerEvents="none"
                    />
                  )}
                </g>
              );
            })}

          {/* Live pencil stroke */}
          {currentPath && currentPath.length > 1 && (
            <path
              d={pointsToD(currentPath)}
              stroke={pencilColor}
              strokeWidth={pencilWidth}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.8}
              pointerEvents="none"
            />
          )}

          {/* Delete button for selected overlay */}
          {selectedOverlayId && (() => {
            const ov = overlays.find((o) => o.id === selectedOverlayId);
            if (!ov) return null;
            const bx = ov.type === 'text' ? (ov as TextElement).x : (ov as DrawPath).points[0]?.x ?? 0;
            const by = ov.type === 'text' ? (ov as TextElement).y - (ov as TextElement).fontSize - 12 : (ov as DrawPath).points[0]?.y ?? 0;
            return (
              <g
                onClick={() => { onDeleteOverlay(selectedOverlayId); setSelectedOverlayId(null); }}
                style={{ cursor: 'pointer' }}
              >
                <circle cx={bx} cy={by} r={14} fill="#ef4444" />
                <text x={bx} y={by + 5} textAnchor="middle" fontSize={18} fill="white" pointerEvents="none">×</text>
              </g>
            );
          })()}
        </svg>
      </div>
    );
  }
);

SceneCanvas.displayName = 'SceneCanvas';