"use client";

import { useState, FormEvent, useRef } from "react";
import Signature from "../components/Signature"; // adjust path if needed
import ImageDrawEditor, { ImageDrawEditorRef } from "../components/ImageEditor";

export default function PreInspectionChecklist() {
  const checklistItems = [
    "Deep Scratches",
    "Light Scratches",
    "Swirls / Holograms",
    "Clear Coat Failure",
    "Paint Chips",
    "Paint Oxidation",
    "Dents / Dings",
    "Body Rust",
    "Bumper Damage",
    "Wheel Damage",
    "Cracked Windshield",
    "Trunk Damage",
    "Ripped / Torn Flooring",
    "Ripped / Torn Seating",
    "Windshield Scratches / Chips",
    "Emblem Damaged / Missing",
    "Decal Damaged / Missing",
    "Cracked Headlight / Tail Light",
    "Fogged Headlight / Tail Light",
    "Tire Pressure",
    "Waterspot Density",
    "Floor Cleanliness",
    "Seat Cleanliness",
    "Glass Cleanliness",
    "Engine Bay Cleanliness",
    "Interior Cleanliness",
    "Exterior Cleanliness",
    "Dash / Console Cleanliness",
    "Interior Odour",
    "Pet Hair",
  ];

  // Create initial checklist state (condition_1: "", condition_2: "", etc.)
  const initialChecklistState = checklistItems.reduce((acc, _, index) => {
    const key = `condition_${index + 1}`;
    acc[key] = ""; // Will be "Good", "Moderate", or "Poor"
    return acc;
  }, {} as Record<string, string>);

  const initialFormData = {
    // All fields initialized (just like your accident claim example)
    ...initialChecklistState,

    date: "",
    customer: "",
    detailer: "",
    order_number: "",
    year: "",
    make: "",
    model: "",
    notes: "",
    recommendations: "",

    // We don't store base_vehicle_image in form state (handled by editor)
    // annotated_vehicle_image comes from canvas
    // signatures handled separately
  };

  const [formData, setFormData] = useState<Record<string, string>>(initialFormData);
  const [signatures, setSignatures] = useState<Record<string, string | null>>({});
  const [annotatedImage, setAnnotatedImage] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editorRef = useRef<ImageDrawEditorRef>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    let newValue: string | boolean = value;

    if (type === "radio") {
      // For radio buttons we just set the value
      newValue = value;
    }

    setFormData((prev) => ({ ...prev, [name]: newValue }));
  };

  const handleSignature = (field: string) => (dataUrl: string | null) => {
    setSignatures((prev) => ({ ...prev, [field]: dataUrl }));
  };

  const handleImageUpdate = (dataUrl: string | null) => {
    setAnnotatedImage(dataUrl);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Get the most up-to-date annotated image
    const finalImage = editorRef.current?.getAnnotatedImage() || annotatedImage;

    const fullData = {
      ...formData,
      customer_signature: signatures.customer || null,
      detailer_signature: signatures.detailer || null,
      base_vehicle_image: null, // can be added later if you implement photo upload
      annotated_vehicle_image: finalImage || null,
     
    };

    try {
      const response = await fetch("/api/submit-pre-inspection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fullData),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Submission failed");
      }

      setSubmitted(true);
    } catch (err: any) {
      console.error("Submission error:", err);
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 py-12">
      <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8">
        <div className="bg-white/95 backdrop-blur-md shadow-2xl rounded-3xl p-6 sm:p-10 border border-green-100/50">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-green-900 mb-10 text-center tracking-tight">
            Pre-Inspection Checklist
          </h1>

          <form onSubmit={handleSubmit} className="space-y-10">
            {/* Basic Info */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Date</label>
                <input type="date" name="date" value={formData.date} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Customer</label>
                <input type="text" name="customer" value={formData.customer} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Detailer</label>
                <input type="text" name="detailer" value={formData.detailer} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Order #</label>
                <input type="text" name="order_number" value={formData.order_number} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Year</label>
                <input type="text" name="year" value={formData.year} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Make</label>
                <input type="text" name="make" value={formData.make} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Model</label>
                <input type="text" name="model" value={formData.model} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500" />
              </div>
            </div>

            {/* Checklist */}
            <div className="space-y-3.5">
              {checklistItems.map((item, i) => {
                const fieldName = `condition_${i + 1}`;
                return (
                  <div
                    key={i}
                    className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 px-5 bg-gradient-to-r from-white to-green-50/30 border border-gray-200 rounded-2xl"
                  >
                    <span className="text-gray-900 font-medium text-base sm:text-lg mb-3 sm:mb-0 flex-1">
                      {i + 1}. {item}
                    </span>
                    <div className="flex gap-8 sm:gap-12">
                      {["Good", "Moderate", "Poor"].map((cond) => (
                        <label key={cond} className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="radio"
                            name={fieldName}
                            value={cond}
                            checked={formData[fieldName] === cond}
                            onChange={handleChange}
                            className="w-5 h-5 accent-green-600"
                          />
                          <span className={`text-sm sm:text-base font-medium ${
                            cond === "Good" ? "text-green-700" :
                            cond === "Moderate" ? "text-amber-700" : "text-red-700"
                          }`}>{cond}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Notes + Recommendations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-base font-semibold text-gray-800 mb-2.5">Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-5 py-4 border border-gray-300 rounded-2xl focus:ring-green-500 resize-none"
                  placeholder="Additional observations..."
                />
              </div>
              <div>
                <label className="block text-base font-semibold text-gray-800 mb-2.5">Recommendations</label>
                <textarea
                  name="recommendations"
                  value={formData.recommendations}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-5 py-4 border border-gray-300 rounded-2xl focus:ring-green-500 resize-none"
                  placeholder="Suggested repairs or actions..."
                />
              </div>
            </div>

            {/* Image Editor */}
            <div className="mb-12">
              <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">Vehicle Condition Photo (draw on it)</h2>
              <ImageDrawEditor ref={editorRef} onImageChange={handleImageUpdate} />
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-12">
              <div className="bg-gradient-to-b from-white to-green-50/20 p-8 rounded-3xl border border-green-200 shadow-lg">
                <label className="block text-xl font-bold text-green-900 mb-5 text-center">Customer Signature</label>
                <Signature onSign={handleSignature("customer")} />
              </div>

              <div className="bg-gradient-to-b from-white to-green-50/20 p-8 rounded-3xl border border-green-200 shadow-lg">
                <label className="block text-xl font-bold text-green-900 mb-5 text-center">Detailer Signature</label>
                <Signature onSign={handleSignature("detailer")} />
              </div>
            </div>

            {/* Submit */}
            <div className="text-center">
              <button
                type="submit"
                disabled={loading}
                className={`inline-flex items-center px-14 py-6 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-extrabold text-2xl rounded-full shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {loading ? "Submitting..." : "Submit Inspection Checklist"}
              </button>

              {submitted && (
                <p className="mt-8 text-green-700 font-semibold text-lg animate-pulse">
                  Checklist successfully submitted • Check server logs for full JSON 🌿
                </p>
              )}
              {error && <p className="mt-8 text-red-700 font-semibold text-lg">{error}</p>}
            </div>
          </form>

          {/* Footer */}
          <div className="text-center text-gray-600 text-sm mt-12 pt-8 border-t border-gray-200">
            Email: <strong className="text-green-700">info@gogreenhire.co.uk</strong> •
            Website: <strong className="text-green-700">www.gogreenhire.co.uk</strong>
          </div>
        </div>
      </div>
    </div>
  );
}