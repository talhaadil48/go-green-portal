"use client";

import { useState, useEffect, FormEvent, ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";

interface Claim {
  claim_id: string;
  claimant_name: string | null;
  claim_type: string | null;
  claim_start_date: string | null;
  recently_deleted_date: string | null;
}

interface LongClaim {
  id: string;
  starting_date: string | null;
  ending_date: string | null;
  invoice_sent: boolean | null;
  date_sent: string | null;
  recently_deleted_date?: string | null;
}

// Helper type to track loading per claim + action
type ActionLoading = {
  [claimId: string]: 'restore' | 'delete' | null;
};

export default function RecentlyDeletedClaimsPage() {
  // ── Regular Claims ───────────────────────────────────────
  const [claims, setClaims] = useState<Claim[]>([]);
  const [allClaims, setAllClaims] = useState<Claim[]>([]);

  // ── Sovereign / Long Claims ──────────────────────────────
  const [longClaims, setLongClaims] = useState<LongClaim[]>([]);
  const [allLongClaims, setAllLongClaims] = useState<LongClaim[]>([]);

  const [loading, setLoading] = useState(true);                    // initial data load
  const [actionLoading, setActionLoading] = useState<ActionLoading>({}); // per-claim action loading
  const [error, setError] = useState<string | null>(null);

  // Shared filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

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
      console.error("Long claims fetch failed", err);
      setError("Failed to load sovereign/long claims");
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

  // Filter regular claims
  useEffect(() => {
    let filtered = [...allClaims];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter((c) =>
        c.claimant_name?.toLowerCase().includes(term)
      );
    }

    if (selectedType) {
      filtered = filtered.filter((c) => c.claim_type === selectedType);
    }

    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;
      filtered = filtered.filter((c) => {
        if (!c.claim_start_date) return false;
        const d = new Date(c.claim_start_date);
        return !(start && d < start) && !(end && d > end);
      });
    }

    setClaims(filtered);
  }, [searchTerm, selectedType, startDate, endDate, allClaims]);

  // Filter long claims
  useEffect(() => {
    let filtered = [...allLongClaims];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter((c) =>
        c.id.toLowerCase().includes(term) ||
        (c.starting_date?.toLowerCase().includes(term) ?? false) ||
        (c.ending_date?.toLowerCase().includes(term) ?? false)
      );
    }

    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;
      filtered = filtered.filter((c) => {
        if (!c.starting_date) return false;
        const d = new Date(c.starting_date);
        return !(start && d < start) && !(end && d > end);
      });
    }

    setLongClaims(filtered);
  }, [searchTerm, startDate, endDate, allLongClaims]);

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
    if (!confirm("Permanently delete this claim? This action cannot be undone.")) return;

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

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedType("");
    setStartDate("");
    setEndDate("");
  };

  const hasFilters = searchTerm || selectedType || startDate || endDate;

  const isActionLoading = (claimId: string) => !!actionLoading[claimId];
  const getActionType = (claimId: string) => actionLoading[claimId];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50/40 relative">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-10">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-green-800 tracking-tight">
              Recently Deleted Claims
            </h1>
            <p className="mt-2 text-lg text-green-700/80">
              Regular and Sovereign claims • Auto-removed after 3 days
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

        {/* Filters */}
        <div className="mb-10 bg-white/70 backdrop-blur-sm border border-green-100 rounded-2xl shadow-lg p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search by Name / ID
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Claimant or Claim ID..."
                className="w-full px-4 py-3 border border-green-200 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-green-400 transition bg-white/80"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Claim Type
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-4 py-3 border border-green-200 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-green-400 transition bg-white/80"
              >
                <option value="">All Types</option>
                <option value="taxi">Taxi</option>
                <option value="personal">Personal</option>
                <option value="sovereign">Sovereign</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-3 border border-green-200 rounded-xl focus:ring-2 focus:ring-green-400 transition bg-white/80"
              />
            </div>

            <div className="flex items-end gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-3 border border-green-200 rounded-xl focus:ring-2 focus:ring-green-400 transition bg-white/80"
                />
              </div>
              <button
                onClick={clearFilters}
                className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition border border-gray-300"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Regular Claims */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-green-800 mb-6">Regular Claims</h2>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-16 h-16 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
            </div>
          ) : claims.length === 0 ? (
            <div className="text-center py-12 bg-white/60 rounded-3xl border border-green-100">
              <p className="text-xl text-green-700/80">
                {hasFilters
                  ? "No matching regular claims found"
                  : "No recently deleted regular claims"}
              </p>
            </div>
          ) : (
            <div className="bg-white/85 backdrop-blur-sm border border-green-100 rounded-2xl shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-green-100">
                  <thead className="bg-green-50/70">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-green-800">Claim ID</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-green-800">Claimant</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-green-800">Type</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-green-800">Start Date</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-green-800">Deleted</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-green-800">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-green-50">
                    {claims.map((claim) => {
                      const isLoading = isActionLoading(claim.claim_id);
                      const actionType = getActionType(claim.claim_id);

                      return (
                        <tr key={claim.claim_id} className="hover:bg-green-50/40 transition-colors">
                          <td className="px-6 py-4 font-medium text-green-800">{claim.claim_id}</td>
                          <td className="px-6 py-4 text-gray-700">{claim.claimant_name || "—"}</td>
                          <td className="px-6 py-4 text-gray-700">
                            {claim.claim_type
                              ? claim.claim_type.charAt(0).toUpperCase() + claim.claim_type.slice(1)
                              : "—"}
                          </td>
                          <td className="px-6 py-4 text-gray-700">{formatDate(claim.claim_start_date)}</td>
                          <td className="px-6 py-4 text-gray-700">{formatDate(claim.recently_deleted_date)}</td>
                          <td className="px-6 py-4 text-right flex items-center justify-end gap-3">
                            <Link
                              href={`/claim/${claim.claim_id}`}
                              className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
                            >
                              View
                            </Link>

                            <button
                              onClick={() => handleRestore(claim.claim_id, false)}
                              disabled={isLoading}
                              className={`px-4 py-2 text-white text-sm rounded-lg flex items-center gap-2 min-w-[110px] justify-center
                                ${actionType === 'restore' ? 'bg-emerald-700 cursor-wait' : 'bg-emerald-600 hover:bg-emerald-700'}
                                disabled:opacity-60`}
                            >
                              {actionType === 'restore' ? (
                                <>
                                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  Restoring...
                                </>
                              ) : (
                                "Restore"
                              )}
                            </button>

                            <button
                              onClick={() => handlePermanentDelete(claim.claim_id, false)}
                              disabled={isLoading}
                              className={`px-4 py-2 text-white text-sm rounded-lg flex items-center gap-2 min-w-[140px] justify-center
                                ${actionType === 'delete' ? 'bg-red-700 cursor-wait' : 'bg-red-600 hover:bg-red-700'}
                                disabled:opacity-60`}
                            >
                              {actionType === 'delete' ? (
                                <>
                                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  Deleting...
                                </>
                              ) : (
                                "Delete Permanently"
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

        {/* Sovereign / Long Claims */}
        <section>
          <h2 className="text-3xl font-bold text-green-800 mb-6">Sovereign / Long-Term Claims</h2>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-16 h-16 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
            </div>
          ) : longClaims.length === 0 ? (
            <div className="text-center py-12 bg-white/60 rounded-3xl border border-green-100">
              <p className="text-xl text-green-700/80">
                {hasFilters
                  ? "No matching sovereign claims found"
                  : "No recently deleted sovereign claims"}
              </p>
            </div>
          ) : (
            <div className="bg-white/85 backdrop-blur-sm border border-green-100 rounded-2xl shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-green-100">
                  <thead className="bg-green-50/70">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-green-800">Claim ID</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-green-800">Start Date</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-green-800">End Date</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-green-800">Invoice Sent</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-green-800">Date Sent</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-green-800">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-green-50">
                    {longClaims.map((claim) => {
                      const isLoading = isActionLoading(claim.id);
                      const actionType = getActionType(claim.id);

                      return (
                        <tr key={claim.id} className="hover:bg-green-50/40 transition-colors">
                          <td className="px-6 py-4 font-medium text-green-800">{claim.id}</td>
                          <td className="px-6 py-4 text-gray-700">{formatDate(claim.starting_date)}</td>
                          <td className="px-6 py-4 text-gray-700">{formatDate(claim.ending_date)}</td>
                          <td className="px-6 py-4 text-gray-700">
                            {claim.invoice_sent === true ? "Yes" : claim.invoice_sent === false ? "No" : "—"}
                          </td>
                          <td className="px-6 py-4 text-gray-700">{formatDate(claim.date_sent)}</td>
                          <td className="px-6 py-4 text-right flex items-center justify-end gap-3">
                            <button
                              onClick={() => handleRestore(claim.id, true)}
                              disabled={isLoading}
                              className={`px-4 py-2 text-white text-sm rounded-lg flex items-center gap-2 min-w-[110px] justify-center
                                ${actionType === 'restore' ? 'bg-emerald-700 cursor-wait' : 'bg-emerald-600 hover:bg-emerald-700'}
                                disabled:opacity-60`}
                            >
                              {actionType === 'restore' ? (
                                <>
                                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  Restoring...
                                </>
                              ) : (
                                "Restore"
                              )}
                            </button>

                            <button
                              onClick={() => handlePermanentDelete(claim.id, true)}
                              disabled={isLoading}
                              className={`px-4 py-2 text-white text-sm rounded-lg flex items-center gap-2 min-w-[140px] justify-center
                                ${actionType === 'delete' ? 'bg-red-700 cursor-wait' : 'bg-red-600 hover:bg-red-700'}
                                disabled:opacity-60`}
                            >
                              {actionType === 'delete' ? (
                                <>
                                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  Deleting...
                                </>
                              ) : (
                                "Delete Permanently"
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