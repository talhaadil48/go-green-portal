'use client';
import React, { useRef, useState, useCallback } from 'react';
import { ICON_LIBRARY, IconType, ICON_CATEGORIES } from '@/lib/icons';
import { IconPalette } from './IconPalette';
import { SceneCanvas } from './SceneCanvas';
import { ElementControls } from './ElementControl';
import { SceneControls } from './SceneControl';
import api from "@/lib/axios";           // ← your axios instance

export interface SceneElement {
    id: string;
    iconId: string;
    x: number;
    y: number;
    rotation: number;
    scale: number;
    zIndex: number;
}

interface SceneBuilderProps {
    claimId: string;
    type: string;       // "before" | "after"
}

export const SceneBuilder: React.FC<SceneBuilderProps> = ({ claimId, type }) => {
    const [elements, setElements] = useState<SceneElement[]>([]);
    const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
    const [history, setHistory] = useState<SceneElement[][]>([[]]);
    const [historyIndex, setHistoryIndex] = useState(0);
    const svgRef = useRef<SVGSVGElement>(null);
    const nextIdRef = useRef(1);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    const selectedElement = selectedElementId
        ? elements.find((el) => el.id === selectedElementId)
        : null;

    const getSelectedIcon = (): IconType | undefined => {
        if (!selectedElement) return undefined;
        return ICON_LIBRARY.find((icon) => icon.id === selectedElement.iconId);
    };

    const addToHistory = (newElements: SceneElement[]) => {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(newElements);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    };

    const addToHistoryDebounced = (newElements: SceneElement[]) => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            addToHistory(newElements);
            debounceRef.current = null;
        }, 500);
    };

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
        addToHistory(newElements);
        setSelectedElementId(newElement.id);
    };

    const updateElement = (id: string, updates: Partial<SceneElement>) => {
        const newElements = elements.map((el) =>
            el.id === id ? { ...el, ...updates } : el
        );
        setElements(newElements);
        addToHistoryDebounced(newElements);
    };

    const deleteElement = (id: string) => {
        const newElements = elements.filter((el) => el.id !== id);
        setElements(newElements);
        addToHistory(newElements);
        if (selectedElementId === id) setSelectedElementId(null);
    };

    const clearScene = () => {
        if (window.confirm('Clear all elements? This cannot be undone.')) {
            setElements([]);
            setHistory([[]]);
            setHistoryIndex(0);
            setSelectedElementId(null);
            nextIdRef.current = 1;
        }
    };

    const undo = () => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
            addToHistory(elements);
            debounceRef.current = null;
        }
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            setElements(history[newIndex]);
            setSelectedElementId(null);
        }
    };

    const redo = () => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
            addToHistory(elements);
            debounceRef.current = null;
        }
        if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            setElements(history[newIndex]);
            setSelectedElementId(null);
        }
    };

    // ────────────────────────────────────────────────
    //              MAIN CHANGE — Upload instead of download
    // ────────────────────────────────────────────────
    const exportScene = async (format: 'json' | 'png' | 'svg') => {
        setSelectedElementId(null); // Deselect to hide controls
        if (format === 'json') {
            // Keep JSON as local download
            const json = JSON.stringify(elements, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `scene-${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
            return;
        }

        if (!svgRef.current) return;

        // Prepare SVG content (same size for both png & svg)
        const svgClone = svgRef.current.cloneNode(true) as SVGSVGElement;
        svgClone.setAttribute('width', '1200');
        svgClone.setAttribute('height', '800');
        // svgClone.removeAttribute('viewBox'); // optional – pixel perfect

        const svgString = new XMLSerializer().serializeToString(svgClone);

        let file: File | null = null;
        let fileName: string = '';

        if (format === 'svg') {
            const blob = new Blob([svgString], { type: 'image/svg+xml' });
            file = new File([blob], `scene-${Date.now()}.svg`, { type: 'image/svg+xml' });
            fileName = file.name;
        } else {
            // PNG ───────────────────────────────────────
            const canvas = document.createElement('canvas');
            canvas.width = 1200;
            canvas.height = 800;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const img = new Image();
            img.crossOrigin = 'anonymous';

            await new Promise<void>((resolve, reject) => {
                img.onload = () => {
                    ctx.drawImage(img, 0, 0, 1200, 800);
                    canvas.toBlob((blob) => {
                        if (!blob) return reject(new Error("Canvas toBlob failed"));
                        file = new File([blob], `scene-${Date.now()}.png`, { type: 'image/png' });
                        fileName = file.name;
                        resolve();
                    }, 'image/png', 1.0);
                };
                img.onerror = reject;
                img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
            });

            if (!file) return;
        }

        // ─── Upload to /api/upload-document ────────────────────────────────
        try {
            const formData = new FormData();
            formData.append("claimId", claimId);
            formData.append("file", file);
            formData.append("docname", fileName);   // single file → single name

            const uploadRes = await fetch("/api/upload-docs", {
                method: "POST",
                body: formData,
            });

            if (!uploadRes.ok) {
                const err = await uploadRes.json();
                throw new Error(err.error || "Upload failed");
            }

            const uploadData = await uploadRes.json();

            // Assuming single file upload → take first uploaded url
            const uploadedUrl = uploadData.url;

            if (!uploadedUrl) {
                throw new Error("No URL returned from upload");
            }

            // ─── Send URL to backend direction endpoint ─────────────────────
            const backendRes = await api.put(`/api/accident-claims/${claimId}/direction`, {
                type: type,           // "before" or "after" — comes from props
                value: uploadedUrl,
            }, {
                headers: { requiresAuth: true },
            });

            if (backendRes.status !== 200) {
                throw new Error("Failed to save direction URL to backend");
            }

            // Optional: you can show a toast / add to UI list here

        } catch (err: any) {
            console.error(err);
            alert("Failed to upload/save scene: " + (err.message || "Unknown error"));
        }
    };

    const loadScene = (json: string) => {
        try {
            const loaded = JSON.parse(json) as SceneElement[];
            setElements(loaded);
            addToHistory(loaded);
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
            {/* Sidebar Palette */}
            <IconPalette icons={ICON_LIBRARY} onIconSelect={addElement} />

            {/* Main Canvas Area */}
            <div className="flex-1 flex flex-col">
                {/* Top Controls */}
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

                {/* Canvas + Right Panel */}
                <div className="flex-1 flex gap-4 p-4">
                    <SceneCanvas
                        ref={svgRef}
                        elements={elements}
                        selectedElementId={selectedElementId}
                        onCanvasClick={(e) => {
                            const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
                            const x = e.clientX - rect.left;
                            const y = e.clientY - rect.top;
                            setSelectedElementId(null);
                        }}
                        onElementClick={(id) => setSelectedElementId(id)}
                        onElementMove={(id, x, y) => updateElement(id, { x, y })}
                        onElementSelect={(id) => setSelectedElementId(id)}
                        onDropIcon={(iconId, x, y) => addElement(iconId, x, y)}
                    />

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
    );
};