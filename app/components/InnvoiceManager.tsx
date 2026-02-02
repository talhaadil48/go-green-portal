"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { generatePDF, PDFFormData } from "@/lib/pdf-generator";
import { JSX } from "react/jsx-runtime";

interface InvoiceManagerProps {
  claimId: string;
}

interface DocumentOption {
  id: string;
  name: string;
  formType: PDFFormData["formType"] | "document";
  description: string;
  icon: JSX.Element;
  available: boolean;
}

export default function InvoiceManager({ claimId }: InvoiceManagerProps) {
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState(`Documents for Claim ${claimId}`);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState<
    { type: "success" | "error" | "info" | "warning"; text: string } | null
  >(null);
  const [currentProgress, setCurrentProgress] = useState<
    { current: number; total: number } | null
  >(null);
  const [documentsData, setDocumentsData] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all form data – allow missing forms (treat as empty)
  useEffect(() => {
    const fetchAllData = async () => {
      setIsLoading(true);
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "";

      try {
        const endpoints = [
          { key: "claim", url: `/api/accident-claims/${claimId}` },
          { key: "pre-inspection", url: `/api/pre-inspection-forms/${claimId}` },
          { key: "cancellation", url: `/api/cancellation-forms/${claimId}` },
          { key: "storage-recovery", url: `/api/storage-forms/${claimId}` },
          { key: "rental-agreement", url: `/api/rental-agreements/${claimId}` },
          { key: "documents", url: `/api/claim-documents/${claimId}` },
        ];

        const results = await Promise.allSettled(
          endpoints.map((ep) => axios.get(`${apiBase}${ep.url}`))
        );

        const data: Record<string, any> = {};

        results.forEach((result, index) => {
          const key = endpoints[index].key;

          if (result.status === "fulfilled") {
            if (key === "documents") {
              data[key] = result.value.data.documents || {};
            } else {
              data[key] = result.value.data || {};
            }
          } else {
            // Even on error (404 etc.) → provide empty object so blank form can be generated
            if (key !== "documents") {
              data[key] = {};
            }
            // documents list remains empty if failed
          }
        });

        setDocumentsData(data);
      } catch (error) {
        console.error("Error fetching documents:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (claimId) {
      fetchAllData();
    }
  }, [claimId]);

  const documents: DocumentOption[] = [
    {
      id: "claim",
      name: "Accident Claim Form",
      formType: "claim",
      description: "Complete accident claim with vehicle and party details",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
      // Always available – can send blank if no data
      available: true,
    },
    {
      id: "pre-inspection",
      name: "Pre-Inspection Checklist",
      formType: "pre-inspection",
      description: "Vehicle condition assessment checklist",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          />
        </svg>
      ),
      available: true,
    },
    {
      id: "cancellation",
      name: "Cancellation Notice",
      formType: "cancellation",
      description: "Contract cancellation request form",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          />
        </svg>
      ),
      available: true,
    },
    {
      id: "storage-recovery",
      name: "Storage & Recovery Invoice",
      formType: "storage-recovery",
      description: "Storage and recovery charges agreement",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      ),
      available: true,
    },
    {
      id: "rental-agreement",
      name: "Rental Agreement",
      formType: "rental-agreement",
      description: "Vehicle rental terms and conditions",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7v8a2 2 0 002 2H5a2 2 0 00-2 2v6a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"
          />
        </svg>
      ),
      available: true,
    },
  ];

  const uploadedDocuments: DocumentOption[] = [];
  if (documentsData["documents"]) {
    for (const id in documentsData["documents"]) {
      uploadedDocuments.push({
        id,
        name: id,
        formType: "document",
        description: `Uploaded document: ${id}`,
        icon: (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
        ),
        available: true,
      });
    }
  }

  const allDocuments = [...documents, ...uploadedDocuments];

  const toggleDocument = (docId: string) => {
    setSelectedDocs((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };

  const selectAll = () => {
    const availableDocs = allDocuments.filter((d) => d.available).map((d) => d.id);
    setSelectedDocs(availableDocs);
  };

  const deselectAll = () => {
    setSelectedDocs([]);
  };

  const extractSignatures = (docId: string, data: any): Record<string, string | null> => {
    const signatures: Record<string, string | null> = {};

    switch (docId) {
      case "claim":
        signatures.client = data?.client_signature || null;
        break;
      case "pre-inspection":
        signatures.customer = data?.customer_signature || null;
        signatures.detailer = data?.detailer_signature || null;
        break;
      case "cancellation":
        signatures.cancellation_signature = data?.cancellation_signature || null;
        break;
      case "storage-recovery":
        signatures.client_signature = data?.client_signature || null;
        signatures.owner_signature = data?.owner_signature || null;
        break;
      case "rental-agreement":
        signatures.hirer_signature_terms = data?.hirer_signature_terms || null;
        signatures.company_signature = data?.company_signature || null;
        signatures.declaration_signature = data?.declaration_signature || null;
        signatures.liability_signature = data?.liability_signature || null;
        break;
      default:
        break;
    }

    return signatures;
  };

  const extractImages = (docId: string, data: any): Record<string, string | null> => {
    const images: Record<string, string | null> = {};

    switch (docId) {
      case "claim":
        images.circumstance_drawing = data?.circumstance_drawing || null;
        images.direction_before_drawing = data?.direction_before_drawing || null;
        images.direction_after_drawing = data?.direction_after_drawing || null;
        break;
      case "pre-inspection":
        images.annotated_vehicle_image = data?.annotated_vehicle_image || null;
        break;
      default:
        break;
    }

    return images;
  };

  const handleSendDocuments = async () => {
    if (selectedDocs.length === 0) {
      setStatus({ type: "error", text: "Please select at least one document to send." });
      return;
    }

    if (!email) {
      setStatus({ type: "error", text: "Please enter an email address." });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setStatus({ type: "error", text: "Please enter a valid email address." });
      return;
    }

    setIsSending(true);
    setStatus({ type: "info", text: "Starting to prepare and send documents..." });
    setCurrentProgress({ current: 0, total: selectedDocs.length });

    const results: { filename: string; success: boolean; message?: string }[] = [];
    let hasAnySuccess = false;

    try {
      for (let i = 0; i < selectedDocs.length; i++) {
        const docId = selectedDocs[i];
        const doc = allDocuments.find((d) => d.id === docId);

        setCurrentProgress({ current: i + 1, total: selectedDocs.length });
        setStatus({
          type: "info",
          text: `Processing ${i + 1}/${selectedDocs.length}: ${doc?.name || docId} ...`,
        });

        if (!doc) continue;

        let blob: Blob;
        let filename: string;

        if (doc.formType === "document") {
          const url = documentsData["documents"]?.[docId];
          if (!url) {
            results.push({ filename: doc.name || docId, success: false, message: "Missing file URL" });
            continue;
          }

          const res = await fetch(url);
          if (!res.ok) {
            results.push({
              filename: doc.name || docId,
              success: false,
              message: `Failed to fetch (${res.status})`,
            });
            continue;
          }
          blob = await res.blob();

          let ext = "pdf";
          if (blob.type === "image/jpeg") ext = "jpg";
          else if (blob.type === "image/png") ext = "png";
          else if (blob.type === "application/pdf") ext = "pdf";

          filename = `${doc.id}.${ext}`;
        } else {
          // Use empty object if no data → blank form
          const formData = documentsData[docId] || {};

          const formDataForPDF: PDFFormData = {
            title: doc.name,
            formType: doc.formType,
            claimId,
            data: formData,
            signatures: extractSignatures(docId, formData),
            images: extractImages(docId, formData),
          };

          setStatus({
            type: "info",
            text: `Generating PDF (${i + 1}/${selectedDocs.length}): ${doc.name} ...`,
          });

          blob = await generatePDF(formDataForPDF);
          filename = `${doc.formType}-${claimId}.pdf`;
        }

        const formData = new FormData();
        formData.append("file_0", blob, filename);
        formData.append("fileCount", "1");
        formData.append("email", email);
        formData.append("subject", subject);
        formData.append("message", message);
        formData.append("claimId", claimId);

        setStatus({
          type: "info",
          text: `Sending ${i + 1}/${selectedDocs.length}: ${filename} ...`,
        });

        const response = await fetch("/api/send-multiple-pdfs", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        if (response.ok && data.success) {
          results.push({
            filename,
            success: true,
            message: `Sent (${data.message || "OK"})`,
          });
          hasAnySuccess = true;
        } else {
          results.push({
            filename,
            success: false,
            message: data.message || "Failed to send",
          });
        }
      }

      const successCount = results.filter((r) => r.success).length;
      const total = results.length;

      if (successCount === 0) {
        setStatus({
          type: "error",
          text: `Failed to send any of the ${total} documents.`,
        });
      } else if (successCount === total) {
        setStatus({
          type: "success",
          text: `All ${total} documents sent successfully!`,
        });
      } else {
        setStatus({
          type: "warning",
          text: `Sent ${successCount} of ${total} documents (${total - successCount} failed).`,
        });
      }

      console.table(results);

      if (hasAnySuccess) {
        setSelectedDocs([]);
        setEmail("");
        setMessage("");
      }
    } catch (err: any) {
      console.error("Send loop error:", err);
      setStatus({
        type: "error",
        text: "Unexpected error during sending. Some documents may have been sent.",
      });
    } finally {
      setIsSending(false);
      setCurrentProgress(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading documents...</p>
        </div>
      </div>
    );
  }

  const availableCount = allDocuments.filter((d) => d.available).length;
  const selectedCount = selectedDocs.length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl shadow-lg shadow-emerald-500/30 mb-4">
          <svg
            className="w-8 h-8 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2m-4-1v8m0 0l3-3m-3 3L9 8m-5 5h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293h3.172a1 1 0 00.707-.293l2.414-2.414a1 1 0 01.707-.293H20"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Send Invoice & Documents
        </h2>
        <p className="text-gray-600">
          Select the documents you want to send (blank forms are allowed)
        </p>
      </div>

      {/* Document Selection */}
      <div className="bg-gradient-to-br from-gray-50 to-emerald-50/30 rounded-3xl p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <svg
              className="w-5 h-5 text-emerald-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Select Documents
            <span className="text-sm font-normal text-gray-500">
              ({selectedCount} of {availableCount} selected)
            </span>
          </h3>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={selectAll}
              className="px-3 py-1.5 text-sm font-medium text-emerald-700 bg-emerald-100 rounded-lg hover:bg-emerald-200 transition-colors"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={deselectAll}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allDocuments.map((doc) => {
            const isSelected = selectedDocs.includes(doc.id);
            const isAvailable = doc.available;

            return (
              <button
                key={doc.id}
                type="button"
                onClick={() => isAvailable && toggleDocument(doc.id)}
                disabled={!isAvailable}
                className={`relative group text-left p-5 rounded-2xl border-2 transition-all duration-300 ${
                  !isAvailable
                    ? "bg-gray-100 border-gray-200 opacity-50 cursor-not-allowed"
                    : isSelected
                    ? "bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-400 shadow-lg shadow-emerald-500/20"
                    : "bg-white border-gray-200 hover:border-emerald-300 hover:shadow-md"
                }`}
              >
                <div
                  className={`absolute top-4 right-4 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                    isSelected
                      ? "bg-emerald-500 border-emerald-500"
                      : "border-gray-300 group-hover:border-emerald-400"
                  }`}
                >
                  {isSelected && (
                    <svg
                      className="w-4 h-4 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>

                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-all ${
                    isSelected
                      ? "bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg"
                      : "bg-gray-100 text-gray-600 group-hover:bg-emerald-100 group-hover:text-emerald-600"
                  }`}
                >
                  {doc.icon}
                </div>

                <h4
                  className={`font-bold mb-1 ${isSelected ? "text-emerald-800" : "text-gray-800"}`}
                >
                  {doc.name}
                  {!documentsData[doc.id] && doc.formType !== "document" && (
                    <span className="ml-2 text-xs font-normal text-amber-600">(blank)</span>
                  )}
                </h4>
                <p className="text-sm text-gray-500 line-clamp-2">{doc.description}</p>

                {!isAvailable && (
                  <span className="absolute bottom-4 right-4 text-xs font-medium text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
                    Not Available
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Email Form */}
      <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <svg
            className="w-5 h-5 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
          Email Details
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Recipient Email <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="recipient@company.com"
                className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
              />
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                />
              </svg>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Email Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter email subject..."
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Additional Message (Optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="Add a personal message to include with the documents..."
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all resize-none"
            />
          </div>
        </div>
      </div>

      {/* Status + Progress */}
      {status && (
        <div
          className={`p-5 rounded-2xl flex flex-col gap-3 shadow-sm ${
            status.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : status.type === "error"
              ? "bg-red-50 text-red-800 border border-red-200"
              : status.type === "warning"
              ? "bg-amber-50 text-amber-800 border border-amber-200"
              : "bg-blue-50 text-blue-800 border border-blue-200"
          }`}
        >
          <div className="flex items-center gap-3">
            {status.type === "success" ? (
              <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            ) : status.type === "error" ? (
              <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            ) : status.type === "warning" ? (
              <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            ) : (
              <svg
                className="w-6 h-6 flex-shrink-0 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            )}

            <span className="font-medium text-base">{status.text}</span>
          </div>

          {currentProgress && isSending && (
            <div className="mt-2">
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-emerald-600 h-2.5 rounded-full transition-all duration-300"
                  style={{
                    width: `${(currentProgress.current / currentProgress.total) * 100}%`,
                  }}
                />
              </div>
              <p className="text-xs text-gray-600 mt-1 text-center">
                {currentProgress.current} of {currentProgress.total}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Send Button */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={handleSendDocuments}
          disabled={isSending || selectedDocs.length === 0}
          className="group relative inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-600 hover:via-emerald-700 hover:to-teal-700 text-white font-bold text-lg rounded-2xl shadow-xl hover:shadow-emerald-500/40 hover:shadow-2xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          <span className="absolute inset-0 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-400 opacity-0 group-hover:opacity-30 blur-xl transition-opacity duration-300" />

          {isSending ? (
            <>
              <svg
                className="w-6 h-6 animate-spin relative z-10"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span className="relative z-10">Sending Documents...</span>
            </>
          ) : (
            <>
              <svg
                className="w-6 h-6 relative z-10"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
              <span className="relative z-10">
                Send {selectedCount > 0 ? `${selectedCount} Document${selectedCount > 1 ? "s" : ""}` : "Documents"}
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}