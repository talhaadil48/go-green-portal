"use client";

import { useState, FormEvent } from "react";
import Signature from "../components/Signature";  // adjust path according to your folder structure

export default function StorageRecoveryAgreement() {
    const initialFormData = {
        name: "",
        postcode: "",
        address1: "",
        address2: "",

        vehicle_make: "",
        vehicle_model: "",
        registration_number: "",

        date_of_recovery: "",
        storage_start_date: "",
        storage_end_date: "",
        number_of_days: "",
        charges_per_day: "",
        total_storage_charge: "",
        recovery_charge: "",
        subtotal: "",
        vat_amount: "",
        invoice_total: "",

        client_date: "",
        owner_date: "",
    };

    const [formData, setFormData] = useState<Record<string, string>>(initialFormData);
    const [signatures, setSignatures] = useState<Record<string, string | null>>({});
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSignature = (field: string) => (dataUrl: string | null) => {
        setSignatures((prev) => ({ ...prev, [field]: dataUrl }));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const fullData = {
            ...formData,

            client_signature: signatures.client_signature || null,
            owner_signature: signatures.owner_signature || null,

       
        };

        try {
            const response = await fetch("/api/submit-storage-recovery", {
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
            <div className="max-w-6xl mx-auto px-6">
                <div className="bg-white/95 backdrop-blur-md shadow-2xl rounded-3xl p-10 border border-green-100">
                    <h2 className="text-3xl font-bold text-green-800 mb-10 text-center tracking-tight">
                        Storage and Recovery Invoice and Agreement
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-10">
                        {/* Client Details */}
                        <section className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Name:
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
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
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
                                    />
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Address 1:
                                    </label>
                                    <input
                                        type="text"
                                        name="address1"
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Address 2:
                                    </label>
                                    <input
                                        type="text"
                                        name="address2"
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
                                    />
                                </div>
                            </div>
                        </section>

                        {/* Vehicle Details */}
                        <section className="space-y-6">
                            <h3 className="text-xl font-semibold text-green-700 pb-2 border-b border-green-200">
                                Vehicle Information
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Vehicle Make:
                                    </label>
                                    <input
                                        type="text"
                                        name="vehicle_make"
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Vehicle Model:
                                    </label>
                                    <input
                                        type="text"
                                        name="vehicle_model"
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Registration Number:
                                    </label>
                                    <input
                                        type="text"
                                        name="registration_number"
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                                    />
                                </div>
                            </div>
                        </section>

                        {/* Dates & Charges */}
                        <section className="space-y-6">
                            <h3 className="text-xl font-semibold text-green-700 pb-2 border-b border-green-200">
                                Recovery & Storage Details
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Date of Recovery:
                                    </label>
                                    <input
                                        type="date"
                                        name="date_of_recovery"
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Storage Start Date:
                                    </label>
                                    <input
                                        type="date"
                                        name="storage_start_date"
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Storage End Date:
                                    </label>
                                    <input
                                        type="date"
                                        name="storage_end_date"
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Number of Days:
                                    </label>
                                    <input
                                        type="number"
                                        name="number_of_days"
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Charges Per Day:
                                    </label>
                                    <input
                                        type="text"
                                        name="charges_per_day"
                                        placeholder="£____.__"
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Total Storage Charge:
                                    </label>
                                    <input
                                        type="text"
                                        name="total_storage_charge"
                                        placeholder="£____.__"
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        1 x Recovery at:
                                    </label>
                                    <input
                                        type="text"
                                        name="recovery_charge"
                                        placeholder="£____.__"
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Subtotal:
                                    </label>
                                    <input
                                        type="text"
                                        name="subtotal"
                                        placeholder="£____.__"
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        VAT at 20%:
                                    </label>
                                    <input
                                        type="text"
                                        name="vat_amount"
                                        placeholder="£____.__"
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1 font-semibold">
                                        Invoice Total:
                                    </label>
                                    <input
                                        type="text"
                                        name="invoice_total"
                                        placeholder="£____.__"
                                        className="w-full px-6 py-4 text-xl font-bold border-2 border-green-400 rounded-xl bg-green-50 focus:ring-4 focus:ring-green-300 transition"
                                    />
                                </div>
                            </div>
                        </section>

                        {/* Terms & Conditions */}
                        <section className="space-y-6 bg-green-50 p-6 rounded-2xl border border-green-200">
                            <p className="text-gray-800 text-sm leading-relaxed">
                                I understand the recovery and storage costs are on a deferred payment basis and will be due and owing from me on completion of storage and that invoices are payable by me to Go Green Car Hire Ltd in no more than 1 instalment beginning from the date of this agreement within a period of no more than 51 weeks beginning from the date of this agreement.
                            </p>
                            <p className="text-gray-800 text-sm leading-relaxed">
                                It is my contractual obligation to pay the outstanding charges as provided by the deferred payment provision.
                            </p>
                            <p className="text-gray-800 text-sm leading-relaxed">
                                I further understand that if I fail to co-operate in the pursuit of my claim for damages or appoint other solicitors to act on my behalf then I understand and agree that the account for recovery and storage will be immediately due and be payable by me to Go Green Car Hire Ltd.
                            </p>
                            <p className="text-gray-800 text-sm leading-relaxed">
                                This contract constitutes all terms and conditions under this contract.
                            </p>
                            <p className="text-gray-800 text-sm leading-relaxed">
                                You have the right to cancel this agreement within 14 days starting with the date signed on this agreement. Written cancellation notice must be sent within 14 days either by post or email to the address stated above. I understand that any charges occurred will be liable to immediate payment by me.
                            </p>
                        </section>

                        {/* Signatures */}
                        <section className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Client’s Signature:
                                    </label>
                                    <Signature onSign={handleSignature("client_signature")} />
                                    <div className="mt-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Date:
                                        </label>
                                        <input
                                            type="date"
                                            name="client_date"
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Owner’s Signature:
                                    </label>
                                    <Signature onSign={handleSignature("owner_signature")} />
                                    <div className="mt-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Date:
                                        </label>
                                        <input
                                            type="date"
                                            name="owner_date"
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                                        />
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Storage Location */}
                        <div className="bg-green-50 p-6 rounded-2xl border border-green-200 text-center">
                            <h3 className="text-lg font-semibold text-green-800 mb-3">
                                Storage Location
                            </h3>
                            <p className="text-gray-700">
                                LITTLE BURTON EAST<br />
                                Burton-on-Trent, Staffordshire<br />
                                DE14 1PS
                            </p>
                            <p className="mt-3 text-gray-600">
                                Website: <a href="https://www.gogreenhire.co.uk" className="text-green-700 underline hover:text-green-900">www.gogreenhire.co.uk</a>
                            </p>
                        </div>

                        {/* Submit Button */}
                        <div className="text-center pt-8">
                            <button
                                type="submit"
                                className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-bold py-4 px-12 rounded-full text-lg shadow-xl transform hover:scale-105 transition-all duration-300"
                            >
                                Submit Agreement
                            </button>

                            {submitted && (
                                <p className="mt-6 text-green-700 font-medium animate-pulse">
                                    Agreement submitted! Check console for JSON output 🌿
                                </p>
                            )}
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}