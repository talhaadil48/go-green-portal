'use client';
import React, { useEffect, useRef, useState } from 'react';
import { ICON_LIBRARY, IconType } from '@/lib/icons';
import { IconPalette } from './IconPalette';
import { SceneCanvas, CanvasOverlay, TextElement, DrawPath, ActiveTool } from './SceneCanvas';
import { ElementControls } from './ElementControl';
import { SceneControls } from './SceneControl';
import api from "@/lib/axios";

export interface SceneElement {
    id: string;
    iconId: string;
    x: number;
    y: number;
    rotation: number;
    scale: number;
    zIndex: number;
}

interface HistoryEntry {
    elements: SceneElement[];
    overlays: CanvasOverlay[];
}

interface SceneBuilderProps {
    claimId: string;
    type: string;
    afterJson?: any;
}

const TOOLS: { id: ActiveTool; label: string; icon: string; title: string }[] = [
    { id: 'select', label: '↖', icon: '↖', title: 'Select / Move' },
    { id: 'pencil', label: '✏', icon: '✏', title: 'Freehand Pencil – click & drag to draw' },
];

export const SceneBuilder: React.FC<SceneBuilderProps> = ({ claimId, type, afterJson }) => {
    const [elements, setElements] = useState<SceneElement[]>([]);
    const [overlays, setOverlays] = useState<CanvasOverlay[]>([]);
    const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
    const [history, setHistory] = useState<HistoryEntry[]>([{ elements: [], overlays: [] }]);
    const [historyIndex, setHistoryIndex] = useState(0);

    // Tool state
    const [activeTool, setActiveTool] = useState<ActiveTool>('select');
    const [pencilColor, setPencilColor] = useState('#ef4444');
    const [pencilWidth, setPencilWidth] = useState(4);
    const [textColor, setTextColor] = useState('#1e293b');
    const [fontSize, setFontSize] = useState(32);

    const svgRef = useRef<SVGSVGElement>(null);
    const nextIdRef = useRef(1);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    // Keep a ref to latest overlays so debounced callbacks always see fresh value
    const overlaysRef = useRef<CanvasOverlay[]>(overlays);
    overlaysRef.current = overlays;
    const elementsRef = useRef<SceneElement[]>(elements);
    elementsRef.current = elements;

    const selectedElement = selectedElementId
        ? elements.find((el) => el.id === selectedElementId)
        : null;

    const getSelectedIcon = (): IconType | undefined => {
        if (!selectedElement) return undefined;
        return ICON_LIBRARY.find((icon) => icon.id === selectedElement.iconId);
    };

    // ── Auto-load afterJson if provided ──────────────────────────────
    useEffect(() => {
        if (!afterJson) return;
        try {
            const loaded: SceneElement[] = Array.isArray(afterJson)
                ? afterJson
                : afterJson.elements ?? [];
            const loadedOverlays: CanvasOverlay[] = Array.isArray(afterJson)
                ? []
                : afterJson.overlays ?? [];
            setElements(loaded);
            setOverlays(loadedOverlays);
            setHistory([{ elements: loaded, overlays: loadedOverlays }]);
            setHistoryIndex(0);
            setSelectedElementId(null);
            const maxId = Math.max(
                ...loaded.map((el) => parseInt(el.id.split('-')[1] || '0')),
                0
            );
            nextIdRef.current = maxId + 1;
        } catch (err) {
            console.error('Failed to auto-load afterJson:', err);
        }
    }, [afterJson]);

    // ── Unified history (tracks both elements + overlays) ─────────────
    const pushHistory = (newElements: SceneElement[], newOverlays: CanvasOverlay[]) => {
        setHistory((prev) => {
            const trimmed = prev.slice(0, historyIndex + 1);
            return [...trimmed, { elements: newElements, overlays: newOverlays }];
        });
        setHistoryIndex((i) => i + 1);
    };

    const pushHistoryDebounced = (newElements: SceneElement[], newOverlays: CanvasOverlay[]) => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            pushHistory(newElements, newOverlays);
            debounceRef.current = null;
        }, 500);
    };

    // ── Icon element handlers ─────────────────────────────────────────
    const addElement = (iconId: string, x: number, y: number) => {
        const newElement: SceneElement = {
            id: `element-${nextIdRef.current++}`,
            iconId,
            x,
            y,
            rotation: 0,
            scale: 1,
            zIndex: elements.length,
        };
        const newElements = [...elements, newElement];
        setElements(newElements);
        pushHistory(newElements, overlaysRef.current);
        setSelectedElementId(newElement.id);
    };

    const updateElement = (id: string, updates: Partial<SceneElement>) => {
        const newElements = elements.map((el) =>
            el.id === id ? { ...el, ...updates } : el
        );
        setElements(newElements);
        pushHistoryDebounced(newElements, overlaysRef.current);
    };

    const deleteElement = (id: string) => {
        const newElements = elements.filter((el) => el.id !== id);
        setElements(newElements);
        pushHistory(newElements, overlaysRef.current);
        if (selectedElementId === id) setSelectedElementId(null);
    };

    const clearScene = () => {
        if (window.confirm('Clear all elements? This cannot be undone.')) {
            setElements([]);
            setOverlays([]);
            setHistory([{ elements: [], overlays: [] }]);
            setHistoryIndex(0);
            setSelectedElementId(null);
            nextIdRef.current = 1;
        }
    };

    const undo = () => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
            pushHistory(elementsRef.current, overlaysRef.current);
            debounceRef.current = null;
        }
        setHistoryIndex((i) => {
            if (i <= 0) return i;
            const newIndex = i - 1;
            setElements(history[newIndex].elements);
            setOverlays(history[newIndex].overlays);
            setSelectedElementId(null);
            return newIndex;
        });
    };

    const redo = () => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
            pushHistory(elementsRef.current, overlaysRef.current);
            debounceRef.current = null;
        }
        setHistoryIndex((i) => {
            if (i >= history.length - 1) return i;
            const newIndex = i + 1;
            setElements(history[newIndex].elements);
            setOverlays(history[newIndex].overlays);
            setSelectedElementId(null);
            return newIndex;
        });
    };

    // ── Overlay handlers ──────────────────────────────────────────────
    const handleAddTextElement = (el: TextElement) => {
        setOverlays((prev) => [...prev, el]);
    };

    const handleAddDrawPath = (path: DrawPath) => {
        const newOverlays = [...overlaysRef.current, path];
        setOverlays(newOverlays);
        pushHistory(elementsRef.current, newOverlays);
    };

    const handleUpdateTextElement = (id: string, text: string) => {
        const newOverlays = overlaysRef.current.map((o) =>
            o.id === id && o.type === 'text' ? { ...o, text } : o
        );
        setOverlays(newOverlays);
        pushHistory(elementsRef.current, newOverlays);
    };

    const handleDeleteOverlay = (id: string) => {
        const newOverlays = overlaysRef.current.filter((o) => o.id !== id);
        setOverlays(newOverlays);
        pushHistory(elementsRef.current, newOverlays);
    };

    // ── Export ────────────────────────────────────────────────────────
    const embedExternalImages = async (svgClone: SVGSVGElement) => {
        const imageElements = svgClone.querySelectorAll('image[href]');
        const promises: Promise<void>[] = [];

        imageElements.forEach((imgEl) => {
            const href = imgEl.getAttribute('href');
            if (!href || href.startsWith('data:')) return;

            const promise = fetch(href)
                .then((res) => {
                    if (!res.ok) throw new Error(`Failed to fetch image: ${href}`);
                    return res.blob();
                })
                .then((blob) => {
                    return new Promise<void>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => {
                            imgEl.setAttribute('href', reader.result as string);
                            resolve();
                        };
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                    });
                })
                .catch((err) => {
                    console.warn(`Could not embed ${href} during export:`, err);
                    const fallback = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                    fallback.setAttribute("x", imgEl.getAttribute("x") || "0");
                    fallback.setAttribute("y", imgEl.getAttribute("y") || "0");
                    fallback.setAttribute("width", imgEl.getAttribute("width") || "100");
                    fallback.setAttribute("height", imgEl.getAttribute("height") || "100");
                    fallback.setAttribute("fill", "#e2e8f0");
                    imgEl.parentNode?.replaceChild(fallback, imgEl);
                });

            promises.push(promise);
        });

        await Promise.all(promises);
    };

    const exportScene = async (format: 'json' | 'png' | 'svg') => {
        const wasSelected = selectedElementId;
        if (format !== 'json' && selectedElementId) {
            setSelectedElementId(null);
            await new Promise((r) => setTimeout(r, 50));
        }

        if (format === 'json') {
            const json = JSON.stringify({ elements, overlays }, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `scene-${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
            if (wasSelected) setSelectedElementId(wasSelected);
            return;
        }

        if (!svgRef.current) return;

        const EXPORT_W = 1200;
        const EXPORT_H = 800;

        const svgClone = svgRef.current.cloneNode(true) as SVGSVGElement;
        svgClone.setAttribute('width', String(EXPORT_W));
        svgClone.setAttribute('height', String(EXPORT_H));
        svgClone.setAttribute('viewBox', `0 0 ${EXPORT_W} ${EXPORT_H}`);
        svgClone.setAttribute('preserveAspectRatio', 'none');

        await embedExternalImages(svgClone);

        const svgString = new XMLSerializer().serializeToString(svgClone);

        let file: File | null = null;
        const fileName = `scene-${Date.now()}`;

        if (format === 'svg') {
            svgClone.setAttribute('preserveAspectRatio', 'xMidYMid meet');
            const finalSvgString = new XMLSerializer().serializeToString(svgClone);
            const blob = new Blob([finalSvgString], { type: 'image/svg+xml' });
            file = new File([blob], `${fileName}.svg`, { type: 'image/svg+xml' });
        } else {
            const canvas = document.createElement('canvas');
            canvas.width = EXPORT_W;
            canvas.height = EXPORT_H;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(0, 0, EXPORT_W, EXPORT_H);

            const img = new Image();
            img.crossOrigin = 'anonymous';

            await new Promise<void>((resolve, reject) => {
                img.onload = () => {
                    ctx.drawImage(img, 0, 0, EXPORT_W, EXPORT_H);
                    canvas.toBlob((blob) => {
                        if (blob) {
                            file = new File([blob], `${fileName}.png`, { type: 'image/png' });
                            resolve();
                        } else {
                            reject(new Error('canvas.toBlob failed'));
                        }
                    }, 'image/png', 1.0);
                };
                img.onerror = (err) => { console.error('PNG export failed', err); reject(err); };
                img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
            });

            if (!file) {
                alert('Failed to generate PNG');
                if (wasSelected) setSelectedElementId(wasSelected);
                return;
            }
        }

        try {
            const formData = new FormData();
            formData.append("claimId", claimId);
            formData.append("file", file!);
            formData.append("docname", (file! as File).name);

            const uploadRes = await fetch("/api/upload-docs", {
                method: "POST",
                body: formData,
            });

            if (!uploadRes.ok) {
                const err = await uploadRes.json();
                throw new Error(err.error || "Upload failed");
            }
            const json = JSON.stringify({ elements, overlays }, null, 2);
            const uploadData = await uploadRes.json();
            const uploadedUrl = uploadData.url;
            if (!uploadedUrl) throw new Error("No URL returned from upload");

            const backendRes = await api.put(`/api/accident-claims/${claimId}/direction`, {
                type: type,
                value: uploadedUrl,
                json_data: json
            }, {
                headers: { requiresAuth: true },
            });

            if (backendRes.status !== 200) throw new Error("Failed to save to backend");

            alert("Exported and saved successfully!");
        } catch (err: any) {
            console.error("Export/upload error:", err);
            alert("Failed to export/upload: " + (err.message || "Unknown error"));
        } finally {
            if (wasSelected) setSelectedElementId(wasSelected);
        }
    };

    const loadScene = (json: string) => {
        try {
            const parsed = JSON.parse(json);
            const loaded: SceneElement[] = Array.isArray(parsed) ? parsed : parsed.elements ?? [];
            const loadedOverlays: CanvasOverlay[] = Array.isArray(parsed) ? [] : parsed.overlays ?? [];
            setElements(loaded);
            setOverlays(loadedOverlays);
            setHistory([{ elements: loaded, overlays: loadedOverlays }]);
            setHistoryIndex(0);
            setSelectedElementId(null);
            const maxId = Math.max(
                ...loaded.map((el) => parseInt(el.id.split('-')[1] || '0')),
                0
            );
            nextIdRef.current = maxId + 1;
        } catch (err) {
            alert('Invalid JSON format');
        }
    };

    return (
        <div className="flex h-screen bg-slate-50">
            <IconPalette icons={ICON_LIBRARY} onIconSelect={addElement} />

            <div className="flex-1 flex flex-col">
                <SceneControls
                    elementCount={elements.length}
                    canUndo={historyIndex > 0}
                    canRedo={historyIndex < history.length - 1}
                    onUndo={undo}
                    onRedo={redo}
                    onClear={clearScene}
                    onExport={exportScene}
                    onLoad={loadScene}
                />

                {/* ── Drawing Tool Bar ── */}
                <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-slate-200">
                    {TOOLS.map((tool) => (
                        <button
                            key={tool.id}
                            title={tool.title}
                            onClick={() => setActiveTool(tool.id)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all ${
                                activeTool === tool.id
                                    ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                                    : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400'
                            }`}
                        >
                            {tool.icon} {tool.label !== tool.icon ? tool.label : ''}
                        </button>
                    ))}

                    <div className="h-6 w-px bg-slate-200 mx-1" />

                    {activeTool === 'pencil' && (
                        <>
                            <label className="flex items-center gap-1 text-xs text-slate-500">
                                Color
                                <input
                                    type="color"
                                    value={pencilColor}
                                    onChange={(e) => setPencilColor(e.target.value)}
                                    className="w-7 h-7 rounded cursor-pointer border border-slate-200"
                                />
                            </label>
                            <label className="flex items-center gap-1 text-xs text-slate-500">
                                Width
                                <input
                                    type="range"
                                    min={1}
                                    max={20}
                                    value={pencilWidth}
                                    onChange={(e) => setPencilWidth(Number(e.target.value))}
                                    className="w-24 accent-blue-600"
                                />
                                <span className="w-5 text-center">{pencilWidth}</span>
                            </label>
                            <span className="text-xs text-slate-400 ml-1">Click &amp; drag to draw • Select tool to delete strokes</span>
                        </>
                    )}

                    {activeTool === 'text' && (
                        <>
                            <label className="flex items-center gap-1 text-xs text-slate-500">
                                Color
                                <input
                                    type="color"
                                    value={textColor}
                                    onChange={(e) => setTextColor(e.target.value)}
                                    className="w-7 h-7 rounded cursor-pointer border border-slate-200"
                                />
                            </label>
                            <label className="flex items-center gap-1 text-xs text-slate-500">
                                Size
                                <input
                                    type="range"
                                    min={12}
                                    max={96}
                                    value={fontSize}
                                    onChange={(e) => setFontSize(Number(e.target.value))}
                                    className="w-24 accent-blue-600"
                                />
                                <span className="w-5 text-center">{fontSize}</span>
                            </label>
                            <span className="text-xs text-slate-400 ml-1">Click canvas to place • Double-click to edit • Cmd+Enter or blur to confirm</span>
                        </>
                    )}
                </div>

                <div className="flex-1 flex gap-4 p-4 overflow-hidden">
                    <div className="flex-[0.95] min-w-0">
                        <SceneCanvas
                            ref={svgRef}
                            elements={elements}
                            overlays={overlays}
                            selectedElementId={selectedElementId}
                            activeTool={activeTool}
                            pencilColor={pencilColor}
                            pencilWidth={pencilWidth}
                            textColor={textColor}
                            fontSize={fontSize}
                            onCanvasClick={() => setSelectedElementId(null)}
                            onElementClick={(id) => setSelectedElementId(id)}
                            onElementMove={(id, x, y) => updateElement(id, { x, y })}
                            onElementSelect={(id) => setSelectedElementId(id)}
                            onDropIcon={(iconId, x, y) => addElement(iconId, x, y)}
                            onAddTextElement={handleAddTextElement}
                            onAddDrawPath={handleAddDrawPath}
                            onUpdateTextElement={handleUpdateTextElement}
                            onDeleteOverlay={handleDeleteOverlay}
                        />
                    </div>

                    <div className="w-60 shrink-0">
                        {selectedElement && getSelectedIcon() && (
                            <ElementControls
                                element={selectedElement}
                                icon={getSelectedIcon()!}
                                onUpdate={updateElement}
                                onDelete={deleteElement}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};