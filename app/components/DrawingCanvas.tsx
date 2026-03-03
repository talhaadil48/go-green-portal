"use client";

interface DrawingCanvasProps {
  width: number;
  height: number;
  onDrawingChange?: (dataUrl: string | null) => void;
  initialImage?: string | null;
  isFromApi?: boolean;
  type?: string;
  claimId?: string;
  json?: any;
}

export default function DrawingCanvas({
  width,
  height,
  isFromApi = false,
  initialImage,
  type,
  claimId,
}: DrawingCanvasProps) {
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
      {/* Blank white canvas */}
      <div
        className="border-4 border-gray-400 rounded-2xl shadow-lg bg-white"
        style={{ width: "100%", height: "100%" }}
      />

      {/* Draw button */}
      <div className="absolute bottom-4 right-4">
        <button
          type="button"
          onClick={() => window.open(`/draw?claim_id=${claimId}&type=${type}`, "_blank")}
          className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg text-sm shadow transition"
        >
          Draw
        </button>
      </div>
    </div>
  );
}