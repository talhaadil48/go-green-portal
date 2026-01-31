"use client";

import { useState, FormEvent, useRef } from "react";
import Signature from "../components/Signature"; // ← adjust path if needed
import ImageDrawEditor, { ImageDrawEditorRef } from "../components/ImageEditor";
export default function PreInspectionChecklist() {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [signatures, setSignatures] = useState<Record<string, string | null>>({});
  const [annotatedImage, setAnnotatedImage] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const editorRef = useRef<ImageDrawEditorRef>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSignature = (field: string) => (dataUrl: string | null) => {
    setSignatures((prev) => ({ ...prev, [field]: dataUrl }));
  };

  const handleImageUpdate = (dataUrl: string | null) => {
    setAnnotatedImage(dataUrl);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    // Final read from canvas (most up-to-date version)
    const finalImage = editorRef.current?.getAnnotatedImage() || annotatedImage;

    const fullData = {
      ...formData,
      customer_signature: signatures.customer,
      detailer_signature: signatures.detailer,
      base_vehicle_image: null,           // you can add logic later if needed
      annotated_vehicle_image: finalImage,
      submitted_at: new Date().toISOString(),
      form_type: "Pre-Inspection Checklist",
    };

    console.log("Pre-Inspection Checklist JSON:", JSON.stringify(fullData, null, 2));
    setSubmitted(true);
  };

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 py-12">
      <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8">
        <div className="bg-white/95 backdrop-blur-md shadow-2xl rounded-3xl p-6 sm:p-10 border border-green-100/50">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-green-900 mb-10 text-center tracking-tight">
            Pre-Inspection Checklist
          </h1>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-10">
            {/* Row 1 – 4 fields */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Date</label>
              <input
                type="date"
                name="date"
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Customer</label>
              <input
                type="text"
                name="customer"
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Detailer</label>
              <input
                type="text"
                name="detailer"
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Order #</label>
              <input
                type="text"
                name="order_number"
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-sm"
              />
            </div>

            {/* Row 2 – 3 fields */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Year</label>
              <input
                type="text"
                name="year"
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Make</label>
              <input
                type="text"
                name="make"
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Model</label>
              <input
                type="text"
                name="model"
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-sm"
              />
            </div>
          </div>

          {/* Checklist - line by line */}
          <div className="space-y-3.5 mb-12">
            {checklistItems.map((item, i) => (
              <div
                key={i}
                className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 px-5 bg-gradient-to-r from-white to-green-50/30 border border-gray-200 rounded-2xl hover:border-green-400 hover:shadow-md transition-all duration-200 group"
              >
                <span className="text-gray-900 font-medium text-base sm:text-lg mb-3 sm:mb-0 flex-1">
                  {i + 1}. {item}
                </span>

                <div className="flex gap-8 sm:gap-12">
                  {["Good", "Moderate", "Poor"].map((cond) => (
                    <label
                      key={cond}
                      className={`flex items-center gap-2.5 cursor-pointer transition-transform group-hover:scale-105 ${
                        cond === "Good"
                          ? "text-green-700"
                          : cond === "Moderate"
                          ? "text-amber-700"
                          : "text-red-700"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`condition_${i + 1}`}
                        value={cond}
                        onChange={handleChange}
                        className="w-5 h-5 accent-current"
                      />
                      <span className="text-sm sm:text-base font-medium">{cond}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Notes + Recommendations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            <div>
              <label className="block text-base font-semibold text-gray-800 mb-2.5">Notes</label>
              <textarea
                name="notes"
                rows={4}
                onChange={handleChange}
                className="w-full px-5 py-4 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition resize-none bg-white/70 shadow-sm"
                placeholder="Additional observations..."
              />
            </div>
            <div>
              <label className="block text-base font-semibold text-gray-800 mb-2.5">Recommendations</label>
              <textarea
                name="recommendations"
                rows={4}
                onChange={handleChange}
                className="w-full px-5 py-4 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition resize-none bg-white/70 shadow-sm"
                placeholder="Suggested repairs or actions..."
              />
            </div>
          </div>

          {/* Vehicle Image + Drawing */}
          <div className="mb-12">
            <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">
              Vehicle Condition Photo (draw on it)
            </h2>
            <ImageDrawEditor
              ref={editorRef}
              onImageChange={handleImageUpdate}
            />
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-12">
            <div className="bg-gradient-to-b from-white to-green-50/20 p-8 rounded-3xl border border-green-200 shadow-lg">
              <label className="block text-xl font-bold text-green-900 mb-5 text-center">
                Customer Signature
              </label>
              <Signature onSign={handleSignature("customer")} />
            </div>

            <div className="bg-gradient-to-b from-white to-green-50/20 p-8 rounded-3xl border border-green-200 shadow-lg">
              <label className="block text-xl font-bold text-green-900 mb-5 text-center">
                Detailer Signature
              </label>
              <Signature onSign={handleSignature("detailer")} />
            </div>
          </div>

          {/* Submit */}
          <div className="text-center">
            <button
              type="submit"
              onClick={handleSubmit}
              className="inline-flex items-center px-14 py-6 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-extrabold text-2xl rounded-full shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300"
            >
              Submit Inspection Checklist
            </button>

            {submitted && (
              <p className="mt-8 text-green-700 font-semibold text-lg animate-pulse">
                Checklist successfully submitted • Check console for full JSON 🌿
              </p>
            )}
          </div>

          {/* Footer info */}
          <div className="text-center text-gray-600 text-sm mt-12 pt-8 border-t border-gray-200">
            Email: <strong className="text-green-700">info@gogreenhire.co.uk</strong> •
            Website: <strong className="text-green-700">www.gogreenhire.co.uk</strong>
          </div>
        </div>
      </div>
    </div>
  );
}