"use client";

import { useState, useEffect, FormEvent } from "react";
import { Loader2, RefreshCw, Edit2, X, Check } from "lucide-react";
import api from "@/lib/axios";

interface Claim {
  claim_id: string;
  claimant_name: string | null;
  claim_start_date: string | null;
  hire_start_date: string | null;
  hire_end_date: string | null;
  payment: number | null;
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
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

export default function ClientsPage() {
  // Tab state
  const [activeTab, setActiveTab] = useState<"clients" | "fleet">("clients");

  // Claims/Clients data
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Editing state for payment
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPayment, setEditPayment] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [filterClaimId, setFilterClaimId] = useState("");
  const [filterClaimant, setFilterClaimant] = useState("");

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

  // Start / Cancel / Save Payment Edit
  const startEditingPayment = (claim: Claim) => {
    setEditingId(claim.claim_id);
    setEditPayment(claim.payment?.toString() || "0");
    setSaveError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditPayment("");
    setSaveError(null);
  };

  const handleSavePayment = async (claimId: string) => {
    setSaving(true);
    setSaveError(null);

    try {
      const paymentAmount = parseFloat(editPayment) || 0;

      const res = await api.put(
        `/api/claims/${claimId}/payment`,
        {
          payment: String(paymentAmount.toFixed(2)), // Ensure 2 decimal places
          pay_date: new Date().toISOString(),
        },
        { headers: { requiresAuth: true } }
      );

      if (res.data.message) {
        await fetchClaims();
        cancelEdit();
      }
    } catch (err: any) {
      setSaveError(err.response?.data?.detail || "Failed to update payment.");
    } finally {
      setSaving(false);
    }
  };

  // Filtering
  const filteredClaims = claims.filter((claim) => {
    const matchesSearch =
      !search ||
      claim.claim_id.toLowerCase().includes(search.toLowerCase()) ||
      claim.claimant_name?.toLowerCase().includes(search.toLowerCase());

    const matchesClaimId = !filterClaimId || claim.claim_id.toLowerCase().includes(filterClaimId.toLowerCase());
    const matchesClaimant = !filterClaimant || claim.claimant_name?.toLowerCase().includes(filterClaimant.toLowerCase());

    return matchesSearch && matchesClaimId && matchesClaimant;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50/40">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-2xl font-extrabold text-green-800 tracking-tight">
              Clients 
            </h1>
            <p className="mt-1 text-lg text-green-700/80">Manage your clients and fleet information</p>
          </div>

          <div className="flex gap-3 mt-4 md:mt-0">
            {activeTab === "clients" && (
              <button
                onClick={() => fetchClaims()}
                disabled={loading}
                className="px-5 py-2 bg-white border border-green-200 text-green-700 rounded-xl hover:bg-green-50 transition disabled:opacity-50 flex items-center gap-2 text-sm"
              >
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                Refresh
              </button>
            )}
          </div>
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
            <button
              onClick={() => setActiveTab("fleet")}
              className={`pb-3 px-1 text-lg font-medium transition-colors ${
                activeTab === "fleet"
                  ? "text-green-700 border-b-4 border-green-600"
                  : "text-green-600/70 hover:text-green-700"
              }`}
            >
              Fleet
            </button>
          </div>
        </div>

        {/* Clients Tab */}
        {activeTab === "clients" && (
          <>
            {/* Filters */}
            <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
              <input
                type="text"
                value={filterClaimant}
                onChange={(e) => setFilterClaimant(e.target.value)}
                placeholder="Filter Claimant Name"
                className="px-3 py-2 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-400 bg-white/70 text-sm"
              />
              <div className="text-xs font-medium text-green-700 bg-white border border-green-200 rounded-lg px-3 py-2 flex items-center justify-center">
                {filteredClaims.length} / {claims.length}
              </div>
            </div>

            {error && (
              <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
                {error}
              </div>
            )}

            {/* Table - Compact Version */}
            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-12 h-12 text-green-600 animate-spin" />
              </div>
            ) : filteredClaims.length === 0 ? (
              <div className="text-center py-12 bg-white/60 rounded-2xl border border-green-100 shadow text-sm text-green-700/80">
                {search || filterClaimId || filterClaimant ? "No matching claims" : "No claims yet"}
              </div>
            ) : (
              <div className="bg-white/85 backdrop-blur-sm border border-green-100 rounded-xl shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-green-50/80">
                      <tr>
                        <th className="px-5 py-3 text-left text-xs font-bold text-green-900 uppercase tracking-wider">
                          Claim ID
                        </th>
                        <th className="px-5 py-3 text-left text-xs font-bold text-green-900 uppercase tracking-wider">
                          Claimant Name
                        </th>
                        <th className="px-5 py-3 text-left text-xs font-bold text-green-900 uppercase tracking-wider">
                          Start Date
                        </th>
                        <th className="px-5 py-3 text-left text-xs font-bold text-green-900 uppercase tracking-wider">
                          Hire Start
                        </th>
                        <th className="px-5 py-3 text-left text-xs font-bold text-green-900 uppercase tracking-wider">
                          Hire End
                        </th>
                        <th className="px-5 py-3 text-left text-xs font-bold text-green-900 uppercase tracking-wider">
                          Payment
                        </th>
                        <th className="px-5 py-3 text-right text-xs font-bold text-green-900 uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 text-sm">
                      {filteredClaims.map((claim) => (
                        <tr 
                          key={claim.claim_id} 
                          className="hover:bg-green-50/40 transition-colors"
                        >
                          <td className="px-5 py-3 font-medium text-green-900 whitespace-nowrap">
                            {claim.claim_id}
                          </td>
                          <td className="px-5 py-3 text-gray-700 whitespace-nowrap">
                            {claim.claimant_name || "—"}
                          </td>
                          <td className="px-5 py-3 text-gray-700 whitespace-nowrap">
                            {formatDate(claim.claim_start_date)}
                          </td>
                          <td className="px-5 py-3 text-gray-700 whitespace-nowrap">
                            {formatDate(claim.hire_start_date)}
                          </td>
                          <td className="px-5 py-3 text-gray-700 whitespace-nowrap">
                            {formatDate(claim.hire_end_date)}
                          </td>

                          {/* Payment Column - Editable */}
                          <td className="px-5 py-3 font-semibold text-green-700 whitespace-nowrap">
                            {editingId === claim.claim_id ? (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">£</span>
                                <input
                                  type="number"
                                  value={editPayment}
                                  onChange={(e) => setEditPayment(e.target.value)}
                                  placeholder="0"
                                  className="w-28 px-3 py-1.5 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-400 text-sm"
                                />
                              </div>
                            ) : (
                              formatCurrency(claim.payment)
                            )}
                          </td>

                          {/* Action Column */}
                          <td className="px-5 py-3 text-right">
                            {editingId === claim.claim_id ? (
                              <div className="flex gap-1 justify-end">
                                <button
                                  onClick={() => handleSavePayment(claim.claim_id)}
                                  disabled={saving}
                                  className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition disabled:opacity-50"
                                >
                                  <Check size={16} />
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  disabled={saving}
                                  className="p-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg transition disabled:opacity-50"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => startEditingPayment(claim)}
                                className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition"
                              >
                                <Edit2 size={16} />
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
              <p className="mt-4 text-center text-red-600 text-sm">{saveError}</p>
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