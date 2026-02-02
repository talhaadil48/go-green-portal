"use client";

import React, { useContext } from "react"

import { useState, FormEvent, useRef, useEffect } from "react";
import axios from "axios";
import Signature from "./Signature";
import ImageDrawEditor, { ImageDrawEditorRef } from "./ImageEditor"
import PDFShareButton from "./PDFShareButton";
import { UnsavedChangesContext } from "../claim/[id]/page";

interface PreInspectionChecklistProps {
  claimId: string;
}

export default function PreInspectionChecklist({ claimId }: PreInspectionChecklistProps) {
  const [currentClaimId, setCurrentClaimId] = useState<string>("");
  const unsavedChangesContext = useContext(UnsavedChangesContext);

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

  const initialChecklistState = checklistItems.reduce((acc, _, index) => {
    const key = `condition_${index + 1}`;
    acc[key] = "";
    return acc;
  }, {} as Record<string, string>);

  const initialFormData = {
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
  };

  const [formData, setFormData] = useState<Record<string, string>>(initialFormData);
  const [signatures, setSignatures] = useState<Record<string, string | null>>({
    customer: null,
    detailer: null,
  });

  // Only lock when data comes from API
  const [isCustomerSigFromApi, setIsCustomerSigFromApi] = useState(false);
  const [isDetailerSigFromApi, setIsDetailerSigFromApi] = useState(false);
  const [isImageFromApi, setIsImageFromApi] = useState(false);
  const [apiAnnotatedImage, setApiAnnotatedImage] = useState<string | null>(null);

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(true);

  const editorRef = useRef<ImageDrawEditorRef>(null);
  const customerSigRef = useRef(null);
  const detailerSigRef = useRef(null);

  useEffect(() => {
    setCurrentClaimId(claimId);
  }, [claimId]);

  const fetchChecklist = async () => {
    setIsFetching(true);
    setError(null);

    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/pre-inspection-forms/${claimId}`
      );

      const data = response.data;

      const updatedFormData = { ...initialFormData };

      Object.keys(data).forEach((key) => {
        const value = data[key];
        if (value !== null && value !== "" && key in updatedFormData) {
          updatedFormData[key] = value;
        }
      });

      setFormData(updatedFormData);

      // Customer Signature - only lock if it exists in API response
      if (data.customer_signature) {
        setSignatures((prev) => ({ ...prev, customer: data.customer_signature }));
        setIsCustomerSigFromApi(true);
      } else {
        setSignatures((prev) => ({ ...prev, customer: null }));
        setIsCustomerSigFromApi(false);
      }

      // Detailer Signature - only lock if it exists in API response
      if (data.detailer_signature) {
        setSignatures((prev) => ({ ...prev, detailer: data.detailer_signature }));
        setIsDetailerSigFromApi(true);
      } else {
        setSignatures((prev) => ({ ...prev, detailer: null }));
        setIsDetailerSigFromApi(false);
      }

      // Annotated image - only lock if it exists in API response
      if (data.annotated_vehicle_image) {
        setApiAnnotatedImage(data.annotated_vehicle_image);
        setIsImageFromApi(true);
      } else {
        setApiAnnotatedImage(null);
        setIsImageFromApi(false);
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        console.log("Pre-inspection not found (404) → showing blank form");
        // Reset to fresh state for new form
        setIsImageFromApi(false);
        setApiAnnotatedImage(null);
        setIsCustomerSigFromApi(false);
        setIsDetailerSigFromApi(false);
      } else {
        console.error("Fetch error:", err);
        setError(err instanceof Error ? err.message : "Failed to load checklist data");
      }
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    if (claimId) {
      fetchChecklist();
    }
  }, [claimId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Mark as changed when user modifies form
    if (unsavedChangesContext) {
      unsavedChangesContext.setHasUnsavedChanges(true);
    }
  };

  const handleSignature = (field: "customer" | "detailer") => (dataUrl: string | null) => {
    setSignatures((prev) => ({ ...prev, [field]: dataUrl }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Determine the annotated image to send:
    // - If image is from API, keep using it
    // - If editor has changes, get the annotated image
    // - If no changes (default or cleared), send null
    let finalAnnotatedImage: string | null = null;
    
    if (isImageFromApi) {
      // Keep the existing API image
      finalAnnotatedImage = apiAnnotatedImage;
    } else if (editorRef.current?.hasChanges()) {
      // Only get the image if user made changes (drawing or uploaded new image)
      finalAnnotatedImage = editorRef.current.getAnnotatedImage();
    } else {
      // No changes made (default image or cleared) - send null
      finalAnnotatedImage = null;
    }

    const fullData = {
      ...formData,
      customer_signature: signatures.customer || null,
      detailer_signature: signatures.detailer || null,
      base_vehicle_image: null,
      annotated_vehicle_image: finalAnnotatedImage,
      claim_id: currentClaimId,
    };

    try {
      const response = await axios.post("/api/submit-pre-inspection", fullData, {
        headers: { "Content-Type": "application/json" },
      });

      if (!response.data.success) {
        throw new Error(response.data.message || "Submission failed");
      }

      setSubmitted(true);
      if (unsavedChangesContext) {
        unsavedChangesContext.setHasUnsavedChanges(false);
      }
      await fetchChecklist(); // refresh → will lock images/signatures if they exist
    } catch (err: unknown) {
      console.error("Submission error:", err);
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-green-50">
        <div className="w-16 h-16 border-4 border-green-300 border-t-green-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 py-12">
      <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8">
        <div className="bg-white/95 backdrop-blur-md shadow-2xl rounded-3xl p-6 sm:p-10 border border-green-100/50">
<div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-10">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-green-900 text-center sm:text-left tracking-tight">
              Pre-Inspection Checklist
            </h1>
            <PDFShareButton
              formData={{
                title: "Pre-Inspection Checklist",
                formType: "pre-inspection",
                claimId: currentClaimId,
                data: formData,
                signatures: signatures,
                images: {
                  annotated_vehicle_image: apiAnnotatedImage || editorRef.current?.getAnnotatedImage() || null,
                },
              }}
            />
          </div>

          <form onSubmit={handleSubmit} className="space-y-10">
            {/* Basic Info */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Date</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Customer</label>
                <input
                  type="text"
                  name="customer"
                  value={formData.customer}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Detailer</label>
                <input
                  type="text"
                  name="detailer"
                  value={formData.detailer}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Order #</label>
                <input
                  type="text"
                  name="order_number"
                  value={formData.order_number}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Year</label>
                <input
                  type="text"
                  name="year"
                  value={formData.year}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Make</label>
                <input
                  type="text"
                  name="make"
                  value={formData.make}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Model</label>
                <input
                  type="text"
                  name="model"
                  value={formData.model}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 focus:border-green-500"
                />
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
                          <span
                            className={`text-sm sm:text-base font-medium ${
                              cond === "Good"
                                ? "text-green-700"
                                : cond === "Moderate"
                                ? "text-amber-700"
                                : "text-red-700"
                            }`}
                          >
                            {cond}
                          </span>
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
                  className="w-full px-5 py-4 border border-gray-300 rounded-2xl focus:ring-green-500 focus:border-green-500 resize-none"
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
                  className="w-full px-5 py-4 border border-gray-300 rounded-2xl focus:ring-green-500 focus:border-green-500 resize-none"
                  placeholder="Suggested repairs or actions..."
                />
              </div>
            </div>

            {/* Image Editor / View */}
            <div className="mb-12">
              <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">Vehicle Condition Photo</h2>

              {isImageFromApi && apiAnnotatedImage ? (
                // Show read-only image when it comes from API
                <div className="text-center">
                  <img
                    src={apiAnnotatedImage || "/placeholder.svg"}
                    alt="Annotated vehicle condition"
                    className="max-w-full mx-auto border-4 border-gray-300 rounded-2xl shadow-xl object-contain max-h-[600px]"
                  />
                  <p className="mt-4 text-sm text-gray-600 italic">
                    (Previously saved annotated image - view only)
                  </p>
                </div>
              ) : (
                // Show editable canvas when no API image exists
                <ImageDrawEditor 
                  ref={editorRef} 
                  defaultBackgroundSrc="/image.jpeg"
                />
              )}
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-12">
              {/* Customer Signature */}
              <div className="bg-gradient-to-b from-white to-green-50/20 p-8 rounded-3xl border border-green-200 shadow-lg">
                <label className="block text-xl font-bold text-green-900 mb-5 text-center">
                  Customer Signature
                </label>

                {isCustomerSigFromApi && signatures.customer ? (
                  <div className="text-center border border-green-300 rounded-xl p-6 bg-green-50">
                    <img
                      src={signatures.customer || "/placeholder.svg"}
                      alt="Customer signature"
                      className="max-h-48 mx-auto object-contain"
                    />
                    <p className="mt-4 text-sm text-green-700 font-medium">
                      Signature saved (from record)
                    </p>
                  </div>
                ) : (
                  <Signature 
                    ref={customerSigRef} 
                    onSign={handleSignature("customer")} 
                  />
                )}
              </div>

              {/* Detailer Signature */}
              <div className="bg-gradient-to-b from-white to-green-50/20 p-8 rounded-3xl border border-green-200 shadow-lg">
                <label className="block text-xl font-bold text-green-900 mb-5 text-center">
                  Detailer Signature
                </label>

                {isDetailerSigFromApi && signatures.detailer ? (
                  <div className="text-center border border-green-300 rounded-xl p-6 bg-green-50">
                    <img
                      src={signatures.detailer || "/placeholder.svg"}
                      alt="Detailer signature"
                      className="max-h-48 mx-auto object-contain"
                    />
                    <p className="mt-4 text-sm text-green-700 font-medium">
                      Signature saved (from record)
                    </p>
                  </div>
                ) : (
                  <Signature 
                    ref={detailerSigRef} 
                    onSign={handleSignature("detailer")} 
                  />
                )}
              </div>
            </div>

            {/* Submit */}
            <div className="text-center">
              <button
                type="submit"
                disabled={loading}
                className={`inline-flex items-center px-14 py-6 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-extrabold text-2xl rounded-full shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 ${
                  loading ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {loading ? "Submitting..." : "Submit Inspection Checklist"}
              </button>

              {submitted && (
                <p className="mt-8 text-green-700 font-semibold text-lg animate-pulse">
                  Checklist successfully submitted
                </p>
              )}
              {error && <p className="mt-8 text-red-700 font-semibold text-lg">{error}</p>}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
