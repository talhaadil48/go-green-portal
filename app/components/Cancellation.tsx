"use client";

import { useState, FormEvent, useEffect, useRef } from "react";
import axios from "axios";
import Signature from "../components/Signature"; // ← adjust path if needed

interface ClaimProps {
    claimId: string;
}

export default function CancellationNotice({ claimId }: ClaimProps) {
    const [currentClaimId, setCurrentClaimId] = useState<string>("");

    const initialFormData = {
        name: "",
        address: "",
        postcode: "",
        email: "",
        cancellation_date: "",
    };

    const [formData, setFormData] = useState<Record<string, string>>(initialFormData);
    const [signature, setSignature] = useState<string | null>(null);
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isFetching, setIsFetching] = useState(true);
    const [isSignatureFromApi, setIsSignatureFromApi] = useState(false);

    useEffect(() => {
        setCurrentClaimId(claimId);
    }, [claimId]);

    const fetchCancellationData = async () => {
        setIsFetching(true);
        setError(null);

        try {
            const response = await axios.get(
                `${process.env.NEXT_PUBLIC_API_URL}/api/cancellation-forms/${claimId}`
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

            if (data.cancellation_signature) {
                setSignature(data.cancellation_signature);
                setIsSignatureFromApi(true);           // ← important: mark as locked/external
            } else {
                setSignature(null);
                setIsSignatureFromApi(false);
            }
        } catch (err: any) {
            if (axios.isAxiosError(err) && err.response?.status === 404) {
                console.log("Cancellation form not found (404) → showing blank form");
            } else {
                console.error("Fetch error:", err);
                setError(err.message || "Failed to load cancellation data");
            }
        } finally {
            setIsFetching(false);
        }
    };

    useEffect(() => {
        if (claimId) {
            fetchCancellationData();
        }
    }, [claimId]);

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
            claim_id: currentClaimId,
        };

        try {
            const response = await axios.post("/api/submit-cancellation-form", fullData, {
                headers: { "Content-Type": "application/json" },
            });

            if (!response.data.success) {
                throw new Error(response.data.message || "Submission failed");
            }

            setSubmitted(true);
            await fetchCancellationData(); // refresh after submit
        } catch (err: any) {
            console.error("Submission error:", err);
            setError(err.message || "Something went wrong. Please try again.");
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
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 flex flex-col">
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
                                <span className="font-medium">{formData.name || "________"}</span>{" "}
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
                                        value={formData.name}
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
                                        value={formData.address}
                                        onChange={handleChange}
                                        rows={2}
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
                                        value={formData.postcode}
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
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                                    />
                                </div>
                            </div>

                            {/* Signature & Date */}
                            <div className="space-y-6 mt-8">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Signed:
                                    </label>

                                    {isSignatureFromApi && signature ? (
                                        // ── Locked view-only image from API (Cloudinary etc.)
                                        <div className="text-center border border-green-300 rounded-xl p-6 bg-green-50 max-w-md mx-auto">
                                            <img
                                                src={signature}
                                                alt="Saved signature from record"
                                                className="max-h-48 mx-auto object-contain"
                                            />
                                            <p className="mt-4 text-sm text-green-700 font-medium">
                                                Signature on file ✓ (from previous submission)
                                            </p>
                                        </div>
                                    ) : (
                                        // ── Editable canvas for new signatures
                                        <div className="mx-auto mt-10 border-2 border-dashed border-gray-300 rounded-xl bg-white w-[480px]">
                                            <Signature
                                                onSign={handleSignature}
                                            />
                                        </div>

                                    )}
                                </div>

                                {/* Date field stays the same */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Date
                                        </label>
                                        <input
                                            type="date"
                                            name="cancellation_date"
                                            value={formData.cancellation_date}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                                        />
                                    </div>
                                </div>
                            </div>

                        </div>

                        {/* Contact info reminder */}
                        <div className="text-center text-gray-600 text-sm">
                            Email: <strong>info@gogreenhire.co.uk</strong>
                        </div>

                        {/* Submit button */}
                        <div className="text-center pt-8">
                            <button
                                type="submit"
                                disabled={loading} // disable if already signed (optional – remove if you want to allow resubmit)
                                className={`
                  bg-gradient-to-r from-green-600 to-green-500 
                  hover:from-green-700 hover:to-green-600 
                  text-white font-bold py-4 px-12 
                  rounded-full text-lg shadow-xl 
                  transform hover:scale-105 transition-all duration-300 
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${loading ? "cursor-wait" : ""}
                `}
                            >
                                {loading
                                    ? "Submitting..."

                                    : "Submit Cancellation Notice"}
                            </button>

                            {error && (
                                <p className="mt-4 text-red-600 font-medium">{error}</p>
                            )}

                            {submitted && !loading && (
                                <p className="mt-6 text-green-700 font-medium">
                                    Cancellation notice submitted successfully 🌿
                                </p>
                            )}
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
}