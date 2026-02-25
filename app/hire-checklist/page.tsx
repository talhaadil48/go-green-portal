"use client";

import React, { useState, FormEvent, useRef, useEffect } from "react";
import Signature from "../components/Signature";
import ImageDrawEditor, { ImageDrawEditorRef } from "../components/ImageEditor";
import PDFShareButton from "../components/PDFShareButton";
import api from "@/lib/axios";

interface ChecklistForm {
    inspection_id: string;
    long_claim_id: string;
    car_id: number;
    claimant_id: number;
    date?: string;
    customer?: string;
    detailer?: string;
    order_number?: string;
    year?: string;
    make?: string;
    model?: string;
    notes?: string;
    recommendations?: string;
    customer_signature?: string | null;
    detailer_signature?: string | null;
    base_vehicle_image?: string | null;
    annotated_vehicle_image?: string | null;
    [key: string]: any;
}

export default function HireVehicleChecklist() {
    // ────────────────────────────────────────────────
    //  Replace useSearchParams with manual parsing
    // ────────────────────────────────────────────────
    const [longClaimId, setLongClaimId] = useState<string>("");
    const [carIdStr, setCarIdStr] = useState<string>("");
    const [claimantIdStr, setClaimantIdStr] = useState<string>("");

    useEffect(() => {
        const search = new URLSearchParams(window.location.search);

        const long = search.get("long_claim_id") || "";
        const car = search.get("car_id") || "";
        const claimant = search.get("claimant_id") || "";

        setLongClaimId(long);
        setCarIdStr(car);
        setClaimantIdStr(claimant);
    }, []);

    const carId = parseInt(carIdStr, 10);
    const claimantId = parseInt(claimantIdStr, 10);

    const isValid = !!longClaimId && !isNaN(carId) && !isNaN(claimantId);

    const [formData, setFormData] = useState<Record<string, string>>({});
    const [signatures, setSignatures] = useState<Record<string, string | null>>({
        customer: null,
        detailer: null,
    });

    const [isCustomerSigFromApi, setIsCustomerSigFromApi] = useState(false);
    const [isDetailerSigFromApi, setIsDetailerSigFromApi] = useState(false);
    const [isImageFromApi, setIsImageFromApi] = useState(false);
    const [apiAnnotatedImage, setApiAnnotatedImage] = useState<string | null>(null);

    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isFetching, setIsFetching] = useState(true);
    const [hasExistingRecord, setHasExistingRecord] = useState(false);

    const editorRef = useRef<ImageDrawEditorRef>(null);
    const customerSigRef = useRef<any>(null);
    const detailerSigRef = useRef<any>(null);

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
        acc[`condition_${index + 1}`] = "";
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

    useEffect(() => {
        if (isValid) {
            fetchChecklist();
        } else if (longClaimId || carIdStr || claimantIdStr) {
            // only show error after we actually tried to read params
            setIsFetching(false);
            setError("Missing required parameters: long_claim_id, car_id, claimant_id");
        }
    }, [longClaimId, carIdStr, claimantIdStr, isValid]);

    const fetchChecklist = async () => {
        setIsFetching(true);
        setError(null);

        try {
            const res = await api.get(
                `/api/hire-checklists/${encodeURIComponent(longClaimId)}/${carId}/${claimantId}`,
                { headers: { requiresAuth: true } }
            );

            const data = res.data;

            if (data && typeof data === "object" && !Array.isArray(data)) {
                loadForm(data as ChecklistForm);
                setHasExistingRecord(true);
            } else if (Array.isArray(data) && data.length > 0) {
                const latest = data[data.length - 1];
                loadForm(latest);
                setHasExistingRecord(true);
            } else {
                resetForm();
                setHasExistingRecord(false);
            }
        } catch (err: any) {
            console.error("Fetch error:", err);
            if (err.response?.status === 404) {
                resetForm();
                setHasExistingRecord(false);
            } else {
                setError("Failed to load hire checklist");
            }
        } finally {
            setIsFetching(false);
        }
    };

    const loadForm = (form: ChecklistForm) => {
        const updated = { ...initialFormData };

        Object.keys(form).forEach((key) => {
            if (key in updated && form[key] != null && form[key] !== "") {
                updated[key] = String(form[key]);
            }
        });

        setFormData(updated);

        setSignatures({
            customer: form.customer_signature || null,
            detailer: form.detailer_signature || null,
        });
        setIsCustomerSigFromApi(!!form.customer_signature);
        setIsDetailerSigFromApi(!!form.detailer_signature);

        setApiAnnotatedImage(form.annotated_vehicle_image || null);
        setIsImageFromApi(!!form.annotated_vehicle_image);
    };

    const resetForm = () => {
        setFormData(initialFormData);
        setSignatures({ customer: null, detailer: null });
        setIsCustomerSigFromApi(false);
        setIsDetailerSigFromApi(false);
        setApiAnnotatedImage(null);
        setIsImageFromApi(false);
        setSubmitted(false);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSignature = (field: "customer" | "detailer") => (dataUrl: string | null) => {
        setSignatures(prev => ({ ...prev, [field]: dataUrl }));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!isValid) {
            setError("Missing claim parameters");
            return;
        }

        setLoading(true);
        setError(null);

        let finalAnnotatedImage: string | null = null;

        if (isImageFromApi) {
            finalAnnotatedImage = apiAnnotatedImage;
        } else if (editorRef.current?.hasChanges()) {
            finalAnnotatedImage = editorRef.current.getAnnotatedImage();
        }

        const payload = {
            ...formData,
            long_claim_id: longClaimId,
            car_id: carId,
            claimant_id: claimantId,
            customer_signature: signatures.customer || null,
            detailer_signature: signatures.detailer || null,
            base_vehicle_image: null,
            annotated_vehicle_image: finalAnnotatedImage,
        };

        try {
            await fetch("/api/submit-hire-checklists", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            setSubmitted(true);
            await fetchChecklist(); // refresh after save
        } catch (err: any) {
            console.error("Submit error:", err);
            setError(err.response?.data?.detail || "Failed to save checklist");
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

    if (!isValid && (longClaimId || carIdStr || claimantIdStr)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-green-50">
                <div className="text-center p-8 bg-white rounded-2xl shadow-xl max-w-md">
                    <h2 className="text-2xl font-bold text-red-600 mb-4">Missing Parameters</h2>
                    <p className="text-gray-700">
                        Please include <strong>long_claim_id</strong>, <strong>car_id</strong> and <strong>claimant_id</strong> in the URL.
                    </p>
                    <p className="text-sm text-gray-500 mt-4">
                        Example:<br />
                        <code>?long_claim_id=CLAIM-ABC123&car_id=45&claimant_id=7</code>
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 py-12">
            <div className="max-w-5xl mx-auto px-5 sm:px-6 lg:px-8">
                <div className="bg-white/95 backdrop-blur-md shadow-2xl rounded-3xl p-6 sm:p-10 border border-green-100/50">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-10">
                        <h1 className="text-2xl font-extrabold text-green-900 text-center sm:text-left tracking-tight">
                            Hired Vehicle Checklist
                        </h1>

                        <PDFShareButton
                            formData={{
                                title: "Hired Vehicle Checklist",
                                formType: "pre-inspection",
                                claimId: longClaimId,
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
                                    value={formData.date || ""}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Customer</label>
                                <input
                                    type="text"
                                    name="customer"
                                    value={formData.customer || ""}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Detailer</label>
                                <input
                                    type="text"
                                    name="detailer"
                                    value={formData.detailer || ""}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Car Reg</label>
                                <input
                                    type="text"
                                    name="order_number"
                                    value={formData.order_number || ""}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Year</label>
                                <input
                                    type="text"
                                    name="year"
                                    value={formData.year || ""}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Make</label>
                                <input
                                    type="text"
                                    name="make"
                                    value={formData.make || ""}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Model</label>
                                <input
                                    type="text"
                                    name="model"
                                    value={formData.model || ""}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
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
                                        className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 px-5 bg-gradient-to-r from-white to-green-50/30 border border-gray-200 rounded-2xl hover:border-green-300 hover:shadow-md transition-all duration-200"
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
                                                        checked={(formData[fieldName] || "") === cond}
                                                        onChange={handleChange}
                                                        className="w-5 h-5 accent-green-600"
                                                    />
                                                    <span
                                                        className={`text-sm sm:text-base font-medium ${cond === "Good"
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
                                    value={formData.notes || ""}
                                    onChange={handleChange}
                                    rows={4}
                                    className="w-full px-5 py-4 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none outline-none transition-all"
                                    placeholder="Additional observations..."
                                />
                            </div>
                            <div>
                                <label className="block text-base font-semibold text-gray-800 mb-2.5">Recommendations</label>
                                <textarea
                                    name="recommendations"
                                    value={formData.recommendations || ""}
                                    onChange={handleChange}
                                    rows={4}
                                    className="w-full px-5 py-4 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none outline-none transition-all"
                                    placeholder="Suggested repairs or actions..."
                                />
                            </div>
                        </div>

                        {/* Image Editor */}
                        <div className="mb-12">
                            <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">Vehicle Condition Photo</h2>

                            {isImageFromApi && apiAnnotatedImage ? (
                                <div className="text-center space-y-3">
                                    <img
                                        src={apiAnnotatedImage}
                                        alt="Annotated vehicle condition"
                                        className="max-w-full mx-auto border-4 border-gray-300 rounded-2xl shadow-xl object-contain max-h-[600px]"
                                    />
                                    <p className="text-sm text-gray-600 italic">
                                        (Previously saved annotated image)
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => setIsImageFromApi(false)}
                                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg text-sm transition"
                                    >
                                        Update Photo
                                    </button>
                                </div>
                            ) : (
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
                                    <div className="text-center border border-green-300 rounded-xl p-6 bg-green-50 space-y-3">
                                        <img
                                            src={signatures.customer}
                                            alt="Customer signature"
                                            className="max-h-48 mx-auto object-contain"
                                        />
                                        <p className="text-sm text-green-700 font-medium">Saved signature</p>
                                        <button
                                            type="button"
                                            onClick={() => setIsCustomerSigFromApi(false)}
                                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg text-sm transition"
                                        >
                                            Update
                                        </button>
                                    </div>
                                ) : (
                                    <Signature ref={customerSigRef} onSign={handleSignature("customer")} />
                                )}
                            </div>

                            {/* Detailer Signature */}
                            <div className="bg-gradient-to-b from-white to-green-50/20 p-8 rounded-3xl border border-green-200 shadow-lg">
                                <label className="block text-xl font-bold text-green-900 mb-5 text-center">
                                    Detailer Signature
                                </label>

                                {isDetailerSigFromApi && signatures.detailer ? (
                                    <div className="text-center border border-green-300 rounded-xl p-6 bg-green-50 space-y-3">
                                        <img
                                            src={signatures.detailer}
                                            alt="Detailer signature"
                                            className="max-h-48 mx-auto object-contain"
                                        />
                                        <p className="text-sm text-green-700 font-medium">Saved signature</p>
                                        <button
                                            type="button"
                                            onClick={() => setIsDetailerSigFromApi(false)}
                                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg text-sm transition"
                                        >
                                            Update
                                        </button>
                                    </div>
                                ) : (
                                    <Signature ref={detailerSigRef} onSign={handleSignature("detailer")} />
                                )}
                            </div>
                        </div>

                        {/* Submit */}
                        <div className="text-center">
                            <button
                                type="submit"
                                disabled={loading}
                                className={`inline-flex items-center px-14 py-6 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-extrabold text-2xl rounded-full shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 ${loading ? "opacity-50 cursor-not-allowed" : ""
                                    }`}
                            >
                                {loading ? (
                                    <span className="flex items-center gap-3">
                                        <span className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></span>
                                        Saving...
                                    </span>
                                ) : hasExistingRecord ? (
                                    "Update Checklist"
                                ) : (
                                    "Submit Checklist"
                                )}
                            </button>

                            {submitted && (
                                <p className="mt-8 text-green-700 font-semibold text-lg animate-pulse">
                                    ✓ Checklist successfully {hasExistingRecord ? "updated" : "saved"}
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