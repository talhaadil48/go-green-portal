"use client";

import { useState, FormEvent } from "react";
import Signature from "../components/Signature";   // ← adjust path if needed

export default function CancellationNotice() {
  const initialFormData = {
    name: "",
    address: "",
    postcode: "",
    email: "",
    cancellation_date: "",
    // You can add contract_reference / agreement_date / vehicle_reg if needed later
  };

  const [formData, setFormData] = useState<Record<string, string>>(initialFormData);
  const [signature, setSignature] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSignature = (dataUrl: string | null) => {
    setSignature(dataUrl);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!signature) {
      setError("Please provide your signature before submitting.");
      return;
    }

    setLoading(true);
    setError(null);

    const fullData = {
      ...formData,
      cancellation_signature: signature,
     
    };

    try {
      const response = await fetch("/api/submit-cancellation-form", {
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
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 flex flex-col">
      {/* Header */}
    

      {/* Form Content */}
      <main className="flex-1 max-w-6xl mx-auto px-6 py-12 w-full">
        <div className="bg-white/95 backdrop-blur-md shadow-2xl rounded-3xl p-8 md:p-10 border border-green-100">
          <h2 className="text-3xl md:text-4xl font-bold text-green-800 mb-10 text-center tracking-tight">
            Cancellation Notice
          </h2>

          <form onSubmit={handleSubmit} className="space-y-10">
            {/* Intro text */}
            <div className="prose prose-green max-w-none text-gray-700 text-base leading-relaxed">
              <p>
                If you wish to cancel the contract, you must do so in writing and send the cancellation form below back to Go Green Car Hire Ltd by post or e-mail.
              </p>
            </div>

            {/* Send to block */}
            <div className="bg-green-50 p-6 rounded-2xl border border-green-200">
              <h3 className="text-lg font-semibold text-green-800 mb-3">To:</h3>
              <p className="text-gray-800 leading-relaxed">
                Go Green Car Hire Ltd<br />
                Derby Turn, Building 1<br />
                Derby Road<br />
                Burton-On-Trent<br />
                United Kingdom<br />
                DE14 1RX
              </p>
            </div>

            {/* Main cancellation statement */}
            <div className="bg-white p-6 md:p-8 rounded-2xl border border-green-200 shadow-sm">
              <p className="text-gray-800 text-lg leading-relaxed mb-6">
                I,{" "}
               
                hereby give notice that I wish to cancel my contract in respect of the storage and the hire agreement entered on:
              </p>

        

            

            {/* Personal details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name:
                </label>
                <input
                  type="text"
                  name="name"
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address:
                </label>
                <textarea
                  name="address"
                  rows={2}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Postcode:
                </label>
                <input
                  type="text"
                  name="postcode"
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email:
                </label>
                <input
                  type="email"
                  name="email"
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                />
              </div>
            </div>
              {/* Signature area with preview */}
              <div className="space-y-6 mt-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Signed:
                  </label>
                  <Signature onSign={handleSignature} />

                  {/* Preview of saved signature */}
                  
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      name="cancellation_date"
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Contact info reminder */}
            <div className="text-center text-gray-600 text-sm">
              Email: <strong>info@gogreenhire.co.uk</strong>
            </div>

            {/* Submit */}
            <div className="text-center pt-8">
              <button
                type="submit"
                className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-bold py-4 px-12 rounded-full text-lg shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!signature}
              >
                Submit Cancellation Notice
              </button>

              {submitted && (
                <p className="mt-6 text-green-700 font-medium animate-pulse">
                  Cancellation notice submitted — check console 🌿
                </p>
              )}
            </div>
          </form>
        </div>
      </main>

      {/* Footer */}
     
    </div>
  );
}