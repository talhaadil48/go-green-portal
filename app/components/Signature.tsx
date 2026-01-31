"use client";

import SignatureCanvas from "react-signature-canvas";
import { useRef, useEffect } from "react";

export default function Signature({ onSign }: { onSign: (dataUrl: string | null) => void }) {
  const sigRef = useRef<any>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-save ~500ms after the user stops drawing (debounced)
  const handleStrokeEnd = () => {
    // Clear any previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Wait a tiny bit to make sure drawing has really stopped
    timeoutRef.current = setTimeout(() => {
      if (!sigRef.current) return;

      if (sigRef.current.isEmpty()) {
        onSign(null);
      } else {
        const dataUrl = sigRef.current.toDataURL("image/png");
        onSign(dataUrl);
      }
    }, 500);
  };

  const clear = () => {
    if (sigRef.current) {
      sigRef.current.clear();
      onSign(null); // Immediately tell parent there is no signature
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="border border-gray-300 rounded-xl overflow-hidden bg-white shadow-sm">
      <SignatureCanvas
        ref={sigRef}
        canvasProps={{
          width: 480,
          height: 160,
          className: "sigCanvas",
        }}
        penColor="rgb(0,0,0)"
        dotSize={1.5}
        minWidth={1.2}
        maxWidth={2.5}
        onEnd={handleStrokeEnd}          
        // Optional: you can also use onBegin if needed
        // onBegin={() => console.log("started drawing")}
      />

      <div className="flex gap-3 p-3 bg-gray-50 border-t">
        <button
          type="button"
          onClick={clear}
          className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          Clear
        </button>
      </div>
    </div>
  );
}