'use client';

import React from "react"

import { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';

export interface ImageDrawEditorRef {
  getAnnotatedImage: () => string | null;
  clear: () => void;
  loadImage: (src: string) => void;
  hasChanges: () => boolean;
}

interface ImageDrawEditorProps {
  initialImage?: string | null;
  defaultBackgroundSrc?: string;
}

const ImageDrawEditor = forwardRef<ImageDrawEditorRef, ImageDrawEditorProps>(
  ({ initialImage, defaultBackgroundSrc = "/image.jpeg" }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const currentImageRef = useRef<HTMLImageElement | null>(null);

    const [isDrawing, setIsDrawing] = useState(false);
    const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);
    const [bgImageSrc, setBgImageSrc] = useState(initialImage || defaultBackgroundSrc);
    
    // Track if user has made any changes (drawing or uploading new image)
    const [isDirty, setIsDirty] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#ef4444'; // Tailwind red-500

      setContext(ctx);

      loadBackground(bgImageSrc, ctx, canvas);

      const handleResize = () => {
        if (currentImageRef.current) {
          resizeCanvas(canvas, ctx, currentImageRef.current);
        }
      };
      window.addEventListener('resize', handleResize);

      return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Update when initialImage changes (e.g., from API)
    useEffect(() => {
      if (initialImage && context && canvasRef.current) {
        setBgImageSrc(initialImage);
        loadBackground(initialImage, context, canvasRef.current);
      }
    }, [initialImage, context]);

    const loadBackground = (src: string, ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        currentImageRef.current = img;
        resizeCanvas(canvas, ctx, img);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.onerror = () => {
        // If image fails to load, try default background
        if (src !== defaultBackgroundSrc) {
          loadBackground(defaultBackgroundSrc, ctx, canvas);
        }
      };
      img.src = src;
    };

    const resizeCanvas = (
      canvas: HTMLCanvasElement,
      ctx: CanvasRenderingContext2D,
      img?: HTMLImageElement
    ) => {
      if (!containerRef.current) return;

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCtx.drawImage(canvas, 0, 0);
      }

      canvas.width = containerRef.current.clientWidth;
      canvas.height = containerRef.current.clientHeight;

      // Reset context properties after resize
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#ef4444';

      if (img) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      }
    };

    // ─── Drawing Logic ────────────────────────────────────────
    const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!context || !canvasRef.current) return;
      setIsDrawing(true);

      const rect = canvasRef.current.getBoundingClientRect();
      context.beginPath();
      context.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    };

    const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawing || !context || !canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      context.lineTo(e.clientX - rect.left, e.clientY - rect.top);
      context.stroke();
    };

    const stopDrawing = () => {
      if (isDrawing) {
        // Mark as dirty when user finishes a drawing stroke
        setIsDirty(true);
      }
      setIsDrawing(false);
      context?.closePath();
    };

    // ─── Actions ──────────────────────────────────────────────
    const handleNewDrawing = () => {
      if (!context || !canvasRef.current) return;
      const canvas = canvasRef.current;
      context.clearRect(0, 0, canvas.width, canvas.height);
      // Reload the current background image (clears drawings but keeps the image)
      loadBackground(bgImageSrc, context, canvas);
      // Reset dirty state when cleared - this means no changes to send
      setIsDirty(false);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (ev) => {
        const src = ev.target?.result as string;
        setBgImageSrc(src);
        if (context && canvasRef.current) {
          loadBackground(src, context, canvasRef.current);
        }
        // Mark as dirty when user uploads a new image
        setIsDirty(true);
      };
      reader.readAsDataURL(file);
    };

    const handleSave = () => {
      if (!canvasRef.current) return;
      const link = document.createElement('a');
      link.download = 'annotated-vehicle.png';
      link.href = canvasRef.current.toDataURL('image/png');
      link.click();
    };

    // Expose methods to parent via ref
    useImperativeHandle(ref, () => ({
      getAnnotatedImage: () => canvasRef.current?.toDataURL('image/png') || null,
      clear: handleNewDrawing,
      loadImage: (src: string) => {
        setBgImageSrc(src);
        if (context && canvasRef.current) {
          loadBackground(src, context, canvasRef.current);
        }
      },
      hasChanges: () => isDirty,
    }));

    return (
      <div className="w-full max-w-5xl mx-auto px-4 py-8">
        {/* Controls */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            type="button"
            onClick={handleNewDrawing}
            className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
          >
            Clear Drawing
          </button>

        
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageUpload}
            className="hidden"
          />
        </div>

        {/* Canvas container */}
        <div
          ref={containerRef}
          className="relative w-full aspect-[4/3] bg-gray-900 rounded-xl overflow-hidden border border-gray-700 shadow-2xl"
        >
          <canvas
            ref={canvasRef}
            onPointerDown={startDrawing}
            onPointerMove={draw}
            onPointerUp={stopDrawing}
            onPointerLeave={stopDrawing}
            className="absolute inset-0 w-full h-full touch-none cursor-crosshair"
          />
        </div>

        <p className="mt-4 text-center text-gray-400 text-sm">
          Draw with red pen - Works on touch devices
        </p>
      </div>
    );
  }
);

ImageDrawEditor.displayName = 'ImageDrawEditor';

export default ImageDrawEditor;
