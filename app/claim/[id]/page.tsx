"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/axios";
import CancellationNotice from "@/app/components/Cancellation";
import { AccidentClaimForm } from "@/app/components/ClaimForm";
import PreInspectionChecklist from "@/app/components/PreInspection";
import { StorageRecoveryAgreement } from "@/app/components/Storage";
import { RentalAgreement } from "@/app/components/RentalAgreement";
import DocumentManager from "@/app/components/Document";
import InvoiceManager from "@/app/components/InnvoiceManager";
import UnsavedChangesDialog from "@/app/components/UnsavedChangesDialog";
import { use } from "react";

type TabKey =
  | "pre-inspection"
  | "cancellation"
  | "storage-recovery"
  | "rental-agreement"
  | "claim"
  | "document"
  | "invoice";

const tabs: { key: TabKey; label: string }[] = [
  { key: "claim", label: "RTA Form" },
  { key: "rental-agreement", label: "Rental Agreement" },
  { key: "storage-recovery", label: "Storage" },
  { key: "cancellation", label: "Cancellation Form" },
  { key: "pre-inspection", label: "Hire Vehicle" },
  { key: "document", label: "Document" },
  { key: "invoice", label: "Invoice" },
];

interface ClaimData {
  claim_id: string;
  claimant_name: string | null;
  claim_type: string | null;
  [key: string]: any;
}

export const UnsavedChangesContext = React.createContext<{
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (value: boolean) => void;
} | null>(null);

export default function HomePage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const claimId = unwrappedParams.id;

  const [activeTab, setActiveTab] = useState<TabKey>("claim");
  const [claimData, setClaimData] = useState<ClaimData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingTab, setPendingTab] = useState<TabKey | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const handleTabChange = (tabKey: TabKey) => {
    if (hasUnsavedChanges) {
      setPendingTab(tabKey);
      setShowDialog(true);
    } else {
      setActiveTab(tabKey);
    }
  };

  const handleDiscardChanges = () => {
    setShowDialog(false);
    if (pendingTab) {
      setActiveTab(pendingTab);
      setPendingTab(null);
    }
    setHasUnsavedChanges(false);
  };

  const handleCancelNavigation = () => {
    setShowDialog(false);
    setPendingTab(null);
  };

  const refreshPage = () => {
    // Option 1: Full page reload (most reliable when data comes from server)
    window.location.reload();

    // Option 2: Soft refresh – only re-fetch claim data (uncomment if preferred)
    // setLoading(true);
    // setError(null);
    // fetchClaim();
  };

  const fetchClaim = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await api.get(`/api/claims/${claimId}`, {
        headers: { requiresAuth: true },
      });
      setClaimData(res.data);
    } catch (err: any) {
      console.error("Failed to fetch claim:", err);
      setError(
        err.response?.data?.detail ||
        "Could not load claim details. Please try again later."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!claimId) return;
    fetchClaim();
  }, [claimId]);

  const getCustomerTypeLabel = (type?: string) => {
    if (!type) return "—";

    const types: Record<string, string> = {
      individual: "Individual",
      business: "Business",
      corporate: "Corporate",
      fleet: "Fleet",
    };
    return types[type.toLowerCase()] || type.charAt(0).toUpperCase() + type.slice(1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 pb-12">
      {/* Customer Info Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-25">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-green-800">
              Claim / Customer Details
            </h2>
            <button
              onClick={refreshPage} // define this function to reload claim data
              className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
              <span className="ml-3 text-gray-600">Loading claim details...</span>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl">
              {error}
            </div>
          ) : claimData ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm">
              <div>
                <p className="text-gray-500">Claim ID / Customer ID</p>
                <p className="font-medium text-gray-900 mt-1">{claimData.claim_id?.toUpperCase() || "—"}</p>
              </div>

              <div>
                <p className="text-gray-500">Claimant / Customer Name</p>
                <p className="font-medium text-gray-900 mt-1">{claimData.claimant_name || "—"}</p>
              </div>

              <div>
                <p className="text-gray-500">Customer Type</p>
                <p className="font-medium text-gray-900 mt-1">
                  {getCustomerTypeLabel(claimData.customer_type || claimData.claim_type)}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-gray-600">No claim data available.</p>
          )}
        </div>
      </section>
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Refresh Button + Tabs */}


        {/* Tabs */}
        <div className="flex flex-wrap gap-2 p-1 bg-green-100/50 rounded-xl overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleTabChange(tab.key)}
              className={`flex-1 min-w-[140px] py-3 px-4 text-sm sm:text-base font-semibold rounded-lg transition-all whitespace-nowrap ${activeTab === tab.key
                ? "bg-green-600 text-white shadow-lg"
                : "text-gray-600 hover:bg-white/50"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-lg p-6 sm:p-8">
          <UnsavedChangesContext.Provider
            value={{ hasUnsavedChanges, setHasUnsavedChanges }}
          >
            {activeTab === "pre-inspection" && (
              <PreInspectionChecklist claimId={claimId} />
            )}
            {activeTab === "cancellation" && (
              <CancellationNotice claimId={claimId} />
            )}
            {activeTab === "storage-recovery" && (
              <StorageRecoveryAgreement claimId={claimId} />
            )}
            {activeTab === "rental-agreement" && (
              <RentalAgreement claimId={claimId} />
            )}
            {activeTab === "claim" && <AccidentClaimForm claimId={claimId} />}

            {activeTab === "document" && (
              <DocumentManager claimId={claimId} />
            )}

            {activeTab === "invoice" && (
              <InvoiceManager claimId={claimId} />
            )}
          </UnsavedChangesContext.Provider>
        </div>

        {/* Unsaved Changes Dialog */}
        <UnsavedChangesDialog
          isOpen={showDialog}
          onDiscard={handleDiscardChanges}
          onCancel={handleCancelNavigation}
        />
      </main>
    </div>
  );
}