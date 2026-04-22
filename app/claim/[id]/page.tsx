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
import SummaryPage from "@/app/components/Summary";
import UnsavedChangesDialog from "@/app/components/UnsavedChangesDialog";
import { CheckCircle, AlertCircle, Loader2, Unlock, Lock, Eye } from "lucide-react";
import { use } from "react";

// Password for unlock
const UNLOCK_PASSWORD = "GG2026gg";

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
];

interface ClaimData {
  claim_id: string;
  claimant_name: string | null;
  claim_type: string | null;
  customer_type?: string;
  status?: string;
  closed_by?: string | null;
  closed_date?: string | null;
  reason?: string;
  ref_no?: string | null;
  is_disputed?: boolean;
  dispute_reason?: string | null;
  locked?: boolean;
  locked_by?: string | null;
  [key: string]: any;
}

export const UnsavedChangesContext = React.createContext<{
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (value: boolean) => void;
  isClosed?: boolean;
} | null>(null);

export default function HomePage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const claimId = unwrappedParams.id;
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabKey>("summary");
  const [claimData, setClaimData] = useState<ClaimData | null>(null);
  const [username, setUsername] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // NEW STATE: View Only mode
  const [isViewOnly, setIsViewOnly] = useState(false);

  // ADD THESE TWO NEW STATES:
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingTab, setPendingTab] = useState<TabKey | null>(null);

  // Form states for the combined single-line update
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [refNo, setRefNo] = useState<string>("");
  const [isDisputed, setIsDisputed] = useState<boolean>(false);
  const [disputeReason, setDisputeReason] = useState<string>("");

  const [isUpdatingDetails, setIsUpdatingDetails] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Password unlock modal states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState("");
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  
  // Heartbeat interval ref
  const heartbeatIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  // Lock details state
  const [lockDetails, setLockDetails] = useState<{
    lockedBy: string | null;
    lockExpiresAt: string | null;
  }>({ lockedBy: null, lockExpiresAt: null });

  const visibleTabs = getVisibleTabs(claimData?.claim_type);

  // Check if claim is closed
  const isClosed = !!(claimData?.closed_by && claimData?.closed_date);
  // Disabled state should apply if claim is closed OR in View Only mode
  const isEffectivelyDisabled = isClosed || isViewOnly;

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
    // Prevent unlock API call if in view-only mode or if locked by someone else
    if (!claimId || !username || !claimData?.locked || isViewOnly) return;
    if (claimData.locked_by && claimData.locked_by.toLowerCase() !== username.toLowerCase()) return;

    try {
      // Use DELETE endpoint to unlock (admin override)
      await api.delete(
        `/api/claims/${claimId}/lock`,
        { headers: { requiresAuth: true } }
      ).catch(() => { });
    } catch (err) {
      console.warn("Failed to unlock claim on exit:", err);
    }
  }, [claimId, username, claimData?.locked, claimData?.locked_by, isViewOnly]);

  useEffect(() => {
    if (!claimId || !username) return;

    const handleBeforeUnloadUnlock = () => unlockClaim();

    window.addEventListener("beforeunload", handleBeforeUnloadUnlock);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnloadUnlock);
      unlockClaim();
    };
  }, [unlockClaim, claimId, username]);

  // Heartbeat to refresh lock
  const sendHeartbeat = useCallback(async () => {
    if (!claimId || !username || !claimData?.locked) return;

    try {
      const res = await api.put(
        `/api/claims/${claimId}/lock`,
        { locked_by: username },
        { headers: { requiresAuth: true } }
      ).catch(() => { });

      // Check if lock was lost (another user took over)
      if (res && res.data && res.data.success === false) {
        console.warn("Lock lost to another user:", res.data.locked_by);
        setError(res.data.message || `This claim is currently locked by ${res.data.locked_by}.`);
        setLockDetails({
          lockedBy: res.data.locked_by || null,
          lockExpiresAt: res.data.lock_expires_at || null,
        });
        setClaimData(prev => prev ? { ...prev, locked: true, locked_by: res.data.locked_by } : null);
      }
    } catch (err) {
      console.warn("Heartbeat failed:", err);
    }
  }, [claimId, username, claimData?.locked]);

  // Lock claim after fetching data
  const lockClaimAfterFetch = useCallback(async (claimInfo: ClaimData) => {
    if (!username) return;

    try {
      const currentUserLower = username.toLowerCase();
      const lockedByLower = claimInfo.locked_by?.toLowerCase() || "";

      // Check if already locked by another user
      if (claimInfo.locked && lockedByLower !== currentUserLower) {
        setError(`This claim is currently locked by ${claimInfo.locked_by}.`);
        return;
      }

      // Lock the claim for current user using PUT with locked_by
      const res = await api.put(
        `/api/claims/${claimId}/lock`,
        { locked_by: username },
        { headers: { requiresAuth: true } }
      );

      // Check if API returned success: false
      if (res.data && res.data.success === false) {
        setError(res.data.message || `This claim is currently locked by ${res.data.locked_by}.`);
        setLockDetails({
          lockedBy: res.data.locked_by || null,
          lockExpiresAt: res.data.lock_expires_at || null,
        });
        setClaimData(prev => prev ? { ...prev, locked: true, locked_by: res.data.locked_by } : null);
        return;
      }

      // Update local state with locked status
      setClaimData(prev => prev ? { ...prev, locked: true, locked_by: username } : null);
    } catch (err: any) {
      console.error("Lock operation failed:", err);
      setError(err.response?.data?.detail || "Failed to lock the claim.");
    }
  }, [claimId, username]);

  // Fetch claim data and handle locking in one go
  useEffect(() => {
    if (!claimId || !username) return;

    const fetchAndLock = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/api/claims/${claimId}`, {
          headers: { requiresAuth: true },
        });
        const data = res.data;
        setClaimData(data);
        setSelectedStatus(data.status || "claim created");
        setRefNo(data.ref_no || "");
        setIsDisputed(data.is_disputed || false);
        setDisputeReason(data.dispute_reason || "");

        // Check and lock the claim
        await lockClaimAfterFetch(data);
      } catch (err: any) {
        setError(err.response?.data?.detail || "Could not load claim details.");
      } finally {
        setLoading(false);
      }
    };

    fetchAndLock();
  }, [claimId, username, lockClaimAfterFetch]);

  // Set up heartbeat every 20 seconds to keep lock alive
  useEffect(() => {
    if (!claimId || !username || !claimData?.locked) return;

    // Send initial heartbeat
    sendHeartbeat();

    // Clear any existing interval
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    // Set up new heartbeat interval (20 seconds)
    heartbeatIntervalRef.current = setInterval(() => {
      sendHeartbeat();
    }, 40000);

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, [claimId, username, claimData?.locked, sendHeartbeat]);

  // Manual unlock with password
  const handlePasswordUnlock = async () => {
    if (!unlockPassword) {
      setUnlockError("Please enter the password");
      return;
    }

    if (unlockPassword !== UNLOCK_PASSWORD) {
      setUnlockError("Incorrect password");
      setUnlockPassword("");
      return;
    }

    setUnlockLoading(true);
    setUnlockError(null);

    try {
      // Use DELETE endpoint to unlock (admin override)
      await api.delete(
        `/api/claims/${claimId}/lock`,
        { headers: { requiresAuth: true } }
      );

      setClaimData(prev => prev ? { ...prev, locked: false, locked_by: null } : null);
      setShowPasswordModal(false);
      setUnlockPassword("");

      // Refresh the page or re-check lock status
      window.location.reload();
    } catch (err: any) {
      setUnlockError(err.response?.data?.detail || "Failed to unlock claim");
    } finally {
      setUnlockLoading(false);
    }
  };

  const handleManualUnlock = async () => {
    await unlockClaim();
    setClaimData(prev => prev ? { ...prev, locked: false, locked_by: null } : null);
    router.push("/claim");
  };

  const handleTabChange = (tabKey: TabKey) => {
    if (hasUnsavedChanges) {
      // Store the tab they want to go to and show the dialog
      setPendingTab(tabKey);
      setShowUnsavedDialog(true);
    } else {
      // No unsaved changes, change tab immediately
      setActiveTab(tabKey);
    }
  };

  const handleConfirmDiscard = () => {
    if (pendingTab) {
      setActiveTab(pendingTab);
      setHasUnsavedChanges(false);
    }
    setShowUnsavedDialog(false);
    setPendingTab(null);
  };

  const handleCancelDialog = () => {
    setShowUnsavedDialog(false);
    setPendingTab(null);
  };
  const refreshPage = () => window.location.reload();

  const isSovereign = claimData?.claim_type?.toLowerCase() === "sovereign";

  // Unified Update Handler
  const handleUpdateDetails = async () => {
    if (!claimData) return;
    setIsUpdatingDetails(true);
    setUpdateMessage(null);

    const promises: Promise<any>[] = [];
    const updatedData = { ...claimData };
    let madeChanges = false;

    try {
      // 1. Status Check
      if (selectedStatus !== claimData.status) {
        promises.push(
          api.put(`/api/claims/${claimId}/status`, { status: selectedStatus }, { headers: { requiresAuth: true } })
        );
        updatedData.status = selectedStatus;
        madeChanges = true;
      }

      // 2. Disputed Check
      const finalDisputeReason = isDisputed ? disputeReason.trim() : "";
      if (isDisputed !== claimData.is_disputed || finalDisputeReason !== (claimData.dispute_reason || "")) {
        promises.push(
          api.put(
            `/api/claims/${claimId}/disputed`,
            { is_disputed: isDisputed, dispute_reason: finalDisputeReason },
            { headers: { requiresAuth: true } }
          )
        );
        updatedData.is_disputed = isDisputed;
        updatedData.dispute_reason = finalDisputeReason;
        madeChanges = true;
      }

      // 3. Ref No Check (Sovereign)
      if (isSovereign && refNo.trim() !== (claimData.ref_no || "")) {
        promises.push(
          api.put(
            `/api/claims/ref-no/${claimId}`,
            { ref_no: refNo.trim() },
            { headers: { requiresAuth: true } }
          )
        );
        updatedData.ref_no = refNo.trim();
        madeChanges = true;
      }

      if (!madeChanges) {
        setUpdateMessage({ type: "success", text: "No changes needed" });
        setIsUpdatingDetails(false);
        return;
      }

      await Promise.all(promises);
      setClaimData(updatedData);
      setUpdateMessage({ type: "success", text: "Claim details updated successfully" });
    } catch (err: any) {
      setUpdateMessage({ type: "error", text: err.response?.data?.detail || "Failed to update details" });
    } finally {
      setIsUpdatingDetails(false);
      // clear message after 3 seconds
      setTimeout(() => setUpdateMessage(null), 3000);
    }
  };


  // Locked by other user screen with password unlock option
  if (error && claimData?.locked && !isViewOnly) {
    const formatExpirationTime = (isoString: string | null) => {
      if (!isoString) return null;
      try {
        const date = new Date(isoString);
        return date.toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        });
      } catch {
        return isoString;
      }
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header with red accent */}
          <div className="bg-gradient-to-r from-red-600 to-red-700 p-6 text-center text-white">
            <Lock className="w-16 h-16 mx-auto mb-3" />
            <h2 className="text-3xl font-bold">Claim is Locked</h2>
          </div>

          {/* Content */}
          <div className="p-8">
            {/* Claim ID */}
            <div className="mb-6 pb-6 border-b border-gray-200">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Claim ID</p>
              <p className="text-lg font-mono font-bold text-gray-900">
                {claimData?.claim_id?.toUpperCase() || claimId?.toUpperCase()}
              </p>
            </div>

            {/* Lock Details */}
            <div className="mb-6 pb-6 border-b border-gray-200">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Lock Details</p>
              <div className="bg-red-50 rounded-lg p-4 space-y-3">
                {/* Locked By */}
                <div>
                  <p className="text-xs text-gray-600 font-medium mb-1">Locked By</p>
                  <p className="text-lg font-bold text-red-700">
                    {lockDetails.lockedBy || claimData?.locked_by || "Unknown User"}
                  </p>
                </div>

              
              </div>
            </div>

          
            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => setIsViewOnly(true)}
                className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors text-base flex items-center justify-center gap-2 shadow-sm"
              >
                <Eye size={20} />
                View Only Mode
              </button>
              <button
                onClick={() => setShowPasswordModal(true)}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors text-base flex items-center justify-center gap-2 shadow-sm"
              >
                <Unlock size={20} />
                Unlock with Password
              </button>
              <button
                onClick={() => router.push("/claim")}
                className="w-full py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-xl transition-colors text-base"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>

        {/* Password Modal */}
        {showPasswordModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="max-w-sm w-full bg-white rounded-2xl shadow-2xl p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Enter Password to Unlock</h3>
              <input
                type="password"
                placeholder="Enter password"
                value={unlockPassword}
                onChange={(e) => {
                  setUnlockPassword(e.target.value);
                  setUnlockError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && unlockPassword) {
                    handlePasswordUnlock();
                  }
                }}
                disabled={unlockLoading}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4 disabled:opacity-60"
              />
              {unlockError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {unlockError}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowPasswordModal(false);
                    setUnlockPassword("");
                    setUnlockError(null);
                  }}
                  disabled={unlockLoading}
                  className="flex-1 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePasswordUnlock}
                  disabled={unlockLoading || !unlockPassword}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {unlockLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Unlocking...
                    </>
                  ) : (
                    <>
                      <Unlock size={16} />
                      Unlock
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50/40 pb-12 ${isEffectivelyDisabled ? "disabled-all" : ""}`}>
      {/* Disable all inputs globally when claim is closed OR in View Only mode */}
      {isEffectivelyDisabled && (
        <style jsx global>{`
          .disabled-all input,
          .disabled-all textarea,
          .disabled-all select,
          .disabled-all button:not(.unlock-btn):not(.refresh-btn):not(.action-btn):not(.tab-btn),
          .disabled-all [role="checkbox"],
          .disabled-all [role="radio"] {
            pointer-events: none;
            opacity: 0.6;
            cursor: not-allowed;
            background-color: #f3f4f6 !important;
            color: #26292e !important;
            border-color: #d1d5db !important;
          }
        `}</style>
      )}

      {/* View Only Banner */}
      {isViewOnly && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="bg-blue-50 border-l-4 border-blue-600 rounded-lg p-4 mb-4 shadow-sm">
            <div className="flex items-start gap-3">
              <Eye className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-900">View-Only Mode</p>
                <p className="text-sm text-blue-800 mt-1">
                  This claim is locked by {claimData?.locked_by}. You are viewing it in read-only mode.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Closed Claim Banner */}
      {isClosed && !isViewOnly && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-18">
          <div className="bg-amber-50 border-l-4 border-amber-600 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900">This claim is closed</p>
                <p className="text-sm text-amber-800 mt-1">
                  Closed by {claimData?.closed_by} on {claimData?.closed_date ? new Date(claimData.closed_date).toLocaleDateString() : "—"}<br />
                  Reason: {claimData?.reason || "—"}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Customer Info Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-lg p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
            <h2 className="text-lg font-bold text-green-800">Claim / Customer Details</h2>
            <div className="flex items-center gap-3">
              <button
                onClick={refreshPage}
                className="refresh-btn action-btn px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition flex items-center gap-2"
              >
                Refresh
              </button>

              {claimData?.locked && !isViewOnly && (
                <button
                  onClick={handleManualUnlock}
                  className="unlock-btn action-btn flex items-center gap-2 px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition"
                >
                  <Unlock size={18} />
                  Unlock Claim
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
              <span className="ml-3 text-gray-600">Loading claim...</span>
            </div>
          ) : error && !isViewOnly ? (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl">{error}</div>
          ) : claimData ? (
            <div className="space-y-6">
              {/* Top Read-Only Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm">
                <div>
                  <p className="text-gray-500">Claim ID</p>
                  <p className="font-medium text-gray-900 mt-1">{claimData.claim_id?.toUpperCase() || "—"}</p>
                </div>
                <div>
                  <p className="text-gray-500">Claimant Name</p>
                  <p className="font-medium text-gray-900 mt-1">{claimData.claimant_name?.toUpperCase() || "—"}</p>
                </div>
                <div>
                  <p className="text-gray-500">Claim Type</p>
                  <p className="font-medium text-gray-900 mt-1">
                    {claimData.claim_type
                      ? claimData.claim_type === "learning"
                        ? "Learner"
                        : claimData.claim_type.charAt(0).toUpperCase() + claimData.claim_type.slice(1)
                      : "—"}
                  </p>
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* Single Line Update Section */}
              <div className="flex flex-col xl:flex-row xl:items-end gap-4">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 xl:flex gap-4 items-start xl:items-center">

                  {/* Status Dropdown */}
                  <div className="flex-1 min-w-[150px]">
                    <label className="block text-xs text-gray-500 mb-1">Hire Stage</label>
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      disabled={isUpdatingDetails || isEffectivelyDisabled}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 bg-white text-sm disabled:bg-gray-100 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Disputed Status */}
                  <div className="flex-1 min-w-[120px]">
                    <label className="block text-xs text-gray-500 mb-1">Disputed</label>
                    <select
                      value={isDisputed ? "yes" : "no"}
                      onChange={(e) => setIsDisputed(e.target.value === "yes")}
                      disabled={isUpdatingDetails || isEffectivelyDisabled}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 bg-white text-sm disabled:bg-gray-100 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                    </select>
                  </div>

                  {/* Disputed Reason (Conditional) */}
                  {isDisputed && (
                    <div className="flex-2 min-w-[200px] xl:w-64">
                      <label className="block text-xs text-gray-500 mb-1">Dispute Reason</label>
                      <input
                        type="text"
                        value={disputeReason}
                        onChange={(e) => setDisputeReason(e.target.value)}
                        placeholder="Enter reason..."
                        disabled={isUpdatingDetails || isEffectivelyDisabled}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 bg-white text-sm disabled:bg-gray-100 disabled:opacity-60"
                      />
                    </div>
                  )}

                  {/* Ref No (Sovereign Only) */}
                  {isSovereign && (
                    <div className="flex-1 min-w-[150px]">
                      <label className="block text-xs text-gray-500 mb-1">Ref No</label>
                      <input
                        type="text"
                        value={refNo}
                        onChange={(e) => setRefNo(e.target.value)}
                        placeholder="Reference no."
                        disabled={isUpdatingDetails || isEffectivelyDisabled}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 bg-white text-sm disabled:bg-gray-100 disabled:opacity-60"
                      />
                    </div>
                  )}
                </div>

                {/* Single Update Button */}
                <div className="flex flex-col items-start xl:items-end min-w-[120px]">
                  <button
                    onClick={handleUpdateDetails}
                    disabled={
                      isUpdatingDetails ||
                      isEffectivelyDisabled ||
                      (selectedStatus === claimData.status &&
                        isDisputed === (claimData.is_disputed || false) &&
                        (isDisputed ? disputeReason === (claimData.dispute_reason || "") : true) &&
                        (!isSovereign || refNo === (claimData.ref_no || "")))
                    }
                    className={`px-6 py-2 rounded-lg text-white text-sm font-medium flex items-center justify-center gap-2 transition w-full xl:w-auto mt-auto mb-[2px] ${isUpdatingDetails || isEffectivelyDisabled ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
                      }`}
                  >
                    {isUpdatingDetails ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Update Details"
                    )}
                  </button>
                </div>
              </div>

              {/* Combined Feedback Message */}
              {updateMessage && (
                <div className={`mt-2 text-sm flex items-center gap-1.5 ${updateMessage.type === "success" ? "text-green-700" : "text-red-700"}`}>
                  {updateMessage.type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                  {updateMessage.text}
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-600">No claim data available.</p>
          )}
        </div>
      </section>

      {(!error || isViewOnly) && claimData && (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-wrap gap-1.5 p-1 bg-green-100/50 rounded-xl overflow-x-auto mb-6 scrollbar-hide">
            {visibleTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`tab-btn action-btn flex-1 min-w-[110px] max-w-[140px] py-2.5 px-3 text-xs sm:text-sm font-medium rounded-lg transition-all whitespace-nowrap ${activeTab === tab.key
                  ? "bg-green-600 text-white shadow-md"
                  : "text-gray-600 hover:bg-white/70 active:bg-white"
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl shadow-lg p-6 sm:p-8">
            <UnsavedChangesContext.Provider value={{ hasUnsavedChanges, setHasUnsavedChanges, isClosed: isEffectivelyDisabled }}>
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
        </main>
      )}
       <UnsavedChangesDialog
        isOpen={showUnsavedDialog}
        onDiscard={handleConfirmDiscard}
        onCancel={handleCancelDialog}
      />
    </div>
  );
}
