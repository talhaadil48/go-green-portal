"use client";

import { useState, FormEvent } from "react";
import Signature from "../components/Signature";
export default function RentalAgreement() {
    const initialFormData = {
        // Hirer’s Details
        hirer_name: "",
        title: "",
        permanent_address: "",

        // Additional Driver
        additional_driver_name: "",
        licence_no: "",
        date_issued: "",
        expiry_date: "",
        dob: "",
        date_test_passed: "",
        occupation: "",

        // Hire Agreement Terms
        daily_rate: "",
        policy_excess: "",
        deposit: "",
        refuelling_charge: "",

        // Hirer’s Own Insurance
        insurance_company: "",
        policy_no: "",
        insurance_dates: "",
        own_insurance_confirm: "No",
        insurance_date: "",
        insurance_time: "",

        // Insurance Proposal
        motoring_offence_3yrs: "",
        disqualified_5yrs: "",
        accident_3yrs: "",
        insurance_declined_5yrs: "",
        dishonesty_conviction: "",

        // Medical Declaration
        medical_condition1: "",
        medical_condition2: "",
        medical_details: "",

        // Additional Driver Authorization
        additional_driver_auth: "",

        // Hire Vehicle
        hire_vehicle_reg: "",
        hire_vehicle_make: "",
        hire_vehicle_model: "",
        hire_vehicle_group: "",
        hire_vehicle_date_out: "",
        hire_vehicle_date_in: "",
        hire_vehicle_fuel_out: "",
        hire_vehicle_fuel_in: "",

        // Change of Hire Vehicle
        change_vehicle_reg: "",
        change_vehicle_make: "",
        change_vehicle_model: "",
        change_vehicle_group: "",
        change_vehicle_date_out: "",
        change_vehicle_date_in: "",
        change_vehicle_fuel_out: "",
        change_vehicle_fuel_in: "",

        // Charges Summary
        admin_fee: "",
        delivery_charge: "",
        cdw_per_day: "",
        days_out: "",
        days_in: "",
        total_days: "",
        rate_per_day: "",
        refuelling_total: "",
        subtotal: "",
        vat: "",
        total_cost: "",

        // Declaration & Liability
        declaration_date: "",
        liability_date: "",
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

    const handleRadio = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleCheckbox = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        setFormData((prev) => ({ ...prev, [name]: checked ? "Yes" : "No" }));
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
            hirer_signature_terms: signatures.hirer_signature_terms || null,
            company_signature: signatures.company_signature || null,
            hirer_signature_insurance: signatures.hirer_signature_insurance || null,
            declaration_signature: signatures.declaration_signature || null,
            liability_signature: signatures.liability_signature || null,

            submitted_at: new Date().toISOString(),
            form_type: "Rental Agreement",

            // Static legal texts (included for completeness in JSON)
        
        };

        try {
            const response = await fetch("/api/submit-rental-agreement", {
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
    }; return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 flex flex-col">
            {/* Header */}

            {/* Main Content */}
            <main className="flex-1 max-w-6xl mx-auto px-6 py-12 w-full">
                <div className="bg-white/95 backdrop-blur-md shadow-2xl rounded-3xl p-10 border border-green-100">
                    <h2 className="text-4xl font-bold text-green-800 mb-10 text-center tracking-tight">
                        Rental Agreement
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-12">
                        {/* Hirer’s Details */}
                        <section className="space-y-6">
                            <h3 className="text-2xl font-semibold text-green-700 pb-3 border-b border-green-200">
                                Hirer’s Details
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Hirer’s Name (in full):
                                    </label>
                                    <input
                                        type="text"
                                        name="hirer_name"
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Title (Mr / Mrs / Miss / Other):
                                    </label>
                                    <input
                                        type="text"
                                        name="title"
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Permanent Address:
                                </label>
                                <textarea
                                    name="permanent_address"
                                    onChange={handleChange}
                                    rows={3}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
                                />
                            </div>
                        </section>

                        {/* Additional Driver’s Details */}
                        <section className="space-y-6">
                            <h3 className="text-2xl font-semibold text-green-700 pb-3 border-b border-green-200">
                                Additional Driver’s Details
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="md:col-span-3">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Name (in full):
                                    </label>
                                    <input
                                        type="text"
                                        name="additional_driver_name"
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Driving Licence No:
                                    </label>
                                    <input
                                        type="text"
                                        name="licence_no"
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Date Issued:
                                    </label>
                                    <input
                                        type="date"
                                        name="date_issued"
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Expiry Date:
                                    </label>
                                    <input
                                        type="date"
                                        name="expiry_date"
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Date of Birth:
                                    </label>
                                    <input
                                        type="date"
                                        name="dob"
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Date Test Passed:
                                    </label>
                                    <input
                                        type="date"
                                        name="date_test_passed"
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                                    />
                                </div>
                                <div className="md:col-span-3">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Occupation:
                                    </label>
                                    <input
                                        type="text"
                                        name="occupation"
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                                    />
                                </div>
                            </div>
                        </section>

                        {/* Hire Agreement Terms */}
                        <section className="space-y-6">
                            <h3 className="text-2xl font-semibold text-green-700 pb-3 border-b border-green-200">
                                Hire Agreement Terms
                            </h3>
                            <p className="text-gray-700">
                                The Hirer agrees to hire the vehicle referred to above from Go Green Car Hire Ltd. in accordance with the terms set out in this Agreement.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Daily Rate of Charges:
                                    </label>
                                    <input
                                        type="text"
                                        name="daily_rate"
                                        placeholder="£______ per day"
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Policy Excess:
                                    </label>
                                    <input
                                        type="text"
                                        name="policy_excess"
                                        placeholder="£______ per day"
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Signature of Hirer:
                                    </label>
                                    <Signature onSign={handleSignature("hirer_signature_terms")} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Signed by (for and on behalf of Go Green Car Hire Ltd.):
                                    </label>
                                    <Signature onSign={handleSignature("company_signature")} />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Deposit Payment:
                                    </label>
                                    <input
                                        type="text"
                                        name="deposit"
                                        placeholder="£______"
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                                    />
                                    <p className="text-sm text-gray-600 mt-1 text-xs">
                                        (Required against loss or misuse of any fire extinguisher, first aid kit, or other sundry items relating to the vehicle. See Deposit Payment section for full terms and conditions.)
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Refuelling Charge:
                                    </label>
                                    <input
                                        type="text"
                                        name="refuelling_charge"
                                        placeholder="£______"
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                                    />
                                    <p className="text-sm text-gray-600 mt-1 text-xs">
                                        (Will apply if the vehicle is returned with less fuel than at the start of the hire.)
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* Hirer’s Own Insurance */}
                        <section className="space-y-6">
                            <h3 className="text-2xl font-semibold text-green-700 pb-3 border-b border-green-200">
                                Hirer’s Own Insurance (if applicable)
                            </h3>
                            <div className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Insurance Company:
                                    </label>
                                    <input
                                        type="text"
                                        name="insurance_company"
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Policy / Certificate No:
                                    </label>
                                    <input
                                        type="text"
                                        name="policy_no"
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Start and Expiry Date:
                                    </label>
                                    <input
                                        type="text"
                                        name="insurance_dates"
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                                    />
                                </div>
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        name="own_insurance_confirm"
                                        onChange={handleCheckbox}
                                        className="h-5 w-5 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                                    />
                                    <label className="ml-3 text-sm text-gray-700">
                                        I confirm that the hire will be covered by my own insurance for comprehensive risks.
                                    </label>
                                </div>
                                <div className="mt-6">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Hirer’s Signature:
                                    </label>
                                    <Signature onSign={handleSignature("hirer_signature_insurance")} />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Date:
                                        </label>
                                        <input
                                            type="date"
                                            name="insurance_date"
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Time:
                                        </label>
                                        <input
                                            type="time"
                                            name="insurance_time"
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                                        />
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Insurance Proposal */}
                        <section className="space-y-6">
                            <h3 className="text-2xl font-semibold text-green-700 pb-3 border-b border-green-200">
                                Insurance Proposal (if not using own insurance / intended use other than social, domestic, and pleasure)
                            </h3>
                            <p className="text-gray-700">Please answer the following:</p>
                            <div className="space-y-4">
                                {[
                                    {
                                        question:
                                            "Have you been convicted or received notice of intended prosecution for any motoring offence (including endorsable fixed penalty offences) in the last 3 years?",
                                        name: "motoring_offence_3yrs",
                                    },
                                    {
                                        question: "Have you been disqualified from driving in the last 5 years?",
                                        name: "disqualified_5yrs",
                                    },
                                    {
                                        question:
                                            "Have you been involved in any motoring accident or loss in the last 3 years?",
                                        name: "accident_3yrs",
                                    },
                                    {
                                        question:
                                            "Has any motoring insurance proposal been declined, non-renewed, cancelled, or had special conditions applied in the last 5 years?",
                                        name: "insurance_declined_5yrs",
                                    },
                                    {
                                        question:
                                            "Have you ever been convicted or received notice of intended prosecution involving dishonesty of any kind?",
                                        name: "dishonesty_conviction",
                                    },
                                ].map((item) => (
                                    <div
                                        key={item.name}
                                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                                    >
                                        <label className="text-sm text-gray-700 flex-1">
                                            {item.question}
                                        </label>
                                        <div className="flex gap-8">
                                            <label className="flex items-center">
                                                <input
                                                    type="radio"
                                                    name={item.name}
                                                    value="Yes"
                                                    onChange={handleRadio}
                                                    className="h-4 w-4 text-green-600 focus:ring-green-500"
                                                />
                                                <span className="ml-2">Yes</span>
                                            </label>
                                            <label className="flex items-center">
                                                <input
                                                    type="radio"
                                                    name={item.name}
                                                    value="No"
                                                    onChange={handleRadio}
                                                    className="h-4 w-4 text-green-600 focus:ring-green-500"
                                                />
                                                <span className="ml-2">No</span>
                                            </label>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Medical Declaration */}
                        <section className="space-y-6">
                            <h3 className="text-2xl font-semibold text-green-700 pb-3 border-b border-green-200">
                                Medical Declaration
                            </h3>
                            <p className="text-gray-700">Do you suffer from:</p>
                            <div className="space-y-4">
                                {[
                                    {
                                        q: "Diabetes, fits, heart condition, or take regular prescribed medication?",
                                        name: "medical_condition1",
                                    },
                                    {
                                        q: "Any other disease or physical infirmity which could impair your ability to drive?",
                                        name: "medical_condition2",
                                    },
                                ].map((item) => (
                                    <div
                                        key={item.name}
                                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                                    >
                                        <label className="text-sm text-gray-700 flex-1">
                                            {item.q}
                                        </label>
                                        <div className="flex gap-8">
                                            <label className="flex items-center">
                                                <input
                                                    type="radio"
                                                    name={item.name}
                                                    value="Yes"
                                                    onChange={handleRadio}
                                                    className="h-4 w-4 text-green-600 focus:ring-green-500"
                                                />
                                                <span className="ml-2">Yes</span>
                                            </label>
                                            <label className="flex items-center">
                                                <input
                                                    type="radio"
                                                    name={item.name}
                                                    value="No"
                                                    onChange={handleRadio}
                                                    className="h-4 w-4 text-green-600 focus:ring-green-500"
                                                />
                                                <span className="ml-2">No</span>
                                            </label>
                                        </div>
                                    </div>
                                ))}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        If “Yes” to any above, please give details:
                                    </label>
                                    <textarea
                                        name="medical_details"
                                        onChange={handleChange}
                                        rows={3}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                                    />
                                </div>
                            </div>
                        </section>

                        {/* Additional Driver Authorization */}
                        <section className="space-y-6">
                            <h3 className="text-2xl font-semibold text-green-700 pb-3 border-b border-green-200">
                                Additional Driver Authorization
                            </h3>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <label className="text-sm text-gray-700">
                                    Will any other person drive the vehicle during the hire period?
                                </label>
                                <div className="flex gap-8">
                                    <label className="flex items-center">
                                        <input
                                            type="radio"
                                            name="additional_driver_auth"
                                            value="Yes"
                                            onChange={handleRadio}
                                            className="h-4 w-4 text-green-600 focus:ring-green-500"
                                        />
                                        <span className="ml-2">Yes</span>
                                    </label>
                                    <label className="flex items-center">
                                        <input
                                            type="radio"
                                            name="additional_driver_auth"
                                            value="No"
                                            onChange={handleRadio}
                                            className="h-4 w-4 text-green-600 focus:ring-green-500"
                                        />
                                        <span className="ml-2">No</span>
                                    </label>
                                </div>
                            </div>
                            <p className="text-sm text-gray-600 italic mt-2">
                                (If yes, a separate additional driver form must be completed by each additional driver.)
                            </p>
                        </section>

                        {/* VERY IMPORTANT */}
                        <div className="bg-green-50 p-6 rounded-2xl border border-green-200">
                            <h3 className="text-xl font-bold text-green-800 mb-3">VERY IMPORTANT:</h3>
                            <p className="text-gray-700 text-sm leading-relaxed">
                                You are reminded of the need to disclose any fact which the insurers would take into account in the assessment and acceptance of the proposal. If you have any doubt as to whether certain facts are relevant, please contact the self-drive hire operator. It is an offence under the Road Traffic Acts to make a false statement or withhold any material information for the purpose of obtaining motor insurance.
                            </p>
                        </div>

                        {/* 1984 Data Protection Act */}
                        <div className="bg-green-50 p-6 rounded-2xl border border-green-200">
                            <h3 className="text-xl font-bold text-green-800 mb-3">
                                1984 Data Protection Act
                            </h3>
                            <p className="text-gray-700 text-sm leading-relaxed">
                                Insurers maintain a motor insurance anti-fraud and theft register. In line with the 1984 Data Protection Act’s first data protection principle, which is concerned with the obtaining of information, insurance companies exchange information with each other to detect fraudulent claims.
                            </p>
                        </div>

                        {/* Declaration */}
                        <section className="space-y-6">
                            <h3 className="text-2xl font-semibold text-green-700 pb-3 border-b border-green-200">
                                Declaration
                            </h3>
                            <p className="text-gray-700 italic text-sm leading-relaxed">
                                I declare that all statements and particulars given by me in this proposal, which I have read over, are correct, and no material fact has been omitted, misrepresented, or mis-stated. I am not aware of any other circumstances likely to affect the risk.
                            </p>
                            <p className="text-gray-700 italic text-sm leading-relaxed">
                                I understand that I shall not allow the vehicle to be driven by any person not authorised by the underwriter to drive the vehicle during the period of hire.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Hirer’s Signature:
                                    </label>
                                    <Signature onSign={handleSignature("declaration_signature")} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Date:
                                    </label>
                                    <input
                                        type="date"
                                        name="declaration_date"
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                                    />
                                </div>
                            </div>
                        </section>

                        {/* Hire Vehicle */}
                        <section className="space-y-6">
                            <h3 className="text-2xl font-semibold text-green-700 pb-3 border-b border-green-200">
                                Hire Vehicle
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Reg:
                                    </label>
                                    <input
                                        type="text"
                                        name="hire_vehicle_reg"
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Make:
                                    </label>
                                    <input
                                        type="text"
                                        name="hire_vehicle_make"
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Model:
                                    </label>
                                    <input
                                        type="text"
                                        name="hire_vehicle_model"
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Group:
                                    </label>
                                    <input
                                        type="text"
                                        name="hire_vehicle_group"
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Date out:
                                    </label>
                                    <input
                                        type="date"
                                        name="hire_vehicle_date_out"
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Date in:
                                    </label>
                                    <input
                                        type="date"
                                        name="hire_vehicle_date_in"
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Fuel out:
                                    </label>
                                    <input
                                        type="text"
                                        name="hire_vehicle_fuel_out"
                                        placeholder="e.g. Full / 3/4 / 1/2"
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Fuel in:
                                    </label>
                                    <input
                                        type="text"
                                        name="hire_vehicle_fuel_in"
                                        placeholder="e.g. Full / 3/4 / 1/2"
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                                    />
                                </div>
                            </div>
                        </section>

                        {/* Change of Hire Vehicle */}
                        <section className="space-y-6">
                            <h3 className="text-2xl font-semibold text-green-700 pb-3 border-b border-green-200">
                                Change of Hire Vehicle
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Reg:
                                    </label>
                                    <input
                                        type="text"
                                        name="change_vehicle_reg"
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Make:
                                    </label>
                                    <input
                                        type="text"
                                        name="change_vehicle_make"
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Model:
                                    </label>
                                    <input
                                        type="text"
                                        name="change_vehicle_model"
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Group:
                                    </label>
                                    <input
                                        type="text"
                                        name="change_vehicle_group"
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Date out:
                                    </label>
                                    <input
                                        type="date"
                                        name="change_vehicle_date_out"
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Date in:
                                    </label>
                                    <input
                                        type="date"
                                        name="change_vehicle_date_in"
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Fuel out:
                                    </label>
                                    <input
                                        type="text"
                                        name="change_vehicle_fuel_out"
                                        placeholder="e.g. Full / 3/4 / 1/2"
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Fuel in:
                                    </label>
                                    <input
                                        type="text"
                                        name="change_vehicle_fuel_in"
                                        placeholder="e.g. Full / 3/4 / 1/2"
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                                    />
                                </div>
                            </div>
                            <p className="text-sm text-gray-500 italic mt-4">
                                (Leave blank if no vehicle change occurred during the hire period)
                            </p>
                        </section>

                        {/* Charges Summary */}
                        <section className="space-y-6 bg-gradient-to-br from-green-50 to-white p-8 rounded-2xl border border-green-200 shadow-inner">
                            <h3 className="text-2xl font-semibold text-green-800 pb-4 border-b border-green-300">
                                Charges Summary
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Admin Fee
                                    </label>
                                    <input
                                        type="text"
                                        name="admin_fee"
                                        placeholder="£0.00"
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white/80 focus:ring-2 focus:ring-green-500 transition"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Delivery Charge
                                    </label>
                                    <input
                                        type="text"
                                        name="delivery_charge"
                                        placeholder="£0.00"
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white/80 focus:ring-2 focus:ring-green-500 transition"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        CDW Per Day
                                    </label>
                                    <input
                                        type="text"
                                        name="cdw_per_day"
                                        placeholder="£0.00"
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white/80 focus:ring-2 focus:ring-green-500 transition"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Days Out
                                    </label>
                                    <input
                                        type="number"
                                        name="days_out"
                                        placeholder="0"
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white/80 focus:ring-2 focus:ring-green-500 transition"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Days In
                                    </label>
                                    <input
                                        type="number"
                                        name="days_in"
                                        placeholder="0"
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white/80 focus:ring-2 focus:ring-green-500 transition"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Total Days
                                    </label>
                                    <input
                                        type="number"
                                        name="total_days"
                                        placeholder="0"
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white/80 focus:ring-2 focus:ring-green-500 transition"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Rate per Day
                                    </label>
                                    <input
                                        type="text"
                                        name="rate_per_day"
                                        placeholder="£0.00"
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white/80 focus:ring-2 focus:ring-green-500 transition"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Refuelling @
                                    </label>
                                    <input
                                        type="text"
                                        name="refuelling_total"
                                        placeholder="£0.00"
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white/80 focus:ring-2 focus:ring-green-500 transition"
                                    />
                                </div>

                                <div className="sm:col-span-2 lg:col-span-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Subtotal
                                    </label>
                                    <input
                                        type="text"
                                        name="subtotal"
                                        placeholder="£0.00"
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white/80 focus:ring-2 focus:ring-green-500 transition"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        VAT at __%
                                    </label>
                                    <input
                                        type="text"
                                        name="vat"
                                        placeholder="£0.00"
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white/80 focus:ring-2 focus:ring-green-500 transition"
                                    />
                                </div>

                                <div className="sm:col-span-2 lg:col-span-3 mt-4">
                                    <label className="block text-xl font-bold text-green-800 mb-2">
                                        Total Cost
                                    </label>
                                    <input
                                        type="text"
                                        name="total_cost"
                                        placeholder="£0.00"
                                        onChange={handleChange}
                                        className="w-full px-6 py-5 text-2xl font-bold border-2 border-green-400 rounded-2xl bg-green-50 focus:ring-4 focus:ring-green-300 transition shadow-md"
                                    />
                                    <p className="text-sm text-gray-600 mt-2 italic">
                                        (Charges will be completed at termination of hire.)
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* VAT Notice */}
                        <div className="bg-green-50 p-6 rounded-2xl border border-green-200">
                            <h3 className="text-xl font-bold text-green-800 mb-3">VAT Notice:</h3>
                            <p className="text-gray-700 text-sm leading-relaxed">
                                For hirers who are VAT registered, the vehicle hired under this contract is a qualifying car as delivered under Article 7(2) of the Value Added Tax (Input Tax) Order 1982, as amended.
                            </p>
                        </div>

                        {/* Parking Fines & Congestion Charges */}
                        <div className="bg-green-50 p-6 rounded-2xl border border-green-200">
                            <h3 className="text-xl font-bold text-green-800 mb-3">
                                Parking Fines & Congestion Charges
                            </h3>
                            <p className="text-gray-700 text-sm leading-relaxed">
                                To cover administration costs, a surcharge of £30 will be made for parking tickets left unpaid, in addition to the amount of the fine.
                            </p>
                            <p className="text-gray-700 text-sm leading-relaxed mt-3">
                                The hirer accepts full responsibility to pay any congestion charge upon demand, together with an administration fee of £30 and any other associated costs/charges or penalties which may arise therefrom.
                            </p>
                        </div>

                        {/* Statement of Liability */}
                        <section className="space-y-6">
                            <h3 className="text-2xl font-semibold text-green-700 pb-3 border-b border-green-200">
                                Statement of Liability
                            </h3>
                            <p className="text-gray-700 text-sm leading-relaxed">
                                I acknowledge that during the currency of this rental agreement, under s86 of the Road Traffic Offenders Act 1986 and Schedule 6 Road Traffic Act 1991 (as amended or replaced), I will be liable as the owner of the vehicle for any fixed penalty offence or parking charge incurred.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Date:
                                    </label>
                                    <input
                                        type="date"
                                        name="liability_date"
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Signed by Hirer:
                                    </label>
                                    <Signature onSign={handleSignature("liability_signature")} />
                                </div>
                            </div>
                        </section>

                        {/* Submit */}
                        <div className="text-center pt-10">
                            <button
                                type="submit"
                                className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-bold py-5 px-16 rounded-full text-xl shadow-2xl transform hover:scale-105 transition-all duration-300"
                            >
                                Submit & Generate JSON
                            </button>
                            {submitted && (
                                <p className="mt-6 text-green-700 font-medium animate-pulse">
                                    Form submitted! Check console for full JSON output 🌿
                                </p>
                            )}
                        </div>
                    </form>
                </div>
            </main>


        </div>
    );
}