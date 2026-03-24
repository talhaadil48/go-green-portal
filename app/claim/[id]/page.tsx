"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
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
import { CheckCircle, AlertCircle, Loader2, Unlock } from "lucide-react";

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

const getVisibleTabs = (claimType?: string | null): typeof ALL_TABS => {
  if (claimType?.toLowerCase() === "vehicle damage") {
    return [
      { key: "summary", label: "Summary" },
      { key: "claim", label: "RTA Form" },
      { key: "document", label: "Documents" },
      { key: "invoice", label: "Invoice" },
    ];
  }
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

interface LockData {
  locked: boolean;
  locked_by: string | null;
}

export const UnsavedChangesContext = React.createContext<{
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (value: boolean) => void;
} | null>(null);

export default function HomePage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const claimId = unwrappedParams.id;
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabKey>("summary");
  const [claimData, setClaimData] = useState<ClaimData | null>(null);
  const [lockData, setLockData] = useState<LockData | null>(null);
  const [username, setUsername] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [lockChecking, setLockChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingTab, setPendingTab] = useState<TabKey | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  // Status update states
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const visibleTabs = getVisibleTabs(claimData?.claim_type);

  // Get current username
  useEffect(() => {
    const userData = Cookies.get("user");
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        setUsername(parsed?.username || null);
      } catch {
        setUsername(null);
      }
    }
  }, []);

  // ====================== AUTO UNLOCK LOGIC ======================
  const unlockClaim = useCallback(async () => {
    if (!claimId || !username || !lockData?.locked) return;

    try {
      // Use sendBeacon for better reliability during page unload
      const formData = new FormData();
      formData.append("locked", "false");

      navigator.sendBeacon(`${process.env.NEXT_PUBLIC_API_URL}/api/claims/${claimId}/lock`, formData);

      // Also try normal API call as backup
      await api.put(
        `/api/claims/${claimId}/lock`,
        { locked: false },
        { headers: { requiresAuth: true } }
      ).catch(() => {}); // Silent fail on unload
    } catch (err) {
      console.warn("Failed to unlock claim on exit:", err);
    }
  }, [claimId, username, lockData?.locked]);

  // Auto unlock when component unmounts or user navigates away
  useEffect(() => {
    if (!claimId || !username) return;

    const handleBeforeUnload = () => {
      unlockClaim();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      unlockClaim(); // Cleanup when component unmounts
    };
  }, [unlockClaim]);

  // Check and lock claim
  const checkAndLockClaim = async () => {
    if (!username) {
      setError("Unable to determine current user. Please login again.");
      setLockChecking(false);
      return;
    }

    setLockChecking(true);
    try {
      const lockRes = await api.get(`/api/claims/${claimId}/lock`, {
        headers: { requiresAuth: true },
      });
      const lockInfo: LockData = lockRes.data;
      setLockData(lockInfo);

      const currentUserLower = username.toLowerCase();
      const lockedByLower = lockInfo.locked_by?.toLowerCase() || "";

      if (lockInfo.locked && lockedByLower !== currentUserLower) {
        setError(`This claim is currently locked by ${lockInfo.locked_by}.`);
        setLockChecking(false);
        return;
      }

      // Lock for current user
      await api.put(
        `/api/claims/${claimId}/lock`,
        { locked: true, locked_by: username },
        { headers: { requiresAuth: true } }
      );

      const updatedLockRes = await api.get(`/api/claims/${claimId}/lock`, {
        headers: { requiresAuth: true },
      });
      setLockData(updatedLockRes.data);
    } catch (err: any) {
      console.error("Lock operation failed:", err);
      setError(err.response?.data?.detail || "Failed to lock the claim.");
    } finally {
      setLockChecking(false);
    }
  };

  // Fetch claim data
  const fetchClaim = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/claims/${claimId}`, {
        headers: { requiresAuth: true },
      });
      const data = res.data;
      setClaimData(data);
      setSelectedStatus(data.status || "claim created");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Could not load claim details.");
    } finally {
      setLoading(false);
    }
  };

  // Main effect: Lock → Fetch
  useEffect(() => {
    if (!claimId || !username) return;
    checkAndLockClaim().finally(fetchClaim);
  }, [claimId, username]);

  // Manual unlock button
  const handleManualUnlock = async () => {
    await unlockClaim();
    setLockData({ locked: false, locked_by: null });
    router.push("/claim");
  };

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

  const refreshPage = () => window.location.reload();

  const handleUpdateStatus = async () => {
    if (!selectedStatus || !claimData) return;
    if (selectedStatus === claimData.status) {
      setStatusMessage({ type: "success", text: "No change needed" });
      return;
    }

    setStatusSaving(true);
    setStatusMessage(null);

    try {
      await api.put(`/api/claims/${claimId}/status`, { status: selectedStatus }, {
        headers: { requiresAuth: true },
      });
      setClaimData((prev) => (prev ? { ...prev, status: selectedStatus } : null));
      setStatusMessage({ type: "success", text: "Status updated successfully" });
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.response?.data?.detail || "Failed to update status" });
    } finally {
      setStatusSaving(false);
    }
  };

  // Locked by other user screen
  if (error && !lockChecking && lockData?.locked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-red-800 mb-3">Claim is Locked</h2>
          <p className="text-gray-700 text-lg mb-8">{error}</p>
          <button
            onClick={() => router.push("/claim")}
            className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition text-lg"
          >
            OK
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50/40 pb-12">
      {/* Customer Info Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-lg p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
            <h2 className="text-lg font-bold text-green-800">Claim / Customer Details</h2>
            <div className="flex items-center gap-3">
              <button
                onClick={refreshPage}
                className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition flex items-center gap-2"
              >
                Refresh
              </button>

              {lockData?.locked && (
                <button
                  onClick={handleManualUnlock}
                  className="flex items-center gap-2 px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition"
                >
                  <Unlock size={18} />
                  Unlock Claim
                </button>
              )}
            </div>
          </div>

          {(loading || lockChecking) ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
              <span className="ml-3 text-gray-600">Checking lock status & loading claim...</span>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl">{error}</div>
          ) : claimData ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
              {/* ... existing claim info fields ... */}
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
                    ? claimData.claim_type === "learning" ? "Learner" : claimData.claim_type.charAt(0).toUpperCase() + claimData.claim_type.slice(1)
                    : "—"}
                </p>
              </div>

              <div>
                <p className="text-gray-500">Status</p>
                <div className="mt-1 flex flex-col sm:flex-row sm:items-center gap-3">
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    disabled={statusSaving}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 bg-white text-sm"
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
                    className={`px-4 py-2 rounded-lg text-white text-sm font-medium flex items-center gap-2 transition ${statusSaving ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
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
                  <div className={`mt-2 text-sm flex items-center gap-1.5 ${statusMessage.type === "success" ? "text-green-700" : "text-red-700"}`}>
                    {statusMessage.type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
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

      {!error && claimData && (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-wrap gap-1.5 p-1 bg-green-100/50 rounded-xl overflow-x-auto mb-6 scrollbar-hide">
            {visibleTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`flex-1 min-w-[110px] max-w-[140px] py-2.5 px-3 text-xs sm:text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
                  activeTab === tab.key
                    ? "bg-green-600 text-white shadow-md"
                    : "text-gray-600 hover:bg-white/70 active:bg-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl shadow-lg p-6 sm:p-8">
            <UnsavedChangesContext.Provider value={{ hasUnsavedChanges, setHasUnsavedChanges }}>
              {activeTab === "summary" && <SummaryPage claimId={claimId} />}
              {activeTab === "pre-inspection" && <PreInspectionChecklist claimId={claimId} />}
              {activeTab === "cancellation" && <CancellationNotice claimId={claimId} />}
              {activeTab === "storage-recovery" && <StorageRecoveryAgreement claimId={claimId} />}
              {activeTab === "rental-agreement" && <RentalAgreement claimId={claimId} />}
              {activeTab === "claim" && <AccidentClaimForm claimId={claimId} />}
              {activeTab === "document" && <DocumentManager claimId={claimId} />}
              {activeTab === "invoice" && <InvoiceManager claimId={claimId} />}
            </UnsavedChangesContext.Provider>
          </div>

          <UnsavedChangesDialog
            isOpen={showDialog}
            onDiscard={handleDiscardChanges}
            onCancel={handleCancelNavigation}
          />
        </main>
      )}
    </div>
  );
}