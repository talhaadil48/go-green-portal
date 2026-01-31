// components/ImageDrawEditor.tsx
'use client';

import { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';

export interface ImageDrawEditorRef {
  getAnnotatedImage: () => string | null;
  clear: () => void;
}

interface ImageDrawEditorProps {
  onImageChange?: (dataUrl: string | null) => void;
}

const ImageDrawEditor = forwardRef<ImageDrawEditorRef, ImageDrawEditorProps>(
  ({ onImageChange }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [isDrawing, setIsDrawing] = useState(false);
    const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);

    // Default background image (you can change this)
    const [bgImageSrc, setBgImageSrc] = useState("/image.jpeg");

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

      const handleResize = () => resizeCanvas(canvas, ctx);
      window.addEventListener('resize', handleResize);
      resizeCanvas(canvas, ctx);

      return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
      // Notify parent when background or drawing changes
      if (onImageChange) {
        const dataUrl = canvasRef.current?.toDataURL('image/png') || null;
        onImageChange(dataUrl);
      }
    }, [bgImageSrc, isDrawing]); // trigger also after drawing stops

    const loadBackground = (src: string, ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        resizeCanvas(canvas, ctx, img);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        // Optional: notify parent right after background loads
        if (onImageChange) onImageChange(canvas.toDataURL('image/png'));
      };
      img.src = src;
    };

    const resizeCanvas = (
      canvas: HTMLCanvasElement,
      ctx: CanvasRenderingContext2D,
      img?: HTMLImageElement
    ) => {
      if (!containerRef.current) return;

      canvas.width = containerRef.current.clientWidth;
      canvas.height = containerRef.current.clientHeight;

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
      setIsDrawing(false);
      context?.closePath();
      // Notify parent after drawing is finished
      if (onImageChange && canvasRef.current) {
        onImageChange(canvasRef.current.toDataURL('image/png'));
      }
    };

    // ─── Actions ──────────────────────────────────────────────
    const handleNewDrawing = () => {
      if (!context || !canvasRef.current) return;
      const canvas = canvasRef.current;
      context.clearRect(0, 0, canvas.width, canvas.height);
      loadBackground(bgImageSrc, context, canvas);
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
    }));

    return (
      <div className="w-full max-w-5xl mx-auto px-4 py-8">
        {/* Controls */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={handleNewDrawing}
            className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
          >
            New / Clear
          </button>

        

          <button
            onClick={handleSave}
            className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
          >
            Save Drawing
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
          Draw with red pen • Works on touch devices
        </p>
      </div>
    );
  }
);

ImageDrawEditor.displayName = 'ImageDrawEditor';

export default ImageDrawEditor;