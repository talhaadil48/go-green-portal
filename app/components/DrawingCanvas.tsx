"use client";

import { useRef, useEffect, useCallback } from "react";

interface DrawingCanvasProps {
  width: number;
  height: number;
  onDrawingChange: (dataUrl: string | null) => void;
  initialImage?: string | null;
  isFromApi?: boolean;
}

export default function DrawingCanvas({
  width,
  height,
  onDrawingChange,
  initialImage,
  isFromApi = false,
}: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const isInitialized = useRef(false);

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || isInitialized.current) return;

    const dpr = window.devicePixelRatio || 1;
    
    // Set the actual canvas size in memory (scaled for high DPI)
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    
    // Set the display size
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    // Scale for high DPI
    ctx.scale(dpr, dpr);
    
    // Fill with white background
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, width, height);
    
    // Set drawing styles
    ctx.strokeStyle = "#991b1b";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    isInitialized.current = true;
  }, [width, height]);

  const getPosition = useCallback((e: MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;
    
    if ("touches" in e && e.touches.length) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    const mouseEvent = e as MouseEvent;
    return {
      x: (mouseEvent.clientX - rect.left) * scaleX,
      y: (mouseEvent.clientY - rect.top) * scaleY,
    };
  }, [width, height]);

  const startDrawing = useCallback((e: MouseEvent | TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isDrawing.current = true;
    const pos = getPosition(e);
    lastPos.current = pos;
  }, [getPosition]);

  const draw = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDrawing.current) return;
    e.preventDefault();
    e.stopPropagation();
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const dpr = window.devicePixelRatio || 1;
    const pos = getPosition(e);
    
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.strokeStyle = "#991b1b";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    ctx.restore();
    
    lastPos.current = pos;
  }, [getPosition]);

  const stopDrawing = useCallback(() => {
    if (isDrawing.current) {
      isDrawing.current = false;
      const canvas = canvasRef.current;
      if (canvas) {
        onDrawingChange(canvas.toDataURL("image/png"));
      }
    }
  }, [onDrawingChange]);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    
    onDrawingChange(null);
  }, [onDrawingChange]);

  // Initialize canvas
  useEffect(() => {
    initCanvas();
  }, [initCanvas]);

  // Attach event listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseDown = (e: MouseEvent) => startDrawing(e);
    const handleMouseMove = (e: MouseEvent) => draw(e);
    const handleMouseUp = () => stopDrawing();
    const handleMouseLeave = () => stopDrawing();
    
    const handleTouchStart = (e: TouchEvent) => startDrawing(e);
    const handleTouchMove = (e: TouchEvent) => draw(e);
    const handleTouchEnd = () => stopDrawing();

    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("mouseleave", handleMouseLeave);
    canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
    canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
    canvas.addEventListener("touchend", handleTouchEnd);
    canvas.addEventListener("touchcancel", handleTouchEnd);

    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
      canvas.removeEventListener("touchstart", handleTouchStart);
      canvas.removeEventListener("touchmove", handleTouchMove);
      canvas.removeEventListener("touchend", handleTouchEnd);
      canvas.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [startDrawing, draw, stopDrawing]);

  // If from API, show image instead of canvas
  if (isFromApi && initialImage) {
    return (
      <div className="text-center">
        <img
          src={initialImage || "/placeholder.svg"}
          alt="Drawing"
          className="border-4 border-gray-400 rounded-2xl shadow-lg object-contain"
          style={{ width, height, maxWidth: "100%" }}
        />
        <p className="text-sm text-gray-500 mt-2 italic">
          (Saved drawing – view only)
        </p>
      </div>
    );
  }

  return (
    <div className="relative" style={{ width, height, maxWidth: "100%" }}>
      <canvas
        ref={canvasRef}
        className="border-4 border-gray-400 rounded-2xl shadow-lg cursor-crosshair bg-white"
        style={{ 
          width: "100%", 
          height: "100%",
          touchAction: "none",
          maxWidth: width,
          maxHeight: height
        }}
      />
      <button
        type="button"
        onClick={clearCanvas}
        className="absolute bottom-4 right-4 bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg text-sm shadow transition"
      >
        Clear
      </button>
    </div>
  );
}
