"use client";

import { useState } from "react";
import { generatePDF, downloadPDF, emailPDF, PDFFormData } from "@/lib/pdf-generator";

interface PDFShareButtonProps {
    formData: PDFFormData;
    className?: string;
}

export default function PDFShareButton({ formData, className = "" }: PDFShareButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [email, setEmail] = useState("");
    const [showEmailInput, setShowEmailInput] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const handleDownload = async () => {
        setIsGenerating(true);
        setMessage(null);
        try {
            console.log(formData)
            const blob = await generatePDF(formData);
            const filename = `${formData.title}-${formData.claimId}-${new Date().toISOString().split('T')[0]}.pdf`;
            downloadPDF(blob, filename);
            setMessage({ type: "success", text: "PDF downloaded successfully!" });
            setTimeout(() => {
                setIsOpen(false);
                setMessage(null);
            }, 1500);
        } catch (error) {
            console.log("PDF generation error:", error);
            if (error instanceof Error) {
                console.log("Error message:", error.message);
                console.log("Stack trace:", error.stack);
            } else {
                console.log("Error details:", JSON.stringify(error, null, 2));
            }
            setMessage({ type: "error", text: "Failed to generate PDF. Please try again." });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleEmailSend = async () => {
        if (!email) {
            setMessage({ type: "error", text: "Please enter an email address." });
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setMessage({ type: "error", text: "Please enter a valid email address." });
            return;
        }

        setIsSending(true);
        setMessage(null);
        try {
            const blob = await generatePDF(formData);
            await emailPDF(
                blob,
                email,
                `${formData.title} - Claim ${formData.claimId}`,
                formData.formType,
                formData.claimId,
                formData.title
            );
            setMessage({ type: "success", text: "PDF sent successfully!" });
            setEmail("");
            setShowEmailInput(false);
            setTimeout(() => {
                setIsOpen(false);
                setMessage(null);
            }, 2000);
        } catch (error) {
            console.error("Email send error:", error);
            setMessage({ type: "error", text: "Failed to send email. Please try again." });
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className={`relative ${className}`}>
            <style jsx>{`
        input,
        textarea,
        [contenteditable="true"] {
          text-transform: none;
        }
      `}</style>
            {/* Share Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="group relative inline-flex items-center gap-2.5 px-6 py-3 bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-600 hover:via-emerald-700 hover:to-teal-700 text-white font-bold rounded-2xl shadow-lg hover:shadow-emerald-500/30 hover:shadow-2xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
            >
                {/* Animated background glow */}
                <span className="absolute inset-0 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-400 opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300" />

                {/* Icon */}
                <svg
                    className="w-5 h-5 relative z-10"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                    />
                </svg>
                <span className="relative z-10">Share as PDF</span>
            </button>

            {/* Dropdown Modal */}
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => {
                            setIsOpen(false);
                            setShowEmailInput(false);
                            setMessage(null);
                        }}
                    />

                    {/* Modal */}
                    <div className="absolute right-0 mt-3 w-80 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
                            {/* Header */}
                            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-4">
                                <h3 className="text-white font-bold text-lg flex items-center gap-2">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    Share {formData.title}
                                </h3>
                                <p className="text-emerald-100 text-sm mt-1">Export or email this form as a beautifully formatted PDF</p>
                            </div>

                            {/* Content */}
                            <div className="p-5 space-y-4">
                                {/* Download Option */}
                                <button
                                    type="button"
                                    onClick={handleDownload}
                                    disabled={isGenerating}
                                    className="w-full group flex items-center gap-4 p-4 bg-gradient-to-r from-gray-50 to-emerald-50 hover:from-emerald-50 hover:to-teal-50 rounded-2xl border border-gray-200 hover:border-emerald-300 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-emerald-500/30 transition-shadow">
                                        {isGenerating ? (
                                            <svg className="w-6 h-6 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                        ) : (
                                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                            </svg>
                                        )}
                                    </div>
                                    <div className="text-left">
                                        <span className="font-bold text-gray-800 block">Download PDF</span>
                                        <span className="text-sm text-gray-500">Save to your device</span>
                                    </div>
                                    <svg className="w-5 h-5 text-gray-400 ml-auto group-hover:text-emerald-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>

                                {/* Email Option */}
                                {!showEmailInput ? (
                                    <button
                                        type="button"
                                        onClick={() => setShowEmailInput(true)}
                                        className="w-full group flex items-center gap-4 p-4 bg-gradient-to-r from-gray-50 to-blue-50 hover:from-blue-50 hover:to-indigo-50 rounded-2xl border border-gray-200 hover:border-blue-300 transition-all duration-300"
                                    >
                                        <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-blue-500/30 transition-shadow">
                                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <div className="text-left">
                                            <span className="font-bold text-gray-800 block">Send via Email</span>
                                            <span className="text-sm text-gray-500">Share with anyone</span>
                                        </div>
                                        <svg className="w-5 h-5 text-gray-400 ml-auto group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </button>
                                ) : (
                                    <div className="space-y-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200">
                                        <label className="block">
                                            <span className="text-sm font-semibold text-gray-700">Recipient Email</span>
                                            <div className="mt-1.5 relative">
                                                <input
                                                    type="email"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    placeholder="name@company.com"
                                                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                                                />
                                                <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                                                </svg>
                                            </div>
                                        </label>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setShowEmailInput(false);
                                                    setEmail("");
                                                    setMessage(null);
                                                }}
                                                className="flex-1 px-4 py-2.5 text-gray-600 font-semibold bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleEmailSend}
                                                disabled={isSending}
                                                className="flex-1 px-4 py-2.5 text-white font-semibold bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl hover:from-blue-600 hover:to-indigo-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                            >
                                                {isSending ? (
                                                    <>
                                                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                        </svg>
                                                        Sending...
                                                    </>
                                                ) : (
                                                    <>
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                                        </svg>
                                                        Send
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Message */}
                                {message && (
                                    <div
                                        className={`p-3 rounded-xl flex items-center gap-2 ${message.type === "success"
                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                            : "bg-red-50 text-red-700 border border-red-200"
                                            }`}
                                    >
                                        {message.type === "success" ? (
                                            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        ) : (
                                            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        )}
                                        <span className="text-sm font-medium">{message.text}</span>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
                                <p className="text-xs text-gray-500 text-center">
                                    PDFs are professionally formatted with your company branding
                                </p>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
