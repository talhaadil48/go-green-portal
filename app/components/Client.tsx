"use client";

import { useState, useEffect, FormEvent } from "react";
import { Loader2, RefreshCw, Edit2, X, Check, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import api from "@/lib/axios";

interface Claim {
  claim_id: string;
  claimant_name: string | null;
  claim_start_date: string | null;
  hire_start_date: string | null;
  hire_end_date: string | null;
  payment: number | null;
  pay_date: string | null;
}

type SortKey = keyof Claim;
type SortDirection = "asc" | "desc" | null;

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatCurrency(value: number | string | null | undefined) {
  const num = Number(value) || 0;
  return num.toLocaleString("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function SortIcon({ direction }: { direction: SortDirection }) {
  if (direction === "asc") return <ChevronUp size={14} className="inline ml-1 text-green-700" />;
  if (direction === "desc") return <ChevronDown size={14} className="inline ml-1 text-green-700" />;
  return <ChevronsUpDown size={14} className="inline ml-1 text-green-400 opacity-60" />;
}

export default function ClientsPage() {
  const [activeTab, setActiveTab] = useState<"clients" | "fleet">("clients");
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPayment, setEditPayment] = useState("");
  const [editPayDate, setEditPayDate] = useState("");
  // Track which row is currently saving for inline loading state
  const [savingId, setSavingId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filterClaimId, setFilterClaimId] = useState("");
  const [filterClaimant, setFilterClaimant] = useState("");
  
  // New date filters
  const [filterHireStart, setFilterHireStart] = useState("");
  const [filterHireEnd, setFilterHireEnd] = useState("");

  // Set default sorting to claim_id ascending
  const [sortKey, setSortKey] = useState<SortKey | null>("claim_id");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");

  const fetchClaims = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/api/claims", { headers: { requiresAuth: true } });
      setClaims(res.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load claims.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "clients") {
      fetchClaims();
    }
  }, [activeTab]);

  const handleSort = (key: SortKey) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("asc");
    } else if (sortDir === "asc") {
      setSortDir("desc");
    } else if (sortDir === "desc") {
      setSortKey(null);
      setSortDir(null);
    }
  };

  const startEditingPayment = (claim: Claim) => {
    setEditingId(claim.claim_id);
    setEditPayment(claim.payment?.toString() || "0");
    setEditPayDate(claim.pay_date ? claim.pay_date.split("T")[0] : "");
    setSaveError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditPayment("");
    setEditPayDate("");
    setSaveError(null);
  };

  const handleSavePayment = async (claimId: string) => {
    setSavingId(claimId);
    setSaveError(null);

    try {
      const paymentAmount = parseFloat(editPayment) || 0;
      const payDate = editPayDate ? new Date(editPayDate).toISOString() : null;

      const res = await api.put(
        `/api/claims/${claimId}/payment`,
        {
          payment: paymentAmount.toFixed(2),
          pay_date: payDate,
        },
        { headers: { requiresAuth: true } }
      );

      if (res.data.message) {
        // Update the state locally instead of fetching all claims again
        setClaims((prevClaims) =>
          prevClaims.map((claim) =>
            claim.claim_id === claimId
              ? { ...claim, payment: paymentAmount, pay_date: payDate }
              : claim
          )
        );
        cancelEdit();
      }
    } catch (err: any) {
      setSaveError(err.response?.data?.detail || "Failed to update payment.");
    } finally {
      setSavingId(null);
    }
  };

  const filteredClaims = claims.filter((claim) => {
    // Hide rows where claim_id starts with "S" (case-insensitive)
    if (claim.claim_id.toUpperCase().startsWith("S")) {
      return false;
    }

    const matchesSearch =
      !search ||
      claim.claim_id.toLowerCase().includes(search.toLowerCase()) ||
      claim.claimant_name?.toLowerCase().includes(search.toLowerCase());

    const matchesClaimId =
      !filterClaimId || claim.claim_id.toLowerCase().includes(filterClaimId.toLowerCase());
    const matchesClaimant =
      !filterClaimant ||
      claim.claimant_name?.toLowerCase().includes(filterClaimant.toLowerCase());

    // Date filters (matches "YYYY-MM-DD" prefix of the ISO string)
    const matchesHireStart = 
      !filterHireStart || (claim.hire_start_date && claim.hire_start_date.startsWith(filterHireStart));
    const matchesHireEnd = 
      !filterHireEnd || (claim.hire_end_date && claim.hire_end_date.startsWith(filterHireEnd));

    return matchesSearch && matchesClaimId && matchesClaimant && matchesHireStart && matchesHireEnd;
  });

  const sortedClaims = [...filteredClaims].sort((a, b) => {
    if (!sortKey || !sortDir) return 0;

    const aVal = a[sortKey];
    const bVal = b[sortKey];

    if (aVal === null && bVal === null) return 0;
    if (aVal === null) return 1;
    if (bVal === null) return -1;

    let result = 0;

    if (typeof aVal === "number" && typeof bVal === "number") {
      result = aVal - bVal;
    } else {
      result = String(aVal).localeCompare(String(bVal));
    }

    return sortDir === "asc" ? result : -result;
  });

  const columns: { label: string; key: SortKey }[] = [
    { label: "Claim ID", key: "claim_id" },
    { label: "Claimant", key: "claimant_name" },
    { label: "Start Date", key: "claim_start_date" },
    { label: "Hire Start", key: "hire_start_date" },
    { label: "Hire End", key: "hire_end_date" },
    { label: "Payment", key: "payment" },
    { label: "Pay Date", key: "pay_date" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50/40">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-green-800 tracking-tight">Clients</h1>
            <p className="mt-1 text-green-700/80">Manage your clients and fleet information</p>
          </div>

          {activeTab === "clients" && (
            <button
              onClick={fetchClaims}
              disabled={loading}
              className="mt-4 md:mt-0 px-4 py-2 bg-white border border-green-200 text-green-700 rounded-xl hover:bg-green-50 transition disabled:opacity-50 flex items-center gap-2 text-sm"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-green-200">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab("clients")}
              className={`pb-3 px-1 text-lg font-medium transition-colors ${
                activeTab === "clients"
                  ? "text-green-700 border-b-4 border-green-600"
                  : "text-green-600/70 hover:text-green-700"
              }`}
            >
              Clients
            </button>
          </div>
        </div>

        {/* Clients Tab */}
        {activeTab === "clients" && (
          <>
            {/* Filters */}
            <div className="mb-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Quick search..."
                className="w-full px-3 py-2 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-400 bg-white/70 text-sm"
              />
              <input
                type="text"
                value={filterClaimId}
                onChange={(e) => setFilterClaimId(e.target.value)}
                placeholder="Filter Claim ID"
                className="w-full px-3 py-2 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-400 bg-white/70 text-sm"
              />
              <input
                type="text"
                value={filterClaimant}
                onChange={(e) => setFilterClaimant(e.target.value)}
                placeholder="Filter Claimant Name"
                className="w-full px-3 py-2 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-400 bg-white/70 text-sm"
              />
              
              <div className="relative w-full">
                <label className="absolute -top-2.5 left-2 bg-white/90 px-1 text-[11px] font-medium text-green-800 rounded-sm">
                  Hire Start
                </label>
                <input
                  type="date"
                  value={filterHireStart}
                  onChange={(e) => setFilterHireStart(e.target.value)}
                  className="w-full px-3 py-2 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-400 bg-white/70 text-sm"
                />
              </div>

              <div className="relative w-full">
                <label className="absolute -top-2.5 left-2 bg-white/90 px-1 text-[11px] font-medium text-green-800 rounded-sm">
                  Hire End
                </label>
                <input
                  type="date"
                  value={filterHireEnd}
                  onChange={(e) => setFilterHireEnd(e.target.value)}
                  className="w-full px-3 py-2 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-400 bg-white/70 text-sm"
                />
              </div>

              {/* Show Total Rows */}
              <div className="text-sm font-semibold text-green-800 bg-white border border-green-200 rounded-lg px-3 py-2 flex items-center justify-center whitespace-nowrap shadow-sm w-full">
                Total Rows: {filteredClaims.length}
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-12 h-12 text-green-600 animate-spin" />
              </div>
            ) : sortedClaims.length === 0 ? (
              <div className="text-center py-12 bg-white/60 rounded-2xl border border-green-100 shadow text-sm text-green-700/80">
                {search || filterClaimId || filterClaimant || filterHireStart || filterHireEnd ? "No matching claims" : "No claims yet"}
              </div>
            ) : (
              <div className="bg-white/85 backdrop-blur-sm border border-green-100 rounded-xl shadow overflow-hidden">
                <div className="overflow-x-auto overflow-y-auto max-h-[600px]">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-green-100 sticky top-0 z-10">
                      <tr>
                        {columns.map(({ label, key }) => (
                          <th
                            key={key}
                            onClick={() => handleSort(key)}
                            className="px-4 py-2.5 text-left text-xs font-bold text-green-900 uppercase tracking-wider cursor-pointer select-none hover:bg-green-100/60 transition-colors"
                          >
                            {label}
                            <SortIcon direction={sortKey === key ? sortDir : null} />
                          </th>
                        ))}
                        <th className="px-4 py-2.5 text-right text-xs font-bold text-green-900 uppercase tracking-wider w-20">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {sortedClaims.map((claim) => (
                        <tr
                          key={claim.claim_id}
                          className="hover:bg-green-50/50 transition-colors h-11"
                        >
                          <td className="px-4 py-2 font-medium text-green-900 whitespace-nowrap text-sm">
                            {claim.claim_id}
                          </td>
                          <td className="px-4 py-2 text-gray-700 whitespace-nowrap text-sm">
                            {claim.claimant_name || "—"}
                          </td>
                          <td className="px-4 py-2 text-gray-700 whitespace-nowrap text-sm">
                            {formatDate(claim.claim_start_date)}
                          </td>
                          <td className="px-4 py-2 text-gray-700 whitespace-nowrap text-sm">
                            {formatDate(claim.hire_start_date)}
                          </td>
                          <td className="px-4 py-2 text-gray-700 whitespace-nowrap text-sm">
                            {formatDate(claim.hire_end_date)}
                          </td>

                          {/* Payment */}
                          <td className="px-4 py-2 font-semibold text-green-700 whitespace-nowrap text-sm">
                            {editingId === claim.claim_id ? (
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={editPayment}
                                  onChange={(e) => setEditPayment(e.target.value)}
                                  disabled={savingId === claim.claim_id}
                                  className="w-24 px-2 py-1 border border-green-200 rounded-md focus:ring-1 focus:ring-green-400 text-sm disabled:opacity-50"
                                />
                              </div>
                            ) : (
                              `${formatCurrency(claim?.payment ?? 0)}`
                            )}
                          </td>

                          {/* Pay Date */}
                          <td className="px-4 py-2 text-gray-700 whitespace-nowrap text-sm">
                            {editingId === claim.claim_id ? (
                              <input
                                type="date"
                                value={editPayDate}
                                onChange={(e) => setEditPayDate(e.target.value)}
                                disabled={savingId === claim.claim_id}
                                className="px-2 py-1 border border-green-200 rounded-md focus:ring-1 focus:ring-green-400 text-sm w-full disabled:opacity-50"
                              />
                            ) : (
                              formatDate(claim.pay_date)
                            )}
                          </td>

                          {/* Action */}
                          <td className="px-4 py-2 text-right">
                            {editingId === claim.claim_id ? (
                              <div className="flex gap-1 justify-end">
                                <button
                                  onClick={() => handleSavePayment(claim.claim_id)}
                                  disabled={savingId === claim.claim_id}
                                  className="p-1.5 bg-green-600 hover:bg-green-700 text-white rounded-md transition disabled:opacity-50 flex items-center justify-center min-w-[30px]"
                                >
                                  {savingId === claim.claim_id ? (
                                    <Loader2 size={15} className="animate-spin" />
                                  ) : (
                                    <Check size={15} />
                                  )}
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  disabled={savingId === claim.claim_id}
                                  className="p-1.5 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-md transition disabled:opacity-50"
                                >
                                  <X size={15} />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => startEditingPayment(claim)}
                                className="p-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md transition"
                              >
                                <Edit2 size={15} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {saveError && (
              <p className="mt-3 text-center text-red-600 text-sm">{saveError}</p>
            )}
          </>
        )}

        {/* Fleet Tab */}
        {activeTab === "fleet" && (
          <div className="bg-white/85 backdrop-blur-sm border border-green-100 rounded-2xl shadow overflow-hidden">
            <div className="px-8 py-16 text-center">
              <div className="mb-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
              </div>
              <h2 className="text-2xl font-bold text-green-800 mb-2">Fleet Management</h2>
              <p className="text-gray-600">Coming soon. We're building an amazing fleet management experience for you!</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}