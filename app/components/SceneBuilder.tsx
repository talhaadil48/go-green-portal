'use client';
import React, { useRef, useState } from 'react';
import { ICON_LIBRARY, IconType } from '@/lib/icons';
import { IconPalette } from './IconPalette';
import { SceneCanvas } from './SceneCanvas';
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

interface SceneBuilderProps {
    claimId: string;
    type: string; // "before" | "after"
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
            // Give React a chance to re-render without selection
            await new Promise((r) => setTimeout(r, 50));
        }

        if (format === 'json') {
            const json = JSON.stringify(elements, null, 2);
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

        // Export dimensions — must exactly match the viewBox (1200 × 800)
        // so nothing gets letterboxed or cropped.
        const EXPORT_W = 1200;
        const EXPORT_H = 800;

        // Clone the live SVG
        const svgClone = svgRef.current.cloneNode(true) as SVGSVGElement;

        // Set explicit pixel dimensions equal to the viewBox.
        // Setting preserveAspectRatio="none" ensures the SVG renderer
        // stretches to fill exactly EXPORT_W × EXPORT_H with no
        // letterbox bars — which is what was causing the ~10% crop.
        svgClone.setAttribute('width', String(EXPORT_W));
        svgClone.setAttribute('height', String(EXPORT_H));
        svgClone.setAttribute('viewBox', `0 0 ${EXPORT_W} ${EXPORT_H}`);
        svgClone.setAttribute('preserveAspectRatio', 'none');

        await embedExternalImages(svgClone);

        const svgString = new XMLSerializer().serializeToString(svgClone);

        let file: File | null = null;
        const fileName = `scene-${Date.now()}`;

        if (format === 'svg') {
            // For SVG files restore a sensible preserveAspectRatio
            svgClone.setAttribute('preserveAspectRatio', 'xMidYMid meet');
            const finalSvgString = new XMLSerializer().serializeToString(svgClone);
            const blob = new Blob([finalSvgString], { type: 'image/svg+xml' });
            file = new File([blob], `${fileName}.svg`, { type: 'image/svg+xml' });
        } else {
            // PNG export ────────────────────────────────────────────────
            const canvas = document.createElement('canvas');
            canvas.width = EXPORT_W;
            canvas.height = EXPORT_H;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Background
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(0, 0, EXPORT_W, EXPORT_H);

            const img = new Image();
            img.crossOrigin = 'anonymous';

            await new Promise<void>((resolve, reject) => {
                img.onload = () => {
                    // Draw at exact export size — no scaling gaps, no cropping
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

                img.onerror = (err) => {
                    console.error('PNG export failed – could not load SVG image', err);
                    reject(err);
                };

                img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
            });

            if (!file) {
                alert('Failed to generate PNG');
                if (wasSelected) setSelectedElementId(wasSelected);
                return;
            }
        }

        // Upload ───────────────────────────────────────────────────────
        try {
            const formData = new FormData();
            formData.append("claimId", claimId);
            formData.append("file", file!);
            formData.append("docname", file!.name);

            const uploadRes = await fetch("/api/upload-docs", {
                method: "POST",
                body: formData,
            });

            if (!uploadRes.ok) {
                const err = await uploadRes.json();
                throw new Error(err.error || "Upload failed");
            }

            const uploadData = await uploadRes.json();
            const uploadedUrl = uploadData.url;

            if (!uploadedUrl) throw new Error("No URL returned from upload");

            const backendRes = await api.put(`/api/accident-claims/${claimId}/direction`, {
                type: type,
                value: uploadedUrl,
            }, {
                headers: { requiresAuth: true },
            });

            if (backendRes.status !== 200) {
                throw new Error("Failed to save to backend");
            }

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

                <div className="flex-1 flex gap-4 p-4 overflow-hidden">
                    <div className="flex-[0.95] min-w-0">
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
                    </div>

                    {/* Fixed-width sidebar — always reserves space so canvas never resizes */}
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