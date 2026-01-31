// app/components/DocumentManager.tsx
"use client";

import React, { useState, useEffect, ChangeEvent, FormEvent } from "react";
import axios from "axios";

interface DocumentManagerProps {
    claimId: string;
}

interface DocumentsMap {
    [key: string]: string;
}

export default function DocumentManager({ claimId }: DocumentManagerProps) {
    const [documents, setDocuments] = useState<DocumentsMap>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [docName, setDocName] = useState("");
    const [uploading, setUploading] = useState(false);

    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    const fetchDocuments = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await axios.get(`${apiBase}/api/claim-documents/${claimId}`);
            setDocuments(res.data.documents || {});
        } catch (err: any) {
            if (err.response?.status === 404) {
                setDocuments({});
            } else {
                setError(err.response?.data?.detail || "Failed to load documents.");
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (claimId) fetchDocuments();
    }, [claimId]);

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) setSelectedFile(e.target.files[0]);
    };

    const handleUpload = async (e: FormEvent) => {
        e.preventDefault();
        if (!selectedFile || !docName.trim()) {
            setError("Please enter a document name and select a file.");
            return;
        }

        const normalizedName = docName.trim();

        setUploading(true);
        setError(null);
        setSuccessMsg(null);

        try {
            const formData = new FormData();
            formData.append("file", selectedFile);
            formData.append("claimId", claimId);
            formData.append("documentName", normalizedName);

            const uploadRes = await fetch("/api/upload-document", {
                method: "POST",
                body: formData,
            });

            if (!uploadRes.ok) {
                const err = await uploadRes.json();
                throw new Error(err.error || "Upload failed");
            }

            await fetchDocuments();

            setSuccessMsg(
                documents[normalizedName]
                    ? `"${normalizedName}" replaced successfully`
                    : `"${normalizedName}" uploaded successfully`
            );

            setSelectedFile(null);
            setDocName("");
        } catch (err: any) {
            setError(err.message || "Failed to upload/save document.");
            console.error(err);
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (docKey: string) => {
        if (!confirm(`Delete "${docKey}" permanently? This cannot be undone.`)) return;

        // Optimistic UI update
        const previous = { ...documents };
        const updated = { ...documents };
        delete updated[docKey];
        setDocuments(updated);

        setError(null);
        setSuccessMsg(null);

        try {
            // Call the DELETE endpoint
            await axios.delete(`${apiBase}/api/claim-documents/${claimId}/${docKey}`);

            setSuccessMsg(`"${docKey}" deleted successfully.`);
        } catch (err: any) {
            // Rollback
            setDocuments(previous);
            setError(err.response?.data?.detail || "Delete failed – changes reverted.");
            console.error("Delete error:", err);
        }
    };
    const handleClearForm = () => {
        setSelectedFile(null);
        setDocName("");
        setError(null);
        setSuccessMsg(null);
    };

    return (
        <div className="space-y-10">
            {/* Upload form – unchanged except minor cleanup */}
            <div className="bg-white border border-green-100 rounded-2xl shadow-lg p-6 md:p-8">
                <h2 className="text-2xl font-bold text-green-800 mb-6">
                    Upload or Replace Document
                </h2>

                <form onSubmit={handleUpload} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Document Name / Category
                            </label>
                            <input
                                type="text"
                                value={docName}
                                onChange={(e) => setDocName(e.target.value)}
                                placeholder="e.g. Police Report, Invoice, License"
                                className="w-full px-4 py-3 border border-green-200 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-green-400 transition bg-white/80"
                                required
                            />
                            <p className="mt-1 text-xs text-gray-500">
                                Use same name to replace existing document
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                File (PDF, Image, etc.)
                            </label>
                            <input
                                type="file"
                                onChange={handleFileChange}
                                className="w-full px-4 py-3 border border-green-200 rounded-xl file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 transition cursor-pointer"
                                required
                            />
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-end gap-4">
                        <button
                            type="button"
                            onClick={handleClearForm}
                            className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition border border-gray-300"
                        >
                            Clear
                        </button>

                        <button
                            type="submit"
                            disabled={uploading || !selectedFile || !docName.trim()}
                            className={`
                px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600
                hover:from-green-700 hover:to-emerald-700 text-white font-semibold
                rounded-full shadow-lg transform hover:scale-105 transition-all
                disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2
              `}
                        >
                            {uploading ? (
                                <>
                                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    {documents[docName.trim()] ? "Replacing..." : "Uploading..."}
                                </>
                            ) : documents[docName.trim()] ? (
                                "Replace Document"
                            ) : (
                                "Upload Document"
                            )}
                        </button>
                    </div>
                </form>

                {error && <p className="mt-6 text-red-600 text-center font-medium">{error}</p>}
                {successMsg && <p className="mt-6 text-green-600 text-center font-medium">{successMsg}</p>}
            </div>

            {/* Documents List */}
            <div className="bg-white/90 backdrop-blur-sm border border-green-100 rounded-2xl shadow-lg p-6 md:p-8">
                <h2 className="text-2xl font-bold text-green-800 mb-6">
                    Current Documents ({Object.keys(documents).length})
                </h2>

                {loading ? (
                    <div className="flex justify-center py-16">
                        <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
                    </div>
                ) : Object.keys(documents).length === 0 ? (
                    <div className="text-center py-16 text-gray-600">
                        No documents uploaded for this claim yet.
                        <br />
                        <span className="text-sm">Use the form above to add your first document.</span>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {Object.entries(documents).map(([name, url]) => (
                            <div
                                key={name}
                                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-green-50/60 rounded-xl border border-green-100 hover:bg-green-50 transition group"
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-green-900 truncate">{name}</p>
                                    {/* Optional: show short URL preview or file type */}

                                </div>

                                <div className="flex gap-3 flex-shrink-0">
                                    <a
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition"
                                    >
                                        Open
                                    </a>
                                    <button
                                        onClick={() => handleDelete(name)}
                                        className="px-5 py-2 bg-red-100 hover:bg-red-200 text-red-700 text-sm rounded-lg transition"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}