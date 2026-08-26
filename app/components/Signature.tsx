"use client";

import SignatureCanvas from "react-signature-canvas";
import { useRef, useEffect, forwardRef, useImperativeHandle } from "react";

export interface SignatureHandle {
  getSignature: () => string | null;
  clear: () => void;
}

interface SignatureProps {
  onSign: (dataUrl: string | null) => void;
  /** When false, onSign is NOT called automatically on pen-lift.
   *  The canvas stays interactive so you can draw multiple strokes
   *  and only commit when you click a parent-provided Save button. */
  autoSave?: boolean;
}

const Signature = forwardRef<SignatureHandle, SignatureProps>(
  ({ onSign, autoSave = true }, ref) => {
    const sigRef = useRef<any>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Expose methods to parent via ref
    useImperativeHandle(ref, () => ({
      getSignature: () => {
        if (!sigRef.current) return null;
        if (sigRef.current.isEmpty()) return null;
        return sigRef.current.toDataURL("image/png");
      },
      clear: () => {
        if (sigRef.current) {
          sigRef.current.clear();
          onSign(null);
        }
      },
    }));

    // Auto-save ~500ms after the user stops drawing (debounced)
    // Only active when autoSave is true
    const handleStrokeEnd = () => {
      if (!autoSave) return;

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

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

    const handleClear = () => {
      if (sigRef.current) {
        sigRef.current.clear();
        onSign(null);
      }
    };

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
        />

        <div className="flex gap-3 p-3 bg-gray-50 border-t">
          <button
            type="button"
            onClick={handleClear}
            className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            Clear
          </button>
        </div>
      </div>
    );
  }
);

Signature.displayName = "Signature";

export default Signature;
