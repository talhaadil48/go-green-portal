"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  RefreshCw,
  Edit2,
  X,
  Check,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  Trash2,
} from "lucide-react";
import api from "@/lib/axios";

interface ClaimInvoice {
  id: number;
  claim_id: string | null;
  claim_type: string | null;
  claimant_name: string | null;
  invoice_datetime: string | null;
  info: string | null;
  docs: string | null;
  hire_days: number | null;
  storage_bill: number | null;
  rent_bill: number | null;
  user_name: string | null;
  payment_amount: string | null;
  payment_date: string | null;
}

interface LongHireInvoice {
  id: number;
  claim_id: string | null;
  hirer_name: string | null;
  amount: number | null;
  date_sent: string | null;
  user_name: string | null;
  payment_date: string | null;
}

type SortConfig = {
  key: string;
  direction: "asc" | "desc";
} | null;

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatShortDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatCurrency(value: number | null | undefined | string) {
  let numValue = Number(value);
  if (isNaN(numValue) && typeof value === "string") {
    numValue = parseFloat(value.replace(/[^0-9.-]+/g, "")) || 0;
  }
  if (value == null || isNaN(numValue)) numValue = 0;
  return numValue.toLocaleString("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function getInfoBadge(info: string | null) {
  if (!info) return <span className="text-xs text-slate-400">—</span>;
  return (
    <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded-full">
      {info}
    </span>
  );
}

export default function InvoiceManagementPage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"claim" | "longhire">("claim");

  const [claimInvoices, setClaimInvoices] = useState<ClaimInvoice[]>([]);
  const [loadingClaim, setLoadingClaim] = useState(true);
  const [errorClaim, setErrorClaim] = useState<string | null>(null);

  const [longHireInvoices, setLongHireInvoices] = useState<LongHireInvoice[]>([]);
  const [loadingLongHire, setLoadingLongHire] = useState(true);
  const [errorLongHire, setErrorLongHire] = useState<string | null>(null);

  // Claim invoice editing
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState({
    info: "",
    storage_bill: "",
    rent_bill: "",
    user_name: "",
    payment_amount: "",
    payment_date: "",
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Long hire editing
  const [editingLongHireId, setEditingLongHireId] = useState<number | null>(null);
  const [editLongHireFormData, setEditLongHireFormData] = useState({
    payment_date: "",
  });
  const [savingLongHire, setSavingLongHire] = useState(false);
  const [saveLongHireError, setSaveLongHireError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filterClaimId, setFilterClaimId] = useState("");
  const [filterClaimant, setFilterClaimant] = useState("");
  const [filterInfo, setFilterInfo] = useState("");
  const [filterSentBy, setFilterSentBy] = useState("");
  const [filterHirer, setFilterHirer] = useState("");

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    claim_id: "",
    claimant_name: "",
    storage_bill: "",
    rent_bill: "",
    user_name: "",
    payment_amount: "",
    payment_date: "",
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [sortConfig, setSortConfig] = useState<SortConfig>(null);

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
        user_name: createFormData.user_name.trim() || null,
        payment_amount: createFormData.payment_amount.trim() || null,
        payment_date: createFormData.payment_date.trim() || null,
      };
      await api.post("/api/invoice", payload, { headers: { requiresAuth: true } });
      setCreateFormData({
        claim_id: "", claimant_name: "", storage_bill: "", rent_bill: "",
        user_name: "", payment_amount: "", payment_date: "",
      });
      setShowCreateForm(false);
      await fetchClaimInvoices();
    } catch (err: any) {
      setCreateError(err.response?.data?.message || "Failed to create invoice.");
    } finally {
      setCreating(false);
    }
  };

  // Claim invoice edit handlers
  const startEditing = (inv: ClaimInvoice) => {
    setEditingId(inv.id);
    setEditFormData({
      info: inv.info || "",
      storage_bill: inv.storage_bill?.toString() || "",
      rent_bill: inv.rent_bill?.toString() || "",
      user_name: inv.user_name || "",
      payment_amount: inv.payment_amount || "",
      payment_date: inv.payment_date ? inv.payment_date.slice(0, 10) : "",
    });
    setSaveError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditFormData({ info: "", storage_bill: "", rent_bill: "", user_name: "", payment_amount: "", payment_date: "" });
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
        user_name: editFormData.user_name.trim() || null,
        payment_amount: editFormData.payment_amount.trim() || null,
        payment_date: editFormData.payment_date.trim() || null,
      };
      const res = await api.put(`/api/invoice/${invoiceId}`, payload, {
        headers: { requiresAuth: true },
      });
      if (!res.data.success) throw new Error(res.data.message || "Update failed");
      await fetchClaimInvoices();
      cancelEdit();
    } catch (err: any) {
      setSaveError(err.response?.data?.message || "Failed to update invoice.");
    } finally {
      setSaving(false);
    }
  };

  // Long hire edit handlers
  const startEditingLongHire = (inv: LongHireInvoice) => {
    setEditingLongHireId(inv.id);
    setEditLongHireFormData({
      payment_date: inv.payment_date ? inv.payment_date.slice(0, 10) : "",
    });
    setSaveLongHireError(null);
  };

  const cancelEditLongHire = () => {
    setEditingLongHireId(null);
    setEditLongHireFormData({ payment_date: "" });
    setSaveLongHireError(null);
  };

  // Shared save — pass explicit dateValue so clear (null) path can call it too
  const saveLongHirePaymentDate = async (inv: LongHireInvoice, dateValue: string | null) => {
    if (!inv.claim_id) {
      setSaveLongHireError("Cannot update: no Claim ID on this record.");
      return;
    }
    setSavingLongHire(true);
    setSaveLongHireError(null);
    try {
      const payload = {
        claim_id: inv.claim_id,
        payment_date: dateValue || null,
      };
      const res = await api.post("/api/long_hire_invoice/update_payment_date", payload, {
        headers: { requiresAuth: true },
      });
      if (!res.data.success) throw new Error(res.data.message || "Update failed");
      await fetchLongHireInvoices();
      cancelEditLongHire();
    } catch (err: any) {
      setSaveLongHireError(err.response?.data?.message || "Failed to update payment date.");
    } finally {
      setSavingLongHire(false);
    }
  };

  const handleSaveLongHireEdit = (inv: LongHireInvoice) => {
    saveLongHirePaymentDate(inv, editLongHireFormData.payment_date.trim() || null);
  };

  // Clear payment date → send null
  const handleClearLongHirePaymentDate = (inv: LongHireInvoice) => {
    saveLongHirePaymentDate(inv, null);
  };

  const handleSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const sortData = <T extends Record<string, any>>(data: T[]): T[] => {
    if (!sortConfig) return data;
    return [...data].sort((a, b) => {
      let valA = a[sortConfig.key];
      let valB = b[sortConfig.key];

      if (sortConfig.key === "total") {
        valA = (a.storage_bill || 0) + (a.rent_bill || 0);
        valB = (b.storage_bill || 0) + (b.rent_bill || 0);
      }
      if (sortConfig.key === "payment_amount") {
        valA = typeof valA === "string" ? parseFloat(valA.replace(/[^0-9.-]+/g, "")) || 0 : valA || 0;
        valB = typeof valB === "string" ? parseFloat(valB.replace(/[^0-9.-]+/g, "")) || 0 : valB || 0;
      }

      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return sortConfig.direction === "asc" ? -1 : 1;
      if (valB === null || valB === undefined) return sortConfig.direction === "asc" ? 1 : -1;
      if (typeof valA === "string" && typeof valB === "string") {
        return sortConfig.direction === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
      if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  };

  const filteredClaimInvoices = claimInvoices.filter((inv) => {
    const matchesSearch =
      !search ||
      String(inv.id).includes(search) ||
      inv.claim_id?.toLowerCase().includes(search.toLowerCase()) ||
      inv.claimant_name?.toLowerCase().includes(search.toLowerCase()) ||
      inv.user_name?.toLowerCase().includes(search.toLowerCase());
    const matchesClaimId = !filterClaimId || inv.claim_id?.toLowerCase().includes(filterClaimId.toLowerCase());
    const matchesClaimant = !filterClaimant || inv.claimant_name?.toLowerCase().includes(filterClaimant.toLowerCase());
    const matchesInfo = !filterInfo || inv.info?.toLowerCase().includes(filterInfo.toLowerCase());
    const matchesSentBy = !filterSentBy || inv.user_name?.toLowerCase().includes(filterSentBy.toLowerCase());
    return matchesSearch && matchesClaimId && matchesClaimant && matchesInfo && matchesSentBy;
  });

  const filteredLongHireInvoices = longHireInvoices.filter((inv) => {
    const matchesSearch =
      !search ||
      String(inv.id).includes(search) ||
      inv.claim_id?.toLowerCase().includes(search.toLowerCase()) ||
      inv.hirer_name?.toLowerCase().includes(search.toLowerCase()) ||
      inv.user_name?.toLowerCase().includes(search.toLowerCase());
    const matchesClaimId = !filterClaimId || inv.claim_id?.toLowerCase().includes(filterClaimId.toLowerCase());
    const matchesHirer = !filterHirer || inv.hirer_name?.toLowerCase().includes(filterHirer.toLowerCase());
    const matchesSentBy = !filterSentBy || inv.user_name?.toLowerCase().includes(filterSentBy.toLowerCase());
    return matchesSearch && matchesClaimId && matchesHirer && matchesSentBy;
  });

  const sortedClaimInvoices = sortData(filteredClaimInvoices);
  const sortedLongHireInvoices = sortData(filteredLongHireInvoices);

  const isClaimTab = activeTab === "claim";
  const isLoading = isClaimTab ? loadingClaim : loadingLongHire;
  const error = isClaimTab ? errorClaim : errorLongHire;
  const filteredCount = isClaimTab ? sortedClaimInvoices.length : sortedLongHireInvoices.length;
  const totalCount = isClaimTab ? claimInvoices.length : longHireInvoices.length;

  const SortHeader = ({
    label,
    sortKey,
    align = "left",
  }: {
    label: string;
    sortKey: string;
    align?: "left" | "right" | "center";
  }) => {
    const isActive = sortConfig?.key === sortKey;
    return (
      <th
        className={`px-3 py-2 text-${align} font-semibold text-green-800 border-r border-gray-400 cursor-pointer hover:bg-green-100/50 transition-colors select-none group`}
        onClick={() => handleSort(sortKey)}
      >
        <div
          className={`flex items-center gap-1 ${
            align === "right" ? "justify-end" : align === "center" ? "justify-center" : "justify-start"
          }`}
        >
          {label}
          <span className="text-green-600">
            {isActive ? (
              sortConfig.direction === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />
            ) : (
              <ArrowUpDown size={14} className="opacity-0 group-hover:opacity-50 transition-opacity" />
            )}
          </span>
        </div>
      </th>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50/40">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-2xl font-extrabold text-green-800 tracking-tight">Invoice Management</h1>
            <p className="mt-1 text-lg text-green-700/80">Transport / RTA & Long Term Hire invoices</p>
          </div>
          <div className="flex gap-3 mt-4 md:mt-0">
            <button
              onClick={() => { fetchClaimInvoices(); fetchLongHireInvoices(); }}
              disabled={isLoading}
              className="px-5 py-2 bg-white border border-green-200 text-green-700 rounded-xl hover:bg-green-50 transition disabled:opacity-50 flex items-center gap-2 text-sm"
            >
              <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
              Refresh All
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-green-200">
          <div className="flex space-x-8">
            {(["claim", "longhire"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setSortConfig(null);
                }}
                className={`pb-3 px-1 text-lg font-medium transition-colors ${
                  activeTab === tab
                    ? "text-green-700 border-b-4 border-green-600"
                    : "text-green-600/70 hover:text-green-700"
                }`}
              >
                {tab === "claim" ? "Claim Invoices" : "Long Term Hire"}
              </button>
            ))}
          </div>
        </div>

        {/* Create Form */}
        {isClaimTab && showCreateForm && (
          <div className="mb-10 bg-white/80 backdrop-blur-md shadow-xl rounded-2xl border border-green-100/60 p-6">
            <h2 className="text-xl font-bold text-green-800 mb-5">Create New Hire Invoice</h2>
            <form onSubmit={handleCreateClaimInvoice} className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[
                { label: "Claim ID", key: "claim_id", placeholder: "TC123", type: "text" },
                { label: "Claimant Name", key: "claimant_name", placeholder: "Muhammad Ahmed", type: "text" },
                { label: "Storage Bill (£)", key: "storage_bill", placeholder: "0", type: "number" },
                { label: "Rent Bill (£)", key: "rent_bill", placeholder: "0", type: "number" },
                { label: "Sent By (optional)", key: "user_name", placeholder: "Your name", type: "text" },
                { label: "Payment Amount (optional)", key: "payment_amount", placeholder: "e.g. £500", type: "text" },
              ].map(({ label, key, placeholder, type }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
                  <input
                    type={type}
                    value={createFormData[key as keyof typeof createFormData]}
                    onChange={(e) => setCreateFormData((p) => ({ ...p, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full px-3 py-2 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-400 bg-white/70 text-sm"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Payment Date (optional)</label>
                <input
                  type="date"
                  value={createFormData.payment_date}
                  onChange={(e) => setCreateFormData((p) => ({ ...p, payment_date: e.target.value }))}
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
                  {creating ? <><Loader2 size={14} className="animate-spin" />Creating...</> : "Create"}
                </button>
              </div>
              {createError && (
                <p className="md:col-span-2 text-red-600 text-center text-sm mt-2">{createError}</p>
              )}
            </form>
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Quick search..."
            className="px-3 py-2 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-400 bg-white/70 text-sm"
          />
          <input
            type="text" value={filterClaimId} onChange={(e) => setFilterClaimId(e.target.value)}
            placeholder="Filter Claim ID"
            className="px-3 py-2 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-400 bg-white/70 text-sm"
          />
          {isClaimTab ? (
            <>
              <input type="text" value={filterClaimant} onChange={(e) => setFilterClaimant(e.target.value)}
                placeholder="Filter Claimant"
                className="px-3 py-2 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-400 bg-white/70 text-sm" />
              <input type="text" value={filterInfo} onChange={(e) => setFilterInfo(e.target.value)}
                placeholder="Filter Info / Status"
                className="px-3 py-2 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-400 bg-white/70 text-sm" />
              <input type="text" value={filterSentBy} onChange={(e) => setFilterSentBy(e.target.value)}
                placeholder="Filter Sent By"
                className="px-3 py-2 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-400 bg-white/70 text-sm" />
            </>
          ) : (
            <>
              <input type="text" value={filterHirer} onChange={(e) => setFilterHirer(e.target.value)}
                placeholder="Filter Hirer Name"
                className="px-3 py-2 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-400 bg-white/70 text-sm" />
              <input type="text" value={filterSentBy} onChange={(e) => setFilterSentBy(e.target.value)}
                placeholder="Filter Sent By"
                className="px-3 py-2 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-400 bg-white/70 text-sm" />
            </>
          )}
          <div className="text-xs font-medium text-green-700 bg-white border border-green-200 rounded-lg px-3 py-2 flex items-center justify-center">
            {filteredCount} / {totalCount}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{error}</div>
        )}

        {/* Table */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-12 h-12 text-green-600 animate-spin" />
          </div>
        ) : (isClaimTab ? sortedClaimInvoices : sortedLongHireInvoices).length === 0 ? (
          <div className="text-center py-12 bg-white/60 rounded-2xl border border-green-100 shadow text-sm text-green-700/80">
            {search || filterClaimId || filterSentBy || (isClaimTab ? filterClaimant || filterInfo : filterHirer)
              ? "No matching invoices"
              : `No ${isClaimTab ? "claim" : "long term hire"} invoices yet`}
          </div>
        ) : (
          <div className="bg-white/85 backdrop-blur-sm border border-green-100 rounded-xl shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-300 text-xs">
                <thead className="bg-green-50/70">
                  <tr>
                    <SortHeader label="Claim ID" sortKey="claim_id" />
                    {isClaimTab ? (
                      <>
                        <SortHeader label="Claimant" sortKey="claimant_name" />
                        <SortHeader label="Date / Time" sortKey="invoice_datetime" />
                        <SortHeader label="Info" sortKey="info" align="center" />
                        <SortHeader label="Sent By" sortKey="user_name" />
                        <SortHeader label="Hire Days" sortKey="hire_days" align="right" />
                        <SortHeader label="Storage" sortKey="storage_bill" align="right" />
                        <SortHeader label="Hire" sortKey="rent_bill" align="right" />
                        <SortHeader label="Total" sortKey="total" align="right" />
                        <SortHeader label="Payment Amt" sortKey="payment_amount" />
                        <SortHeader label="Payment Date" sortKey="payment_date" />
                        <th className="px-3 py-2 text-center font-semibold text-green-800">Actions</th>
                      </>
                    ) : (
                      <>
                        <SortHeader label="Hirer" sortKey="hirer_name" />
                        <SortHeader label="Date Sent" sortKey="date_sent" />
                        <SortHeader label="Sent By" sortKey="user_name" />
                        <SortHeader label="Amount" sortKey="amount" align="right" />
                        <SortHeader label="Payment Date" sortKey="payment_date" />
                        <th className="px-3 py-2 text-center font-semibold text-green-800">Actions</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {isClaimTab
                    ? sortedClaimInvoices.map((inv) => {
                        const isEditing = editingId === inv.id;
                        return (
                          <tr key={inv.id} className="hover:bg-green-50/30 transition-colors">
                            <td className="px-3 py-1.5 border-r border-gray-300">{inv.claim_id || "—"}</td>
                            <td className="px-3 py-1.5 border-r border-gray-300 truncate max-w-[180px]">
                              {inv.claimant_name?.toUpperCase() || "—"}
                            </td>
                            <td className="px-3 py-1.5 border-r border-gray-300 whitespace-nowrap">
                              {formatDate(inv.invoice_datetime)}
                            </td>
                            <td className="px-3 py-1.5 border-r border-gray-300 text-center">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editFormData.info}
                                  onChange={(e) => setEditFormData((p) => ({ ...p, info: e.target.value }))}
                                  className="w-full px-2 py-1 border border-green-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-green-500"
                                  placeholder="e.g. SENT"
                                />
                              ) : getInfoBadge(inv.info)}
                            </td>
                            <td className="px-3 py-1.5 border-r border-gray-300">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editFormData.user_name}
                                  onChange={(e) => setEditFormData((p) => ({ ...p, user_name: e.target.value }))}
                                  className="w-full px-2 py-1 border border-green-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-green-500"
                                  placeholder="Name"
                                />
                              ) : (
                                <span className="truncate block max-w-[140px]">{inv.user_name?.toUpperCase() || "—"}</span>
                              )}
                            </td>
                            <td className="px-3 py-1.5 text-right border-r border-gray-300 font-medium">
                              {inv.hire_days !== null && inv.hire_days !== undefined ? inv.hire_days : "—"}
                            </td>
                            <td className="px-3 py-1.5 text-right border-r border-gray-300 font-medium">
                              {isEditing ? (
                                <input
                                  type="number"
                                  value={editFormData.storage_bill}
                                  onChange={(e) => setEditFormData((p) => ({ ...p, storage_bill: e.target.value }))}
                                  className="w-20 text-right px-2 py-1 border border-green-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-green-500"
                                  placeholder="0"
                                />
                              ) : formatCurrency(inv.storage_bill)}
                            </td>
                            <td className="px-3 py-1.5 text-right border-r border-gray-300 font-medium">
                              {isEditing ? (
                                <input
                                  type="number"
                                  value={editFormData.rent_bill}
                                  onChange={(e) => setEditFormData((p) => ({ ...p, rent_bill: e.target.value }))}
                                  className="w-20 text-right px-2 py-1 border border-green-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-green-500"
                                  placeholder="0"
                                />
                              ) : formatCurrency(inv.rent_bill)}
                            </td>
                            <td className="px-3 py-1.5 text-right border-r border-gray-300 font-medium">
                              {formatCurrency((inv.rent_bill || 0) + (inv.storage_bill || 0))}
                            </td>
                            <td className="px-3 py-1.5 border-r border-gray-300">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editFormData.payment_amount}
                                  onChange={(e) => setEditFormData((p) => ({ ...p, payment_amount: e.target.value }))}
                                  className="w-24 px-2 py-1 border border-green-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-green-500"
                                  placeholder="e.g. £500"
                                />
                              ) : (
                                <span className={inv.payment_amount ? "text-green-700 font-medium" : "text-slate-400"}>
                                  {formatCurrency(inv.payment_amount) || "—"}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-1.5 border-r border-gray-300 whitespace-nowrap">
                              {isEditing ? (
                                <input
                                  type="date"
                                  value={editFormData.payment_date}
                                  onChange={(e) => setEditFormData((p) => ({ ...p, payment_date: e.target.value }))}
                                  className="px-2 py-1 border border-green-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-green-500"
                                />
                              ) : (
                                <span className={inv.payment_date ? "text-green-700 font-medium" : "text-slate-400"}>
                                  {formatShortDate(inv.payment_date)}
                                </span>
                              )}
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
                                  <button onClick={cancelEdit} className="text-red-600 hover:text-red-800" title="Cancel">
                                    <X size={16} />
                                  </button>
                                </div>
                              ) : (
                                <button onClick={() => startEditing(inv)} className="text-green-600 hover:text-green-800" title="Edit invoice">
                                  <Edit2 size={16} />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    : sortedLongHireInvoices.map((inv) => {
                        const isEditingLH = editingLongHireId === inv.id;
                        return (
                          <tr key={inv.id} className="hover:bg-green-50/30 transition-colors">
                            <td className="px-3 py-1.5 border-r border-gray-300">{inv.claim_id || "—"}</td>
                            <td className="px-3 py-1.5 border-r border-gray-300 truncate max-w-[180px]">
                              {inv.hirer_name || "—"}
                            </td>
                            <td className="px-3 py-1.5 border-r border-gray-300 whitespace-nowrap">
                              {formatDate(inv.date_sent)}
                            </td>
                            <td className="px-3 py-1.5 border-r border-gray-300 truncate max-w-[140px]">
                              {inv.user_name || "—"}
                            </td>
                            <td className="px-3 py-1.5 text-right border-r border-gray-300 font-medium">
                              {formatCurrency(inv.amount)}
                            </td>

                            {/* Payment Date — editable + clearable */}
                            <td className="px-3 py-1.5 border-r border-gray-300 whitespace-nowrap">
                              {isEditingLH ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="date"
                                    value={editLongHireFormData.payment_date}
                                    onChange={(e) =>
                                      setEditLongHireFormData((p) => ({ ...p, payment_date: e.target.value }))
                                    }
                                    className="px-2 py-1 border border-green-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-green-500"
                                  />
                                  {/* Clear button inside edit mode — wipes the input value */}
                                  {editLongHireFormData.payment_date && (
                                    <button
                                      onClick={() => setEditLongHireFormData((p) => ({ ...p, payment_date: "" }))}
                                      className="text-slate-400 hover:text-red-500 transition-colors"
                                      title="Clear date"
                                    >
                                      <X size={12} />
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <span className={inv.payment_date ? "text-green-700 font-medium" : "text-slate-400"}>
                                    {formatShortDate(inv.payment_date)}
                                  </span>
                                  {/* Quick-clear button when NOT editing — immediately sends null */}
                                  {inv.payment_date && !isEditingLH && (
                                    <button
                                      onClick={() => handleClearLongHirePaymentDate(inv)}
                                      disabled={savingLongHire}
                                      className="text-slate-300 hover:text-red-400 transition-colors disabled:opacity-40"
                                      title="Clear payment date"
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="px-3 py-1.5 text-center">
                              {isEditingLH ? (
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => handleSaveLongHireEdit(inv)}
                                    disabled={savingLongHire}
                                    className="text-green-600 hover:text-green-800 disabled:opacity-50"
                                    title="Save"
                                  >
                                    {savingLongHire ? <Loader2 size={14} className="animate-spin" /> : <Check size={16} />}
                                  </button>
                                  <button
                                    onClick={cancelEditLongHire}
                                    disabled={savingLongHire}
                                    className="text-red-600 hover:text-red-800 disabled:opacity-50"
                                    title="Cancel"
                                  >
                                    <X size={16} />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => startEditingLongHire(inv)}
                                  className="text-green-600 hover:text-green-800"
                                  title="Edit payment date"
                                >
                                  <Edit2 size={16} />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                </tbody>
              </table>
            </div>

            {saveError && (
              <div className="p-4 bg-red-50 border-t border-red-200 text-red-700 text-sm text-center">
                {saveError}
              </div>
            )}
            {saveLongHireError && (
              <div className="p-4 bg-red-50 border-t border-red-200 text-red-700 text-sm text-center">
                {saveLongHireError}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}