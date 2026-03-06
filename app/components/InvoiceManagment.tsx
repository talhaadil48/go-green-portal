"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, RefreshCw, Edit2, X ,Check } from "lucide-react";
import api from "@/lib/axios";

interface ClaimInvoice {
  id: number;
  claim_id: string | null;
  claimant_name: string | null;
  invoice_datetime: string | null;
  info: string | null;
  docs: string | null;
  storage_bill: number | null;
  rent_bill: number | null;
}

interface LongHireInvoice {
  id: number;
  claim_id: string | null;
  hirer_name: string | null;
  amount: number | null;
  date_sent: string | null;
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCurrency(value: number | null | undefined) {
  if (value == null) value = 0;
  return value.toLocaleString("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function getInfoBadge(info: string | null) {
  if (!info) return <span className="text-xs text-slate-400">—</span>;

  const upper = info.toUpperCase();
  if (upper.includes("SENT")) {
    return (
      <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded-full">
        {info}
      </span>
    );
  }
  if (upper.includes("PENDING") || upper.includes("DRAFT")) {
    return (
      <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded-full">
        {info}
      </span>
    );
  }
  return <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded-full">{info}</span>;
}

export default function InvoiceManagementPage() {
  const router = useRouter();

  // Tab state
  const [activeTab, setActiveTab] = useState<"claim" | "longhire">("claim");

  // Claim Invoices
  const [claimInvoices, setClaimInvoices] = useState<ClaimInvoice[]>([]);
  const [loadingClaim, setLoadingClaim] = useState(true);
  const [errorClaim, setErrorClaim] = useState<string | null>(null);

  // Long Hire Invoices
  const [longHireInvoices, setLongHireInvoices] = useState<LongHireInvoice[]>([]);
  const [loadingLongHire, setLoadingLongHire] = useState(true);
  const [errorLongHire, setErrorLongHire] = useState<string | null>(null);

  // Editing state (only for claim invoices)
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState({
    info: "",
    storage_bill: "",
    rent_bill: "",
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Shared Filters
  const [search, setSearch] = useState("");
  const [filterClaimId, setFilterClaimId] = useState("");
  // Claim-specific
  const [filterClaimant, setFilterClaimant] = useState("");
  const [filterInfo, setFilterInfo] = useState("");
  // Long-hire specific
  const [filterHirer, setFilterHirer] = useState("");

  // Create form – Claim Invoices
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    claim_id: "",
    claimant_name: "",
    storage_bill: "",
    rent_bill: "",
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const fetchClaimInvoices = async () => {
    setLoadingClaim(true);
    setErrorClaim(null);
    try {
      const res = await api.get("/api/invoice", { headers: { requiresAuth: true } });
      setClaimInvoices(res.data.data || []);
    } catch (err: any) {
      setErrorClaim(err.response?.data?.message || "Failed to load claim invoices.");
    } finally {
      setLoadingClaim(false);
    }
  };

  const fetchLongHireInvoices = async () => {
    setLoadingLongHire(true);
    setErrorLongHire(null);
    try {
      const res = await api.get("/api/long_hire_invoice", { headers: { requiresAuth: true } });
      setLongHireInvoices(res.data.data || []);
    } catch (err: any) {
      setErrorLongHire(err.response?.data?.message || "Failed to load long hire invoices.");
    } finally {
      setLoadingLongHire(false);
    }
  };

  useEffect(() => {
    fetchClaimInvoices();
    fetchLongHireInvoices();
  }, []);

  // ── Create Claim Invoice ────────────────────────────────────────────────
  const handleCreateClaimInvoice = async (e: FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);

    try {
      const payload = {
        claim_id: createFormData.claim_id.trim() || null,
        claimant_name: createFormData.claimant_name.trim() || null,
        storage_bill: createFormData.storage_bill ? Number(createFormData.storage_bill) : null,
        rent_bill: createFormData.rent_bill ? Number(createFormData.rent_bill) : null,
      };

      await api.post("/api/invoice", payload, { headers: { requiresAuth: true } });

      setCreateFormData({ claim_id: "", claimant_name: "", storage_bill: "", rent_bill: "" });
      setShowCreateForm(false);
      await fetchClaimInvoices();
    } catch (err: any) {
      setCreateError(err.response?.data?.message || "Failed to create invoice.");
    } finally {
      setCreating(false);
    }
  };

  // ── Start / Cancel / Save Edit ──────────────────────────────────────────
  const startEditing = (inv: ClaimInvoice) => {
    setEditingId(inv.id);
    setEditFormData({
      info: inv.info || "",
      storage_bill: inv.storage_bill?.toString() || "",
      rent_bill: inv.rent_bill?.toString() || "",
    });
    setSaveError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditFormData({ info: "", storage_bill: "", rent_bill: "" });
    setSaveError(null);
  };

  const handleSaveEdit = async (invoiceId: number) => {
    setSaving(true);
    setSaveError(null);

    try {
      const payload = {
        info: editFormData.info.trim() || null,
        storage_bill: editFormData.storage_bill ? Number(editFormData.storage_bill) : null,
        rent_bill: editFormData.rent_bill ? Number(editFormData.rent_bill) : null,
      };

      const res = await api.put(`/api/invoice/${invoiceId}`, payload, {
        headers: { requiresAuth: true },
      });

      if (!res.data.success) {
        throw new Error(res.data.message || "Update failed");
      }

      // Refresh list
      await fetchClaimInvoices();
      cancelEdit();
    } catch (err: any) {
      setSaveError(err.response?.data?.message || "Failed to update invoice.");
    } finally {
      setSaving(false);
    }
  };

  // Filtering – Claim Invoices
  const filteredClaimInvoices = claimInvoices.filter((inv) => {
    const matchesSearch =
      !search ||
      String(inv.id).includes(search) ||
      inv.claim_id?.toLowerCase().includes(search.toLowerCase()) ||
      inv.claimant_name?.toLowerCase().includes(search.toLowerCase());

    const matchesClaimId = !filterClaimId || inv.claim_id?.toLowerCase().includes(filterClaimId.toLowerCase());
    const matchesClaimant = !filterClaimant || inv.claimant_name?.toLowerCase().includes(filterClaimant.toLowerCase());
    const matchesInfo = !filterInfo || inv.info?.toLowerCase().includes(filterInfo.toLowerCase());

    return matchesSearch && matchesClaimId && matchesClaimant && matchesInfo;
  });

  // Filtering – Long Hire Invoices
  const filteredLongHireInvoices = longHireInvoices.filter((inv) => {
    const matchesSearch =
      !search ||
      String(inv.id).includes(search) ||
      inv.claim_id?.toLowerCase().includes(search.toLowerCase()) ||
      inv.hirer_name?.toLowerCase().includes(search.toLowerCase());

    const matchesClaimId = !filterClaimId || inv.claim_id?.toLowerCase().includes(filterClaimId.toLowerCase());
    const matchesHirer = !filterHirer || inv.hirer_name?.toLowerCase().includes(filterHirer.toLowerCase());

    return matchesSearch && matchesClaimId && matchesHirer;
  });

  const isClaimTab = activeTab === "claim";
  const isLoading = isClaimTab ? loadingClaim : loadingLongHire;
  const error = isClaimTab ? errorClaim : errorLongHire;
  const filteredCount = isClaimTab ? filteredClaimInvoices.length : filteredLongHireInvoices.length;
  const totalCount = isClaimTab ? claimInvoices.length : longHireInvoices.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50/40">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-2xl font-extrabold text-green-800 tracking-tight">
              Invoice Management
            </h1>
            <p className="mt-1 text-lg text-green-700/80">Transport / RTA & Long Term Hire invoices</p>
          </div>

          <div className="flex gap-3 mt-4 md:mt-0">
            <button
              onClick={() => {
                fetchClaimInvoices();
                fetchLongHireInvoices();
              }}
              disabled={isLoading}
              className="px-5 py-2 bg-white border border-green-200 text-green-700 rounded-xl hover:bg-green-50 transition disabled:opacity-50 flex items-center gap-2 text-sm"
            >
              <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
              Refresh All
            </button>

            {isClaimTab && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-2.5 px-5 rounded-full shadow-lg flex items-center gap-2 text-sm"
              >
                <Plus size={16} />
                New Claim Invoice
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-green-200">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab("claim")}
              className={`pb-3 px-1 text-lg font-medium transition-colors ${
                activeTab === "claim"
                  ? "text-green-700 border-b-4 border-green-600"
                  : "text-green-600/70 hover:text-green-700"
              }`}
            >
              Claim Invoices
            </button>
            <button
              onClick={() => setActiveTab("longhire")}
              className={`pb-3 px-1 text-lg font-medium transition-colors ${
                activeTab === "longhire"
                  ? "text-green-700 border-b-4 border-green-600"
                  : "text-green-600/70 hover:text-green-700"
              }`}
            >
              Long Term Hire
            </button>
          </div>
        </div>

        {/* Create Form */}
        {isClaimTab && showCreateForm && (
          <div className="mb-10 bg-white/80 backdrop-blur-md shadow-xl rounded-2xl border border-green-100/60 p-6">
            <h2 className="text-xl font-bold text-green-800 mb-5">Create New Claim Invoice</h2>
            <form onSubmit={handleCreateClaimInvoice} className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Claim ID</label>
                <input
                  type="text"
                  value={createFormData.claim_id}
                  onChange={(e) => setCreateFormData((p) => ({ ...p, claim_id: e.target.value }))}
                  placeholder="TC123"
                  className="w-full px-3 py-2 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-400 bg-white/70 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Claimant Name</label>
                <input
                  type="text"
                  value={createFormData.claimant_name}
                  onChange={(e) => setCreateFormData((p) => ({ ...p, claimant_name: e.target.value }))}
                  placeholder="Muhammad Ahmed"
                  className="w-full px-3 py-2 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-400 bg-white/70 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Storage Bill (£)</label>
                <input
                  type="number"
                  value={createFormData.storage_bill}
                  onChange={(e) => setCreateFormData((p) => ({ ...p, storage_bill: e.target.value }))}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-400 bg-white/70 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Rent Bill (£)</label>
                <input
                  type="number"
                  value={createFormData.rent_bill}
                  onChange={(e) => setCreateFormData((p) => ({ ...p, rent_bill: e.target.value }))}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-400 bg-white/70 text-sm"
                />
              </div>

              <div className="md:col-span-2 flex justify-end gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-5 py-2 border border-green-200 text-green-700 rounded-lg hover:bg-green-50 transition text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-2 px-6 rounded-full shadow flex items-center gap-2 disabled:opacity-60 text-sm"
                >
                  {creating ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create"
                  )}
                </button>
              </div>

              {createError && (
                <p className="md:col-span-2 text-red-600 text-center text-sm mt-2">{createError}</p>
              )}
            </form>
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Quick search..."
            className="px-3 py-2 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-400 bg-white/70 text-sm"
          />
          <input
            type="text"
            value={filterClaimId}
            onChange={(e) => setFilterClaimId(e.target.value)}
            placeholder="Filter Claim ID"
            className="px-3 py-2 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-400 bg-white/70 text-sm"
          />

          {isClaimTab ? (
            <>
              <input
                type="text"
                value={filterClaimant}
                onChange={(e) => setFilterClaimant(e.target.value)}
                placeholder="Filter Claimant"
                className="px-3 py-2 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-400 bg-white/70 text-sm"
              />
              <input
                type="text"
                value={filterInfo}
                onChange={(e) => setFilterInfo(e.target.value)}
                placeholder="Filter Info / Status"
                className="px-3 py-2 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-400 bg-white/70 text-sm"
              />
            </>
          ) : (
            <input
              type="text"
              value={filterHirer}
              onChange={(e) => setFilterHirer(e.target.value)}
              placeholder="Filter Hirer Name"
              className="px-3 py-2 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-400 bg-white/70 text-sm"
            />
          )}

          <div className="text-xs font-medium text-green-700 bg-white border border-green-200 rounded-lg px-3 py-2 flex items-center justify-center">
            {filteredCount} / {totalCount}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Table */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-12 h-12 text-green-600 animate-spin" />
          </div>
        ) : (isClaimTab ? filteredClaimInvoices : filteredLongHireInvoices).length === 0 ? (
          <div className="text-center py-12 bg-white/60 rounded-2xl border border-green-100 shadow text-sm text-green-700/80">
            {search || filterClaimId || (isClaimTab ? filterClaimant || filterInfo : filterHirer)
              ? "No matching invoices"
              : `No ${isClaimTab ? "claim" : "long term hire"} invoices yet`}
          </div>
        ) : (
          <div className="bg-white/85 backdrop-blur-sm border border-green-100 rounded-xl shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-300 text-xs">
                <thead className="bg-green-50/70">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-green-800 border-r border-gray-400">Claim ID</th>

                    {isClaimTab ? (
                      <>
                        <th className="px-3 py-2 text-left font-semibold text-green-800 border-r border-gray-400">Claimant</th>
                        <th className="px-3 py-2 text-left font-semibold text-green-800 border-r border-gray-400">Date / Time</th>
                        <th className="px-3 py-2 text-left font-semibold text-green-800 border-r border-gray-400">Info</th>
                        <th className="px-3 py-2 text-right font-semibold text-green-800 border-r border-gray-400">Storage</th>
                        <th className="px-3 py-2 text-right font-semibold text-green-800 border-r border-gray-400">Hire</th>
                        <th className="px-3 py-2 text-right font-semibold text-green-800 border-r border-gray-400">Total</th>
                        <th className="px-3 py-2 text-center font-semibold text-green-800">Actions</th>
                      </>
                    ) : (
                      <>
                        <th className="px-3 py-2 text-left font-semibold text-green-800 border-r border-gray-400">Hirer</th>
                        <th className="px-3 py-2 text-left font-semibold text-green-800 border-r border-gray-400">Date Sent</th>
                        <th className="px-3 py-2 text-right font-semibold text-green-800 border-r border-gray-400">Amount</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {isClaimTab
                    ? filteredClaimInvoices.map((inv) => {
                        const isEditing = editingId === inv.id;

                        return (
                          <tr key={inv.id} className="hover:bg-green-50/30 transition-colors">
                            <td className="px-3 py-1.5 border-r border-gray-300">{inv.claim_id || "—"}</td>
                            <td className="px-3 py-1.5 border-r border-gray-300 truncate max-w-[180px]">
                              {inv.claimant_name || "—"}
                            </td>
                            <td className="px-3 py-1.5 border-r border-gray-300 whitespace-nowrap">
                              {formatDate(inv.invoice_datetime)}
                            </td>

                            <td className="px-3 py-1.5 border-r border-gray-300 text-center">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editFormData.info}
                                  onChange={(e) =>
                                    setEditFormData((p) => ({ ...p, info: e.target.value }))
                                  }
                                  className="w-full px-2 py-1 border border-green-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-green-500"
                                  placeholder="e.g. SENT"
                                />
                              ) : (
                                getInfoBadge(inv.info)
                              )}
                            </td>

                            <td className="px-3 py-1.5 text-right border-r border-gray-300 font-medium">
                              {isEditing ? (
                                <input
                                  type="number"
                                  value={editFormData.storage_bill}
                                  onChange={(e) =>
                                    setEditFormData((p) => ({ ...p, storage_bill: e.target.value }))
                                  }
                                  className="w-20 text-right px-2 py-1 border border-green-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-green-500"
                                  placeholder="0"
                                />
                              ) : (
                                formatCurrency(inv.storage_bill)
                              )}
                            </td>

                            <td className="px-3 py-1.5 text-right border-r border-gray-300 font-medium">
                              {isEditing ? (
                                <input
                                  type="number"
                                  value={editFormData.rent_bill}
                                  onChange={(e) =>
                                    setEditFormData((p) => ({ ...p, rent_bill: e.target.value }))
                                  }
                                  className="w-20 text-right px-2 py-1 border border-green-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-green-500"
                                  placeholder="0"
                                />
                              ) : (
                                formatCurrency(inv.rent_bill)
                              )}
                            </td>

                            <td className="px-3 py-1.5 text-right border-r border-gray-300 font-medium">
                              {formatCurrency((inv.rent_bill || 0) + (inv.storage_bill || 0))}
                            </td>

                            <td className="px-3 py-1.5 text-center">
                              {isEditing ? (
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => handleSaveEdit(inv.id)}
                                    disabled={saving}
                                    className="text-green-600 hover:text-green-800 disabled:opacity-50"
                                    title="Save"
                                  >
                                    <Check size={16} />
                                  </button>
                                  <button
                                    onClick={cancelEdit}
                                    className="text-red-600 hover:text-red-800"
                                    title="Cancel"
                                  >
                                    <X size={16} />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => startEditing(inv)}
                                  className="text-green-600 hover:text-green-800"
                                  title="Edit invoice"
                                >
                                  <Edit2 size={16} />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    : filteredLongHireInvoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-green-50/30 transition-colors">
                          <td className="px-3 py-1.5 border-r border-gray-300">{inv.claim_id || "—"}</td>
                          <td className="px-3 py-1.5 border-r border-gray-300 truncate max-w-[180px]">
                            {inv.hirer_name || "—"}
                          </td>
                          <td className="px-3 py-1.5 border-r border-gray-300 whitespace-nowrap">
                            {formatDate(inv.date_sent)}
                          </td>
                          <td className="px-3 py-1.5 text-right border-r border-gray-300 font-medium">
                            {formatCurrency(inv.amount)}
                          </td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>

            {saveError && (
              <div className="p-4 bg-red-50 border-t border-red-200 text-red-700 text-sm text-center">
                {saveError}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}