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
import SummaryPage from "@/app/components/Summary";
import { use } from "react";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";

type TabKey =
  | "summary"
  | "pre-inspection"
  | "cancellation"
  | "storage-recovery"
  | "rental-agreement"
  | "claim"
  | "document"
  | "invoice";

const ALL_TABS: { key: TabKey; label: string }[] = [
  { key: "summary", label: "Summary" },
  { key: "claim", label: "RTA Form" },
  { key: "rental-agreement", label: "Rental Agreement" },
  { key: "storage-recovery", label: "Storage" },
  { key: "cancellation", label: "Cancellation" },
  { key: "pre-inspection", label: "Hire Vehicle" },
  { key: "document", label: "Documents" },
  { key: "invoice", label: "Invoice" },
];

// Filter tabs based on claim type
const getVisibleTabs = (claimType?: string | null): typeof ALL_TABS => {
  if (claimType?.toLowerCase() === "vehicle damage") {
    return [
      { key: "summary", label: "Summary" },
      { key: "claim", label: "RTA Form" },
      { key: "document", label: "Documents" },
      { key: "invoice", label: "Invoice" },
    ];
  }
  // Show all tabs for other claim types
  return ALL_TABS;
};

const STATUS_OPTIONS = [
  { value: "claim created", label: "Claim Created" },
  { value: "hire start", label: "Hire Start" },
  { value: "client paid", label: "Client Paid" },
  { value: "hire end", label: "Hire End" },
  { value: "invoice sent", label: "Invoice Sent" },
  { value: "close claim", label: "Close Claim" },
];

interface ClaimData {
  claim_id: string;
  claimant_name: string | null;
  claim_type: string | null;
  customer_type?: string;
  status?: string;
  [key: string]: any;
}

export const UnsavedChangesContext = React.createContext<{
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (value: boolean) => void;
} | null>(null);

export default function HomePage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const claimId = unwrappedParams.id;

  const [activeTab, setActiveTab] = useState<TabKey>("summary"); // Default to Summary
  const [claimData, setClaimData] = useState<ClaimData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingTab, setPendingTab] = useState<TabKey | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  // Status update related state
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const visibleTabs = getVisibleTabs(claimData?.claim_type);

  // Auto switch to first available tab if current tab is hidden
  useEffect(() => {
    if (claimData && !visibleTabs.some((tab) => tab.key === activeTab)) {
      setActiveTab(visibleTabs[0]?.key || "summary");
    }
  }, [claimData, visibleTabs, activeTab]);

  const fetchClaim = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await api.get(`/api/claims/${claimId}`, {
        headers: { requiresAuth: true },
      });
      const data = res.data;
      setClaimData(data);
      setSelectedStatus(data.status || "claim created");
    } catch (err: any) {
      console.error("Failed to fetch claim:", err);
      setError(
        err.response?.data?.detail || "Could not load claim details. Please try again later."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!claimId) return;
    fetchClaim();
  }, [claimId]);

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
    window.location.reload();
  };

  const handleUpdateStatus = async () => {
    if (!selectedStatus || !claimData) return;
    if (selectedStatus === claimData.status) {
      setStatusMessage({ type: "success", text: "No change needed" });
      return;
    }

    setStatusSaving(true);
    setStatusMessage(null);

    try {
      await api.put(
        `/api/claims/${claimId}/status`,
        { status: selectedStatus },
        { headers: { requiresAuth: true } }
      );

      setClaimData((prev) => (prev ? { ...prev, status: selectedStatus } : null));
      setStatusMessage({ type: "success", text: "Status updated successfully" });
    } catch (err: any) {
      console.error("Status update failed:", err);
      setStatusMessage({
        type: "error",
        text: err.response?.data?.detail || "Failed to update status",
      });
    } finally {
      setStatusSaving(false);
    }
  };

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
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50/40 pb-12">
      {/* Customer Info Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-lg p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
            <h2 className="text-lg font-bold text-green-800">
              Claim / Customer Details
            </h2>
            <button
              onClick={refreshPage}
              className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition flex items-center gap-2"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
              <span className="ml-3 text-gray-600">Loading claim details...</span>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl">
              {error}
            </div>
          ) : claimData ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
              <div>
                <p className="text-gray-500">Claim ID</p>
                <p className="font-medium text-gray-900 mt-1">{claimData.claim_id?.toUpperCase() || "—"}</p>
              </div>

              <div>
                <p className="text-gray-500">Claimant Name</p>
                <p className="font-medium text-gray-900 mt-1">{claimData.claimant_name || "—"}</p>
              </div>

              <div>
                <p className="text-gray-500">Claim Type</p>
                <p className="font-medium text-gray-900 mt-1">
                  {claimData.claim_type
                    ? claimData.claim_type.charAt(0).toUpperCase() + claimData.claim_type.slice(1)
                    : "—"}
                </p>
              </div>

              <div className="lg:col-span-1">
                <p className="text-gray-500">Status</p>
                <div className="mt-1 flex flex-col sm:flex-row sm:items-center gap-3">
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    disabled={statusSaving}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-green-400 bg-white text-sm"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={handleUpdateStatus}
                    disabled={statusSaving || selectedStatus === claimData.status}
                    className={`px-4 py-2 rounded-lg text-white text-sm font-medium flex items-center gap-2 transition
                      ${statusSaving
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-green-600 hover:bg-green-700"
                      }`}
                  >
                    {statusSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Update"
                    )}
                  </button>
                </div>

                {statusMessage && (
                  <div
                    className={`mt-2 text-sm flex items-center gap-1.5 ${statusMessage.type === "success" ? "text-green-700" : "text-red-700"
                      }`}
                  >
                    {statusMessage.type === "success" ? (
                      <CheckCircle size={16} />
                    ) : (
                      <AlertCircle size={16} />
                    )}
                    {statusMessage.text}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-gray-600">No claim data available.</p>
          )}
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Smaller Tabs - All fit in one line */}
        <div className="flex flex-wrap gap-1.5 p-1 bg-green-100/50 rounded-xl overflow-x-auto mb-6 scrollbar-hide">
          {visibleTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleTabChange(tab.key)}
              className={`flex-1 min-w-[110px] max-w-[140px] py-2.5 px-3 text-xs sm:text-sm font-medium rounded-lg transition-all whitespace-nowrap ${activeTab === tab.key
                  ? "bg-green-600 text-white shadow-md"
                  : "text-gray-600 hover:bg-white/70 active:bg-white"
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
            {activeTab === "summary" && <SummaryPage claimId={claimId} />}

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