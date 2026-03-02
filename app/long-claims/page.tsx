"use client";

import { useState, useEffect, FormEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, RefreshCw, Eye, Trash2, Pencil, Check, X } from "lucide-react";
import api from "@/lib/axios";

interface LongClaim {
  id: string;
  starting_date: string | null;
  ending_date: string | null;
  hirer_name: string | null;
  invoice_sent: boolean | null;
  date_sent: string | null;
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getInvoiceBadge(invoice_sent: boolean | null) {
  if (invoice_sent === true) {
    return (
      <span className="px-2.5 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded-full">
        Sent
      </span>
    );
  }
  if (invoice_sent === false) {
    return (
      <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 text-xs font-medium rounded-full">
        Not Sent
      </span>
    );
  }
  return <span className="text-xs text-slate-400">—</span>;
}

export default function LongClaimsPage() {
  const router = useRouter();
  const [claims, setClaims] = useState<LongClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Create form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    starting_date: "",
    ending_date: "",
    hirer_name: "",
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Inline edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<{
    starting_date: string;
    ending_date: string;
    hirer_name: string;
  }>({
    starting_date: "",
    ending_date: "",
    hirer_name: "",
  });
  const [savingId, setSavingId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fetchClaims = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/api/long-claims", {
        headers: { requiresAuth: true },
      });
      setClaims(res.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load long term claims.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, []);

  // ── Username + Password confirmation for delete ────────────────────────
  const confirmDeleteWithCredentials = async (claimId: string) => {
    const username = prompt(`Enter your username to delete claim ${claimId}:`);
    if (!username) return;

    const password = prompt("Enter password:");
    if (password !== "12345678") {
      alert("Incorrect password.");
      return;
    }

    if (!confirm(`Really mark claim ${claimId} as deleted?`)) return;

    setDeletingId(claimId);
    try {
      await api.patch(
        `/api/long-claims/${claimId}/mark-deleted`,
        { deleted_by: username },
        { headers: { requiresAuth: true } }
      );

      setClaims((prev) => prev.filter((c) => c.id !== claimId));
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to mark claim as deleted.");
    } finally {
      setDeletingId(null);
    }
  };

  // ── Create ─────────────────────────────────────────────────────────────
  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);

    try {
      const payload = {
        starting_date: createFormData.starting_date || null,
        ending_date: createFormData.ending_date || null,
        hirer_name: createFormData.hirer_name.trim() || null,
      };

      await api.post("/api/long-claim", payload, {
        headers: { requiresAuth: true },
      });

      setCreateFormData({ starting_date: "", ending_date: "", hirer_name: "" });
      setShowCreateForm(false);
      await fetchClaims();
    } catch (err: any) {
      setCreateError(err.response?.data?.message || "Failed to create long claim.");
    } finally {
      setCreating(false);
    }
  };

  // ── Inline Edit ────────────────────────────────────────────────────────
  const startEditing = (claim: LongClaim) => {
    setEditingId(claim.id);
    setEditFormData({
      starting_date: claim.starting_date || "",
      ending_date: claim.ending_date || "",
      hirer_name: claim.hirer_name || "",
    });
    setSaveError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditFormData({ starting_date: "", ending_date: "", hirer_name: "" });
    setSaveError(null);
  };

  const handleSaveEdit = async (claimId: string) => {
    setSavingId(claimId);
    setSaveError(null);

    try {
      const payload = {
        long_claim_id: claimId,
        starting_date: editFormData.starting_date || null,
        ending_date: editFormData.ending_date || null,
        hirer_name: editFormData.hirer_name.trim() || null,
      };

      await api.put("/api/long-claim", payload, {
        headers: { requiresAuth: true },
      });

      setClaims((prev) =>
        prev.map((c) =>
          c.id === claimId
            ? {
                ...c,
                starting_date: payload.starting_date,
                ending_date: payload.ending_date,
                hirer_name: payload.hirer_name,
              }
            : c
        )
      );

      setEditingId(null);
    } catch (err: any) {
      setSaveError(err.response?.data?.message || "Failed to update claim.");
    } finally {
      setSavingId(null);
    }
  };

  const filtered = claims.filter((c) =>
    c.id.toLowerCase().includes(search.toLowerCase()) ||
    (c.hirer_name?.toLowerCase().includes(search.toLowerCase()) ?? false)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50/40">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-10">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-green-800 tracking-tight">
              Long Term Hire 
            </h1>
            <p className="mt-2 text-lg text-green-700/80">
              Manage sovereign / long-term hire agreements
            </p>
          </div>
          <div className="flex gap-3 mt-4 md:mt-0">
            <button
              onClick={fetchClaims}
              disabled={loading}
              className="px-5 py-2.5 bg-white border border-green-200 text-green-700 rounded-xl hover:bg-green-50 transition disabled:opacity-50 flex items-center gap-2"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-3 px-6 rounded-full shadow-lg transform hover:scale-105 transition-all duration-300 flex items-center gap-2"
            >
              <Plus size={18} />
              New Hire
            </button>
          </div>
        </div>

        {/* Create Form */}
        {showCreateForm && (
          <div className="mb-12 bg-white/80 backdrop-blur-md shadow-xl rounded-3xl border border-green-100/60 p-8">
            <h2 className="text-2xl font-bold text-green-800 mb-6">Create New Long Term Claim</h2>
            <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Hirer Name</label>
                <input
                  type="text"
                  value={createFormData.hirer_name}
                  onChange={(e) => setCreateFormData((p) => ({ ...p, hirer_name: e.target.value }))}
                  placeholder="e.g. ABC Rent-a-Car"
                  className="w-full px-4 py-3 border border-green-200 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-green-400 bg-white/70"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Starting Date</label>
                <input
                  required
                  type="date"
                  value={createFormData.starting_date}
                  onChange={(e) => setCreateFormData((p) => ({ ...p, starting_date: e.target.value }))}
                  className="w-full px-4 py-3 border border-green-200 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-green-400 bg-white/70"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Ending Date</label>
                <input
                  type="date"
                  value={createFormData.ending_date}
                  onChange={(e) => setCreateFormData((p) => ({ ...p, ending_date: e.target.value }))}
                  className="w-full px-4 py-3 border border-green-200 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-green-400 bg-white/70"
                />
              </div>
              <div className="md:col-span-3 flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-6 py-3 border border-green-200 text-green-700 rounded-xl hover:bg-green-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-3 px-10 rounded-full shadow-lg flex items-center gap-2 disabled:opacity-60"
                >
                  {creating ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Hire"
                  )}
                </button>
              </div>
              {createError && (
                <p className="md:col-span-3 text-red-600 text-center font-medium mt-2">{createError}</p>
              )}
            </form>
          </div>
        )}

        {/* Search & Counter */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Claim ID or Hirer name..."
            className="w-full sm:w-80 px-4 py-3 border border-green-200 rounded-xl focus:ring-2 focus:ring-green-400 bg-white/70"
          />
          <div className="text-sm font-medium text-green-700 bg-white border border-green-200 rounded-lg px-4 py-2 inline-block">
            Showing <span className="font-bold text-green-800">{filtered.length}</span> of{" "}
            <span className="font-bold text-green-800">{claims.length}</span> claims
          </div>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl">
            {error}
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-16 h-16 text-green-600 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-white/60 rounded-3xl border border-green-100 shadow-lg">
            <p className="text-xl text-green-700/80">
              {search ? "No matching long term claims found" : "No long term claims yet"}
            </p>
          </div>
        ) : (
          <div className="bg-white/85 backdrop-blur-sm border border-green-100 rounded-2xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-400 border border-gray-400 text-sm rounded-md overflow-hidden">
                <thead className="bg-green-50/70">
                  <tr className="border-b border-gray-500">
                    <th className="px-3 py-2 text-left font-semibold text-green-800 border-r border-gray-400">Claim ID</th>
                    <th className="px-3 py-2 text-left font-semibold text-green-800 border-r border-gray-400">Hirer Name</th>
                    <th className="px-3 py-2 text-left font-semibold text-green-800 border-r border-gray-400">Start Date</th>
                    <th className="px-3 py-2 text-left font-semibold text-green-800 border-r border-gray-400">End Date</th>
                    <th className="px-3 py-2 text-left font-semibold text-green-800 border-r border-gray-400">Invoice</th>
                    <th className="px-3 py-2 text-left font-semibold text-green-800 border-r border-gray-400">Date Sent</th>
                    <th className="px-3 py-2 text-right font-semibold text-green-800">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-300 bg-white">
                  {filtered.map((claim) => {
                    const isEditing = editingId === claim.id;
                    const isSaving = savingId === claim.id;

                    return (
                      <tr key={claim.id} className="hover:bg-green-50/40 transition-colors">
                        <td className="px-3 py-1 font-medium text-green-800 border-r border-gray-300">
                          {claim.id}
                        </td>
                        <td className="px-3 py-1 text-gray-700 border-r border-gray-300">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editFormData.hirer_name}
                              onChange={(e) =>
                                setEditFormData((p) => ({ ...p, hirer_name: e.target.value }))
                              }
                              className="w-full px-2 py-1 border border-green-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                              placeholder="Hirer name"
                            />
                          ) : (
                            claim.hirer_name || "—"
                          )}
                        </td>
                        <td className="px-3 py-1 text-gray-700 border-r border-gray-300">
                          {isEditing ? (
                            <input
                              type="date"
                              value={editFormData.starting_date}
                              onChange={(e) =>
                                setEditFormData((p) => ({ ...p, starting_date: e.target.value }))
                              }
                              className="w-full px-2 py-1 border border-green-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                            />
                          ) : (
                            formatDate(claim.starting_date)
                          )}
                        </td>
                        <td className="px-3 py-1 text-gray-700 border-r border-gray-300">
                          {isEditing ? (
                            <input
                              type="date"
                              value={editFormData.ending_date}
                              onChange={(e) =>
                                setEditFormData((p) => ({ ...p, ending_date: e.target.value }))
                              }
                              className="w-full px-2 py-1 border border-green-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                            />
                          ) : (
                            formatDate(claim.ending_date)
                          )}
                        </td>
                        <td className="px-3 py-1 border-r border-gray-300 text-center">
                          {getInvoiceBadge(claim.invoice_sent)}
                        </td>
                        <td className="px-3 py-1 text-gray-700 whitespace-nowrap border-r border-gray-300">
                          {claim.invoice_sent === true ? formatDate(claim.date_sent) : "—"}
                        </td>
                        <td className="px-3 py-1 text-right flex items-center justify-end gap-2">
                          <button
                            onClick={() => router.push(`/long-claims/${claim.id}`)}
                            className="p-1 text-green-600 hover:text-green-800 transition rounded"
                            title="View claim"
                          >
                            <Eye size={16} />
                          </button>

                          {isEditing ? (
                            <>
                              <button
                                onClick={() => !isSaving && handleSaveEdit(claim.id)}
                                disabled={isSaving}
                                className="p-1 text-green-600 hover:text-green-800 transition rounded"
                                title="Save"
                              >
                                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                              </button>
                              <button
                                onClick={cancelEdit}
                                disabled={isSaving}
                                className="p-1 text-red-600 hover:text-red-800 transition rounded"
                                title="Cancel"
                              >
                                <X size={16} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startEditing(claim)}
                                className="p-1 text-blue-600 hover:text-blue-800 transition rounded"
                                title="Edit claim"
                              >
                                <Pencil size={16} />
                              </button>

                              <button
                                onClick={() => confirmDeleteWithCredentials(claim.id)}
                                disabled={deletingId === claim.id}
                                className="p-1 text-red-600 hover:text-red-800 transition rounded"
                                title="Mark as deleted"
                              >
                                {deletingId === claim.id ? (
                                  <Loader2 size={16} className="animate-spin" />
                                ) : (
                                  <Trash2 size={16} />
                                )}
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}