"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import { generatePDF, PDFFormData } from "@/lib/pdf-generator";
import { JSX } from "react/jsx-runtime";
import api from "@/lib/axios";
import Cookies from "js-cookie";

interface Invoice {
  id: number;
  invoice_number: string;
  invoice_datetime: string;
  info: string;
  docs: string;
  storage_bill: number;
  rent_bill: number;
  user_name: string;
}

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
  userName?: string;
}

// Interface for rental agreement from API
interface RentalAgreement {
  rental_agreement_id: number;
  display_id: number;
  valid_from: string;
  valid_till: string;
  hire_vehicle_reg: string;
  hirer_name: string;
  total_cost: string;
  created_at: string;
}

export default function InvoiceManager({ claimId }: InvoiceManagerProps) {
  const [refNo, setRefNo] = useState<string>("");
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState(`Documents for Claim ${claimId}`);
  const [message, setMessage] = useState("");
  const [info, setInfo] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error" | "info" | "warning";
    text: string;
  } | null>(null);
  const [currentProgress, setCurrentProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [documentsData, setDocumentsData] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  
  // New state for multiple rental agreements
  const [rentalAgreements, setRentalAgreements] = useState<RentalAgreement[]>([]);
  const [isLoadingRentalAgreements, setIsLoadingRentalAgreements] = useState(false);

  useEffect(() => {
    const getCurrentUsername = (): string | null => {
      try {
        const userData = Cookies.get("user");
        if (!userData) return null;
        const parsed = JSON.parse(userData);
        return parsed?.username || null;
      } catch {
        return null;
      }
    };

    const currentUser = getCurrentUsername();
    setUsername(currentUser);
  }, []);

  // Fetch all form data – allow missing forms (treat as empty)
  useEffect(() => {
    const fetchAllData = async () => {
      setIsLoading(true);
      try {
        const endpoints = [
          { key: "claim", url: `/api/accident-claims/${claimId}` },
          {
            key: "pre-inspection",
            url: `/api/pre-inspection-forms/${claimId}`,
          },
          { key: "cancellation", url: `/api/cancellation-forms/${claimId}` },
          { key: "storage-recovery", url: `/api/storage-forms/${claimId}` },
          // Note: We'll fetch rental agreements separately now
          { key: "documents", url: `/api/claim-documents/${claimId}` },
        ];
        const results = await Promise.allSettled(
          endpoints.map((ep) =>
            api.get(ep.url, { headers: { requiresAuth: true } }),
          ),
        );
        const data: Record<string, any> = {};
        results.forEach((result, index) => {
          const key = endpoints[index].key;
          if (result.status === "fulfilled") {
            if (key === "documents") {
              data[key] = result.value.data.documents || {};
            } else if (key === "pre-inspection") {
              data[key] = Array.isArray(result.value.data)
                ? result.value.data
                : [result.value.data || {}];
            } else {
              data[key] = result.value.data || {};
            }
          } else {
            if (key === "pre-inspection") {
              data[key] = [];
            } else if (key !== "documents") {
              data[key] = {};
            }
          }
        });

        const claimsResult = await api.get(`/api/claims/${claimId}`, {
          headers: { requiresAuth: true },
        });
        setRefNo(claimsResult.data.ref_no || "");

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

  // ─── NEW: Fetch all rental agreements for this claim ───
  useEffect(() => {
    const fetchRentalAgreements = async () => {
      setIsLoadingRentalAgreements(true);
      try {
        const response = await api.get(`/api/claims/${claimId}/rental-agreements`, {
          headers: { requiresAuth: true },
        });
        console.log("Fetched rental agreements:", response.data);
        
        const agreements = response.data.rental_agreements || [];
        // Sort by rental_agreement_id (oldest first) and assign display IDs
        const sortedAgreements = agreements
          .sort((a: any, b: any) => a.rental_agreement_id - b.rental_agreement_id)
          .map((agreement: any, index: number) => ({
            ...agreement,
            display_id: index + 1 // Sequential: 1, 2, 3...
          }));
        
        setRentalAgreements(sortedAgreements);
        
        // Store each rental agreement in documentsData for PDF generation
        const rentalData: Record<string, any> = {};
        sortedAgreements.forEach((agreement: RentalAgreement) => {
          const key = `rental-agreement-${agreement.rental_agreement_id}`;
          // We need to fetch full details for each agreement
          // This will be done lazily when needed
          rentalData[key] = { 
            ...agreement,
            // Placeholder - will be replaced with full data when fetched
            _needsFetch: true 
          };
        });
        
        setDocumentsData(prev => ({
          ...prev,
          rental_agreements: rentalData
        }));
        
      } catch (err) {
        console.error("Failed to fetch rental agreements:", err);
        // If 404, just set empty array
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          setRentalAgreements([]);
        }
      } finally {
        setIsLoadingRentalAgreements(false);
      }
    };

    if (claimId) {
      fetchRentalAgreements();
    }
  }, [claimId]);

  // ─── Fetch full rental agreement details when needed ───
  const fetchRentalAgreementDetails = async (agreementId: number) => {
    try {
      const response = await api.get(`/api/claims/${claimId}/rental-agreements/${agreementId}`, {
        headers: { requiresAuth: true },
      });
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch rental agreement ${agreementId}:`, error);
      return null;
    }
  };

  // Fetch invoices for this claim
  useEffect(() => {
    const fetchInvoices = async () => {
      setInvoicesLoading(true);
      try {
        const response = await api.get(`/api/invoice/${claimId}`, {
          headers: { requiresAuth: true },
        });
        if (response.data.success) {
          const rawData = response.data.data || [];
          const formattedInvoices = rawData.map((row: any[]) => ({
            id: row[0],
            invoice_number: row[1] || "—",
            invoice_datetime: row[2],
            info: row[3] || "",
            docs: row[4] || "",
            storage_bill: row[5] || 0,
            rent_bill: row[6] || 0,
            user_name: row[7] || "-",
          }));
          setInvoices(formattedInvoices);
        }
      } catch (error) {
        console.error("Error fetching invoices:", error);
      } finally {
        setInvoicesLoading(false);
      }
    };
    if (claimId) {
      fetchInvoices();
    }
  }, [claimId]);

  const documents: DocumentOption[] = [
    {
      id: "claim",
      name: "RTA Form",
      formType: "claim",
      description: "Complete accident claim with vehicle and party details",
      userName: documentsData["claim"]?.user_name,
      icon: (
        <svg
          className="w-6 h-6"
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
      ),
      available: true,
    },
    {
      id: "cancellation",
      name: "Cancellation Notice",
      formType: "cancellation",
      description: "Contract cancellation request form",
      userName: documentsData["cancellation"]?.user_name,
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
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
      userName: documentsData["storage-recovery"]?.user_name,
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
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
  ];

  // ─── NEW: Dynamically generate rental agreement document options ───
  const rentalAgreementDocuments: DocumentOption[] = rentalAgreements.map((agreement) => ({
    id: `rental-agreement-${agreement.rental_agreement_id}`,
    name: `Hire Agreement ${agreement.display_id}`,
    formType: "rental-agreement",
    description: `Vehicle hire agreement #${agreement.display_id} (${agreement.valid_from || 'N/A'} → ${agreement.valid_till || 'N/A'})`,
    userName: agreement.user_name || "Unknown",
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 7v8a2 2 0 002 2H5a2 2 0 00-2 2v6a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"
        />
      </svg>
    ),
    available: true,
  }));

  // Add dynamic pre-inspection forms from array
  const preInspectionForms: DocumentOption[] = [];
  if (
    documentsData["pre-inspection"] &&
    Array.isArray(documentsData["pre-inspection"])
  ) {
    documentsData["pre-inspection"].forEach((form: any, index: number) => {
      preInspectionForms.push({
        id: `pre-inspection-${form.inspection_id || index}`,
        name: `Hire Vehicle Checklist ${index + 1}`,
        formType: "pre-inspection",
        description: `Vehicle inspection ${index + 1}`,
        userName: form.user_name,
        icon: (
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            />
          </svg>
        ),
        available: true,
      });
    });
  }

  const uploadedDocuments: DocumentOption[] = [];
  if (documentsData["documents"]) {
    for (const id in documentsData["documents"]) {
      const docVal = documentsData["documents"][id];
      let userName = undefined;

      if (typeof docVal === "object" && docVal !== null) {
        userName = docVal.user_name;
      }

      uploadedDocuments.push({
        id,
        name: id,
        formType: "document",
        description: `Uploaded document: ${id}`,
        userName: userName,
        icon: (
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
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

  // ─── Combine all documents - rental agreements sorted by display_id ───
  const allDocuments = [
    ...documents,
    ...rentalAgreementDocuments, // Now multiple hire agreements
    ...preInspectionForms,
    ...uploadedDocuments,
  ];

  const toggleDocument = (docId: string) => {
    setSelectedDocs((prev) =>
      prev.includes(docId)
        ? prev.filter((id) => id !== docId)
        : [...prev, docId],
    );
  };

  const selectAll = () => {
    const availableDocs = allDocuments
      .filter((d) => d.available)
      .map((d) => d.id);
    setSelectedDocs(availableDocs);
  };

  const deselectAll = () => {
    setSelectedDocs([]);
  };

  const handleDownloadDocument = async (docId: string) => {
    try {
      const doc = allDocuments.find((d) => d.id === docId);
      if (!doc) return;

      // For uploaded documents, download directly
      if (doc.formType === "document") {
        const docVal = documentsData["documents"]?.[docId];
        const existingUrl = typeof docVal === "object" && docVal !== null ? docVal.url : docVal;

        if (existingUrl) {
          const a = document.createElement("a");
          a.href = existingUrl;
          a.target = "_blank";
          a.rel = "noopener noreferrer";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
        return;
      }

      // ─── NEW: Handle rental agreement download ───
      if (doc.formType === "rental-agreement") {
        // Extract agreement ID from docId
        const agreementId = parseInt(docId.replace("rental-agreement-", ""));
        const agreement = rentalAgreements.find(a => a.rental_agreement_id === agreementId);
        
        if (!agreement) {
          throw new Error("Rental agreement not found");
        }

        // Fetch full agreement data
        const formDataObj = await fetchRentalAgreementDetails(agreementId);
        
        if (!formDataObj) {
          throw new Error("Failed to fetch rental agreement data");
        }

        const pdfData: PDFFormData = {
          refNo,
          title: doc.name,
          formType: "rental-agreement",
          claimId,
          data: formDataObj,
          signatures: extractSignatures("rental-agreement", formDataObj),
          images: extractImages("rental-agreement", formDataObj),
        };
        
        const blob = await generatePDF(pdfData);
        const filename = `rental-agreement-${agreement.display_id}-${claimId}.pdf`;
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return;
      }

      // For generated documents, generate PDF and download
      let blob: Blob;
      let filename: string;

      if (doc.formType === "pre-inspection") {
        const inspectionId = docId.replace("pre-inspection-", "");
        let formDataObj = {};
        if (Array.isArray(documentsData["pre-inspection"])) {
          const form = documentsData["pre-inspection"].find(
            (f: any) => String(f.inspection_id) === inspectionId,
          );
          if (form) {
            formDataObj = form;
          }
        }
        const pdfData: PDFFormData = {
          refNo,
          title: doc.name,
          formType: "pre-inspection",
          claimId,
          data: formDataObj,
          signatures: extractSignatures("pre-inspection", formDataObj),
          images: extractImages("pre-inspection", formDataObj),
        };
        blob = await generatePDF(pdfData);
        filename = `pre-inspection-${inspectionId}-${claimId}.pdf`;
      } else {
        const formDataObj = documentsData[docId] || {};
        const pdfData: PDFFormData = {
          refNo,
          title: doc.name,
          formType: doc.formType,
          claimId,
          data: formDataObj,
          signatures: extractSignatures(docId, formDataObj),
          images: extractImages(docId, formDataObj),
        };
        blob = await generatePDF(pdfData);
        filename = `${doc.formType}-${claimId}.pdf`;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading document:", error);
      setStatus({ type: "error", text: "Failed to download document" });
    }
  };

  const extractSignatures = (
    docId: string,
    data: any,
  ): Record<string, string | null> => {
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
        signatures.cancellation_signature =
          data?.cancellation_signature || null;
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

  const extractImages = (
    docId: string,
    data: any,
  ): Record<string, string | null> => {
    const images: Record<string, string | null> = {};
    switch (docId) {
      case "claim":
        images.circumstance_drawing = data?.circumstance_drawing || null;
        images.direction_before_drawing =
          data?.direction_before_drawing || null;
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
      setStatus({
        type: "error",
        text: "Please select at least one document to send.",
      });
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
    setStatus({ type: "info", text: "Preparing documents..." });
    setCurrentProgress({ current: 0, total: selectedDocs.length });
    try {
      const uploadedDocs: { name: string; url: string; sizeKb: string }[] = [];
      const uploadErrors: string[] = [];
      for (let i = 0; i < selectedDocs.length; i++) {
        const docId = selectedDocs[i];
        const doc = allDocuments.find((d) => d.id === docId);
        if (!doc) continue;
        setCurrentProgress({ current: i + 1, total: selectedDocs.length });
        setStatus({
          type: "info",
          text: `Processing ${i + 1}/${selectedDocs.length}: ${doc.name || docId} ...`,
        });

        // UPLOADED DOCUMENTS: already have a URL
        if (doc.formType === "document") {
          const docVal = documentsData["documents"]?.[docId];
          const existingUrl = typeof docVal === "object" && docVal !== null ? docVal.url : docVal;

          if (!existingUrl) {
            uploadErrors.push(doc.name || docId);
            setStatus({
              type: "error",
              text: `Missing file URL for ${doc.name}`,
            });
            continue;
          }
          uploadedDocs.push({
            name: doc.name || docId,
            url: existingUrl,
            sizeKb: "—",
          });
          continue;
        }

        // ─── NEW: Handle rental agreement PDF generation ───
        let blob: Blob;
        let filename: string;

        if (doc.formType === "rental-agreement") {
          const agreementId = parseInt(docId.replace("rental-agreement-", ""));
          const agreement = rentalAgreements.find(a => a.rental_agreement_id === agreementId);
          
          if (!agreement) {
            uploadErrors.push(doc.name || docId);
            continue;
          }

          const formDataObj = await fetchRentalAgreementDetails(agreementId);
          
          if (!formDataObj) {
            uploadErrors.push(doc.name || docId);
            continue;
          }

          const pdfData: PDFFormData = {
            refNo,
            title: doc.name,
            formType: "rental-agreement",
            claimId,
            data: formDataObj,
            signatures: extractSignatures("rental-agreement", formDataObj),
            images: extractImages("rental-agreement", formDataObj),
          };
          
          blob = await generatePDF(pdfData);
          filename = `rental-agreement-${agreement.display_id}-${claimId}.pdf`;
          
        } else if (doc.formType === "pre-inspection") {
          const inspectionId = docId.replace("pre-inspection-", "");
          let formDataObj = {};
          if (Array.isArray(documentsData["pre-inspection"])) {
            const form = documentsData["pre-inspection"].find(
              (f: any) => String(f.inspection_id) === inspectionId,
            );
            if (form) {
              formDataObj = form;
            }
          }
          const pdfData: PDFFormData = {
            refNo,
            title: doc.name,
            formType: "pre-inspection",
            claimId,
            data: formDataObj,
            signatures: extractSignatures("pre-inspection", formDataObj),
            images: extractImages("pre-inspection", formDataObj),
          };
          blob = await generatePDF(pdfData);
          filename = `pre-inspection-${inspectionId}-${claimId}.pdf`;
        } else {
          const formDataObj = documentsData[docId] || {};
          const pdfData: PDFFormData = {
            refNo,
            title: doc.name,
            formType: doc.formType,
            claimId,
            data: formDataObj,
            signatures: extractSignatures(docId, formDataObj),
            images: extractImages(docId, formDataObj),
          };
          blob = await generatePDF(pdfData);
          filename = `${doc.formType}-${claimId}.pdf`;
        }

        // Get presigned URL
        const presignRes = await fetch("/api/presign-upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            claimId,
            files: [{ name: filename, type: blob.type || "application/pdf" }],
          }),
        });

        if (!presignRes.ok) {
          uploadErrors.push(filename);
          console.error(`Failed to get presigned URL for ${filename}`);
          continue;
        }

        const { results } = await presignRes.json();
        const { presignedUrl, fileUrl } = results[0];

        // Upload directly to S3
        const s3Res = await fetch(presignedUrl, {
          method: "PUT",
          headers: { "Content-Type": blob.type || "application/pdf" },
          body: blob,
        });

        if (!s3Res.ok) {
          uploadErrors.push(filename);
          console.error(`S3 upload failed for ${filename}`);
          continue;
        }

        uploadedDocs.push({
          name: doc.name || docId,
          url: fileUrl,
          sizeKb: String(Math.round(blob.size / 1024)),
        });
      }

      if (uploadedDocs.length === 0) {
        setStatus({
          type: "error",
          text: "No documents processed successfully.",
        });
        return;
      }

      setStatus({ type: "info", text: "Sending email with document links..." });

      const sendPayload = {
        email,
        subject,
        message,
        claimId,
        documents: uploadedDocs,
      };
      const sendResponse = await fetch(`/api/send-documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sendPayload),
      });
      const sendData = await sendResponse.json();
      if (sendResponse.ok && sendData.success) {
        if (true) {
          try {
            setStatus({ type: "info", text: "Creating invoice..." });
            const billResponse = await api.get(`/api/claim-bill/${claimId}`, {
              headers: { requiresAuth: true },
            });
            const { rental, storage } = billResponse.data;

            const docsArray = selectedDocs.map((docId) => {
              const docOption = allDocuments.find((d) => d.id === docId);
              return docOption?.name || docId;
            });
            const invoiceResponse = await api.post(
              `/api/invoice`,
              {
                claim_id: claimId,
                info: info,
                docs: docsArray,
                storage_bill: storage,
                rent_bill: rental,
                user_name: username || "-",
              },
              {
                headers: { requiresAuth: true },
              },
            );
            if (invoiceResponse.data.success) {
              setStatus({
                type: "success",
                text: `All ${uploadedDocs.length} documents sent and invoice created successfully!`,
              });
              const refreshResponse = await api.get(`/api/invoice/${claimId}`, {
                headers: { requiresAuth: true },
              });
              if (refreshResponse.data.success) {
                const rawData = refreshResponse.data.data || [];
                const formattedInvoices = rawData.map((row: any[]) => ({
                  id: row[0],
                  invoice_number: row[1] || "—",
                  invoice_datetime: row[2],
                  info: row[3] || "",
                  docs: row[4] || "",
                  storage_bill: row[5] || 0,
                  rent_bill: row[6] || 0,
                  user_name: row[7] || "-",
                }));
                setInvoices(formattedInvoices);
              }
            } else {
              setStatus({
                type: "warning",
                text: `Documents sent but invoice creation failed: ${invoiceResponse.data.message}`,
              });
            }
          } catch (error) {
            console.error("Invoice creation error:", error);
            setStatus({
              type: "warning",
              text: `Documents sent but invoice creation failed.`,
            });
          }
        } else {
          setStatus({
            type: "success",
            text: `All ${uploadedDocs.length} documents sent successfully!`,
          });
        }
        setSelectedDocs([]);
        setEmail("");
        setMessage("");
        setInfo("");
      } else {
        setStatus({
          type: "error",
          text:
            sendData.message ||
            `Failed to send links for ${uploadedDocs.length} documents.`,
        });
        console.error("Send error:", sendData);
      }
    } catch (err: any) {
      console.error("Unexpected error:", err);
      setStatus({
        type: "error",
        text: "Unexpected error during process. Some documents may not have been handled.",
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
      <style jsx>{`
        input,
        textarea,
        [contenteditable="true"] {
          text-transform: none;
        }
      `}</style>
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

      {/* Invoice Section - Unchanged */}
      <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm">
        <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
          <svg
            className="w-5 h-5 text-teal-600"
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
          Invoice
        </h3>
        {invoicesLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mx-auto mb-2" />
              <p className="text-gray-600 text-sm">Loading invoices...</p>
            </div>
          </div>
        ) : invoices.length > 0 ? (
          <div className="space-y-4">
            {invoices.map((invoice, index) => {
              const formattedDate = invoice.invoice_datetime
                ? new Date(invoice.invoice_datetime).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })
                : "";

              const formattedTime = invoice.invoice_datetime
                ? new Date(invoice.invoice_datetime).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
                : "";
              return (
                <div key={invoice.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-teal-500 mt-2" />
                    {index < invoices.length - 1 && (
                      <div className="w-0.5 h-16 bg-gray-300 mt-2" />
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-100 rounded-2xl p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-semibold text-gray-900">Invoice</p>
                          <p className="text-sm text-gray-600">
                            Sent by {invoice.user_name} • {formattedDate} at{" "}
                            {formattedTime}
                          </p>
                        </div>
                      </div>
                      {invoice.info && invoice.info.trim() !== "" && (
                        <div className="mt-3 pt-3 border-t border-teal-200">
                          <p className="text-md font-medium text-gray-700 whitespace-pre-wrap break-words">
                            {invoice.info}
                          </p>
                        </div>
                      )}
                      {invoice.docs && invoice.docs.length > 0 && (
                        <div className="mt-2">
                          <span className="font-semibold text-gray-700">
                            Documents:{" "}
                          </span>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {invoice.docs.map((doc, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-gray-200 text-gray-800 rounded text-sm"
                              >
                                {doc}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="mt-2">
                        <span className="font-semibold text-gray-700">
                          Hire Bill:{" "}
                        </span>
                        <span className="text-md text-gray-700">
                          £{invoice.rent_bill}
                        </span>
                      </div>
                      <div className="mt-2">
                        <span className="font-semibold text-gray-700">
                          Storage Bill:{" "}
                        </span>
                        <span className="text-md text-gray-700">
                          £{invoice.storage_bill}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-2xl mb-3">
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <p className="text-gray-600 font-medium mb-1">No invoices yet</p>
            <p className="text-gray-500 text-sm">
              Add invoice information and send documents to create the first
              invoice
            </p>
          </div>
        )}
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
        
        {isLoadingRentalAgreements && (
          <div className="text-center py-4">
            <div className="inline-block w-6 h-6 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mr-2" />
            <span className="text-sm text-gray-600">Loading rental agreements...</span>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="w-10 px-4 py-3 text-left"></th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">
                  Document
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700 hidden md:table-cell">
                  Description
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700 hidden md:table-cell">
                  Created
                </th>
                <th className="w-32 px-4 py-3 text-center font-semibold text-gray-700">
                  Status
                </th>
                <th className="w-24 px-4 py-3 text-center font-semibold text-gray-700">
                  Download
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {allDocuments.map((doc) => {
                const isSelected = selectedDocs.includes(doc.id);
                const isAvailable = doc.available;
                return (
                  <tr
                    key={doc.id}
                    onClick={() => isAvailable && toggleDocument(doc.id)}
                    className={`cursor-pointer transition-colors ${!isAvailable
                      ? "bg-gray-50 text-gray-400 cursor-not-allowed"
                      : isSelected
                        ? "bg-emerald-300"
                        : "hover:bg-gray-50"
                      }`}
                  >
                    <td className="px-4">
                      <div
                        className={`w-7 h-7 rounded-md border-2 flex items-center justify-center transition-all ${isSelected
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
                    </td>
                    <td className="px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${isSelected
                            ? "bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-sm"
                            : "bg-gray-200 text-gray-600"
                            }`}
                        >
                          {doc.icon}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {doc.name}
                          </div>
                          <div className="text-sm text-gray-500 md:hidden line-clamp-1">
                            {doc.description}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600 hidden md:table-cell line-clamp-2 max-w-md">
                      {doc.description}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600 hidden md:table-cell">
                      {doc.userName && doc.userName.trim() !== "" ? doc.userName.toUpperCase() : "__"}
                    </td>
                    <td className="px-4 py-4 text-center text-sm">
                      {isAvailable ? (
                        isSelected ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                            Selected
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-600">
                          Not Available
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadDocument(doc.id);
                        }}
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                        title="Download this document"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                          />
                        </svg>
                        <span className="hidden sm:inline">Download</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Email Form - Unchanged */}
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
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Invoice Status
            </label>
            <textarea
              value={info}
              onChange={(e) => setInfo(e.target.value)}
              rows={3}
              placeholder="Add invoice details, notes, or additional information..."
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all resize-none"
            />
          </div>
        </div>
      </div>

      {/* Status + Progress */}
      {status && (
        <div
          className={`p-5 rounded-2xl flex flex-col gap-3 shadow-sm ${status.type === "success"
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
              <svg
                className="w-6 h-6 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            ) : status.type === "error" ? (
              <svg
                className="w-6 h-6 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            ) : status.type === "warning" ? (
              <svg
                className="w-6 h-6 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
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
                Send{" "}
                {selectedCount > 0
                  ? `${selectedCount} Document${selectedCount > 1 ? "s" : ""}`
                  : "Documents"}
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}