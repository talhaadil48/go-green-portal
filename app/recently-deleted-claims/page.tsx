"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { Eye, RotateCcw, Trash2, Loader2 } from "lucide-react";

interface Claim {
  claim_id: string;
  claimant_name: string | null;
  claim_type: string | null;
  claim_start_date: string | null;
  recently_deleted_date: string | null;
  deleted_by: string | null;
}

interface LongClaim {
  id: string;
  starting_date: string | null;
  ending_date: string | null;
  invoice_sent: boolean | null;
  date_sent: string | null;
  recently_deleted_date?: string | null;
  deleted_by?: string | null;          // ← NEW
}

type ActionLoading = {
  [claimId: string]: 'restore' | 'delete' | null;
};

export default function RecentlyDeletedClaimsPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [allClaims, setAllClaims] = useState<Claim[]>([]);

  const [longClaims, setLongClaims] = useState<LongClaim[]>([]);
  const [allLongClaims, setAllLongClaims] = useState<LongClaim[]>([]);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<ActionLoading>({});
  const [error, setError] = useState<string | null>(null);

  // Filters for Regular Claims
  const [regSearch, setRegSearch] = useState("");
  const [regType, setRegType] = useState("");
  const [regStartDate, setRegStartDate] = useState("");
  const [regEndDate, setRegEndDate] = useState("");

  // Filters for Long Claims
  const [longSearch, setLongSearch] = useState("");
  const [longStartDate, setLongStartDate] = useState("");
  const [longEndDate, setLongEndDate] = useState("");

  const router = useRouter();

  const fetchRegularClaims = async () => {
    try {
      const res = await api.get("/api/recently", {
        headers: { requiresAuth: true },
      });
      const data = res.data.claims || [];
      setAllClaims(data);
      setClaims(data);
    } catch (err) {
      console.error("Regular claims fetch failed", err);
      setError("Failed to load regular claims");
    }
  };

  const fetchLongClaims = async () => {
    try {
      const res = await api.get("/api/long/soft-deleted", {
        headers: { requiresAuth: true },
      });
      const data = res.data.data || res.data.claims || [];
      setAllLongClaims(data);
      setLongClaims(data);
    } catch (err) {
      console.error("Sovereign long term fetch failed", err);
      setError("Failed to load sovereign/sovereign long term");
    }
  };

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    await Promise.all([fetchRegularClaims(), fetchLongClaims()]);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // ── Filter Regular Claims ───────────────────────────────────────────────
  useEffect(() => {
    let filtered = [...allClaims];

    if (regSearch.trim()) {
      const term = regSearch.toLowerCase().trim();
      filtered = filtered.filter(
        (c) =>
          (c.claimant_name?.toLowerCase().includes(term) || false) ||
          c.claim_id.toLowerCase().includes(term)
      );
    }

    if (regType) {
      filtered = filtered.filter((c) => c.claim_type === regType);
    }

    if (regStartDate || regEndDate) {
      const start = regStartDate ? new Date(regStartDate) : null;
      const end = regEndDate ? new Date(regEndDate) : null;
      filtered = filtered.filter((c) => {
        if (!c.claim_start_date) return false;
        const d = new Date(c.claim_start_date);
        return !(start && d < start) && !(end && d > end);
      });
    }

    setClaims(filtered);
  }, [regSearch, regType, regStartDate, regEndDate, allClaims]);

  // ── Filter Long Claims ──────────────────────────────────────────────────
  useEffect(() => {
    let filtered = [...allLongClaims];

    if (longSearch.trim()) {
      const term = longSearch.toLowerCase().trim();
      filtered = filtered.filter(
        (c) =>
          c.id.toLowerCase().includes(term) ||
          (c.starting_date?.toLowerCase().includes(term) ?? false) ||
          (c.ending_date?.toLowerCase().includes(term) ?? false)
      );
    }

    if (longStartDate || longEndDate) {
      const start = longStartDate ? new Date(longStartDate) : null;
      const end = longEndDate ? new Date(longEndDate) : null;
      filtered = filtered.filter((c) => {
        if (!c.starting_date) return false;
        const d = new Date(c.starting_date);
        return !(start && d < start) && !(end && d > end);
      });
    }

    setLongClaims(filtered);
  }, [longSearch, longStartDate, longEndDate, allLongClaims]);

  const startAction = (claimId: string, action: 'restore' | 'delete') => {
    setActionLoading((prev) => ({ ...prev, [claimId]: action }));
  };

  const finishAction = (claimId: string) => {
    setActionLoading((prev) => {
      const next = { ...prev };
      delete next[claimId];
      return next;
    });
  };

  const handleRestore = async (claim_id: string, isLong = false) => {
    if (actionLoading[claim_id]) return;
    if (!confirm(`Restore claim ${claim_id}?`)) return;

    startAction(claim_id, 'restore');

    try {
      const url = isLong
        ? `/api/long-claims/${claim_id}/restore`
        : `/api/claims/${claim_id}/restore`;

      await api.put(url, null, { headers: { requiresAuth: true } });
      await fetchAll();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to restore claim.");
    } finally {
      finishAction(claim_id);
    }
  };

  const handlePermanentDelete = async (claim_id: string, isLong = false) => {
    if (actionLoading[claim_id]) return;
    if (!confirm(`Permanently delete claim ${claim_id}? This cannot be undone.`)) return;

    startAction(claim_id, 'delete');

    try {
      const url = isLong
        ? `/api/long-claims/${claim_id}/delete`
        : `/api/claims/${claim_id}`;

      await api.delete(url, { headers: { requiresAuth: true } });
      await fetchAll();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to permanently delete claim.");
    } finally {
      finishAction(claim_id);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const clearRegFilters = () => {
    setRegSearch("");
    setRegType("");
    setRegStartDate("");
    setRegEndDate("");
  };

  const clearLongFilters = () => {
    setLongSearch("");
    setLongStartDate("");
    setLongEndDate("");
  };

  const isActionLoading = (claimId: string) => !!actionLoading[claimId];
  const getActionType = (claimId: string) => actionLoading[claimId];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50/40">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-10">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-green-800 tracking-tight">
              Recently Deleted Claims
            </h1>
            <p className="mt-2 text-lg text-green-700/80">
              Regular and Sovereign Long term • Auto-removed after 3 days
            </p>
          </div>

          <button
            onClick={fetchAll}
            disabled={loading}
            className="mt-4 md:mt-0 px-5 py-2.5 bg-white border border-green-200 text-green-700 rounded-xl hover:bg-green-50 transition disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                Refreshing...
              </>
            ) : (
              "Refresh All"
            )}
          </button>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl">
            {error}
          </div>
        )}

        {/* ── Regular Claims Section ──────────────────────────────────────── */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-green-800 mb-6">Regular Claims</h2>

          {/* Regular Filters */}
          <div className="mb-6 bg-white/70 backdrop-blur-sm border border-green-100 rounded-xl shadow-lg p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Search by Name / ID</label>
                <input
                  type="text"
                  value={regSearch}
                  onChange={(e) => setRegSearch(e.target.value)}
                  placeholder="Claimant or Claim ID..."
                  className="w-full px-3 py-2 text-sm border border-green-200 rounded-lg focus:ring-2 focus:ring-green-400 bg-white/80"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Claim Type</label>
                <select
                  value={regType}
                  onChange={(e) => setRegType(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-green-200 rounded-lg focus:ring-2 focus:ring-green-400 bg-white/80"
                >
                  <option value="">All Types</option>
                  <option value="taxi">Taxi</option>
                  <option value="personal">Personal</option>
                  <option value="sovereign">Sovereign</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={regStartDate}
                  onChange={(e) => setRegStartDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-green-200 rounded-lg focus:ring-2 focus:ring-green-400 bg-white/80"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-end gap-2">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={regEndDate}
                    onChange={(e) => setRegEndDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-green-200 rounded-lg focus:ring-2 focus:ring-green-400 bg-white/80"
                  />
                </div>
                <button
                  onClick={clearRegFilters}
                  className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition border border-gray-300 w-full sm:w-auto"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-16 h-16 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
            </div>
          ) : claims.length === 0 ? (
            <div className="text-center py-16 bg-white/60 rounded-3xl border border-green-100 shadow-lg">
              <p className="text-xl text-green-700/80">
                {regSearch || regType || regStartDate || regEndDate
                  ? "No matching regular claims found"
                  : "No recently deleted regular claims"}
              </p>
            </div>
          ) : (
            <div className="bg-white/85 backdrop-blur-sm border border-green-100 rounded-2xl shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-400 border border-gray-400 text-sm rounded-md overflow-hidden">
                  <thead className="bg-green-50/70">
                    <tr className="border-b border-gray-500">
                      <th className="px-3 py-2 text-left font-semibold text-green-800 border-r border-gray-400">Claim ID</th>
                      <th className="px-3 py-2 text-left font-semibold text-green-800 border-r border-gray-400">Claimant</th>
                      <th className="px-3 py-2 text-left font-semibold text-green-800 border-r border-gray-400">Type</th>
                      <th className="px-3 py-2 text-left font-semibold text-green-800 border-r border-gray-400">Start Date</th>
                      <th className="px-3 py-2 text-left font-semibold text-green-800 border-r border-gray-400">Deleted</th>
                      <th className="px-3 py-2 text-left font-semibold text-green-800 border-r border-gray-400">Deleted By</th>
                      <th className="px-3 py-2 text-right font-semibold text-green-800">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-300 bg-white">
                    {claims.map((claim) => {
                      const isLoading = isActionLoading(claim.claim_id);
                      const actionType = getActionType(claim.claim_id);

                      return (
                        <tr key={claim.claim_id} className="hover:bg-green-50/40 transition-colors">
                          <td className="px-3 py-1 font-medium text-green-800 border-r border-gray-300">
                            {claim.claim_id.toUpperCase()}
                          </td>
                          <td className="px-3 py-1 text-gray-700 border-r border-gray-300">
                            {(claim.claimant_name || "—").toUpperCase()}
                          </td>
                          <td className="px-3 py-1 text-gray-700 border-r border-gray-300">
                            {claim.claim_type
                              ? claim.claim_type.charAt(0).toUpperCase() + claim.claim_type.slice(1)
                              : "—"}
                          </td>
                          <td className="px-3 py-1 text-gray-700 whitespace-nowrap border-r border-gray-300">
                            {formatDate(claim.claim_start_date)}
                          </td>
                          <td className="px-3 py-1 text-gray-700 whitespace-nowrap border-r border-gray-300">
                            {formatDate(claim.recently_deleted_date)}
                          </td>
                          <td className="px-3 py-1 text-gray-700 border-r border-gray-300">
                            {claim.deleted_by || "—"}
                          </td>
                          <td className="px-3 py-1 text-right flex items-center justify-end gap-2">
                            <button
                              onClick={() => router.push(`/claim/${claim.claim_id}`)}
                              className="p-1 text-green-600 hover:text-green-800 transition rounded"
                              title="View claim"
                            >
                              <Eye size={16} />
                            </button>

                            <button
                              onClick={() => handleRestore(claim.claim_id, false)}
                              disabled={isLoading}
                              className="p-1 text-emerald-600 hover:text-emerald-800 transition rounded"
                              title="Restore claim"
                            >
                              {actionType === 'restore' ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : (
                                <RotateCcw size={16} />
                              )}
                            </button>

                            <button
                              onClick={() => handlePermanentDelete(claim.claim_id, false)}
                              disabled={isLoading}
                              className="p-1 text-red-600 hover:text-red-800 transition rounded"
                              title="Delete permanently"
                            >
                              {actionType === 'delete' ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : (
                                <Trash2 size={16} />
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* ── Sovereign / Long-Term Claims Section ─────────────────────────── */}
        <section>
          <h2 className="text-3xl font-bold text-green-800 mb-6">Long-Term Hire</h2>

          {/* Long Claims Filters */}
          <div className="mb-6 bg-white/70 backdrop-blur-sm border border-green-100 rounded-xl shadow-lg p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Search by ID / Date</label>
                <input
                  type="text"
                  value={longSearch}
                  onChange={(e) => setLongSearch(e.target.value)}
                  placeholder="Claim ID or date..."
                  className="w-full px-3 py-2 text-sm border border-green-200 rounded-lg focus:ring-2 focus:ring-green-400 bg-white/80"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={longStartDate}
                  onChange={(e) => setLongStartDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-green-200 rounded-lg focus:ring-2 focus:ring-green-400 bg-white/80"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-end gap-2">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={longEndDate}
                    onChange={(e) => setLongEndDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-green-200 rounded-lg focus:ring-2 focus:ring-green-400 bg-white/80"
                  />
                </div>
                <button
                  onClick={clearLongFilters}
                  className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition border border-gray-300 w-full sm:w-auto"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-16 h-16 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
            </div>
          ) : longClaims.length === 0 ? (
            <div className="text-center py-16 bg-white/60 rounded-3xl border border-green-100 shadow-lg">
              <p className="text-xl text-green-700/80">
                {longSearch || longStartDate || longEndDate
                  ? "No matching  Long term found"
                  : "No recently deleted Long term"}
              </p>
            </div>
          ) : (
            <div className="bg-white/85 backdrop-blur-sm border border-green-100 rounded-2xl shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-400 border border-gray-400 text-sm rounded-md overflow-hidden">
                  <thead className="bg-green-50/70">
                    <tr className="border-b border-gray-500">
                      <th className="px-3 py-2 text-left font-semibold text-green-800 border-r border-gray-400">Claim ID</th>
                      <th className="px-3 py-2 text-left font-semibold text-green-800 border-r border-gray-400">Start Date</th>
                      <th className="px-3 py-2 text-left font-semibold text-green-800 border-r border-gray-400">End Date</th>
                      <th className="px-3 py-2 text-left font-semibold text-green-800 border-r border-gray-400">Invoice Sent</th>
                      <th className="px-3 py-2 text-left font-semibold text-green-800 border-r border-gray-400">Date Sent</th>
                      <th className="px-3 py-2 text-left font-semibold text-green-800 border-r border-gray-400">Deleted By</th>
                      <th className="px-3 py-2 text-right font-semibold text-green-800">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-300 bg-white">
                    {longClaims.map((claim) => {
                      const isLoading = isActionLoading(claim.id);
                      const actionType = getActionType(claim.id);

                      return (
                        <tr key={claim.id} className="hover:bg-green-50/40 transition-colors">
                          <td className="px-3 py-1 font-medium text-green-800 border-r border-gray-300">
                            {claim.id}
                          </td>
                          <td className="px-3 py-1 text-gray-700 whitespace-nowrap border-r border-gray-300">
                            {formatDate(claim.starting_date)}
                          </td>
                          <td className="px-3 py-1 text-gray-700 whitespace-nowrap border-r border-gray-300">
                            {formatDate(claim.ending_date)}
                          </td>
                          <td className="px-3 py-1 text-gray-700 border-r border-gray-300 text-center">
                            {claim.invoice_sent === true ? (
                              <span className="px-2.5 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                                Yes
                              </span>
                            ) : claim.invoice_sent === false ? (
                              <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 text-xs font-medium rounded-full">
                                No
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-3 py-1 text-gray-700 whitespace-nowrap border-r border-gray-300">
                            {formatDate(claim.date_sent)}
                          </td>
                          <td className="px-3 py-1 text-gray-700 border-r border-gray-300">
                            {claim.deleted_by || "—"}
                          </td>
                          <td className="px-3 py-1 text-right flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleRestore(claim.id, true)}
                              disabled={isLoading}
                              className="p-1 text-emerald-600 hover:text-emerald-800 transition rounded"
                              title="Restore claim"
                            >
                              {actionType === 'restore' ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : (
                                <RotateCcw size={16} />
                              )}
                            </button>

                            <button
                              onClick={() => handlePermanentDelete(claim.id, true)}
                              disabled={isLoading}
                              className="p-1 text-red-600 hover:text-red-800 transition rounded"
                              title="Delete permanently"
                            >
                              {actionType === 'delete' ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : (
                                <Trash2 size={16} />
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}