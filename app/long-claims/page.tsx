"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, RefreshCw, FileText, Trash2, Pencil, Check, X } from "lucide-react";
import api from "@/lib/axios";

interface LongClaim {
  id: string;
  starting_date: string | null;
  ending_date: string | null;
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
      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-medium rounded-full">
        Sent
      </span>
    );
  }
  if (invoice_sent === false) {
    return (
      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-medium rounded-full">
        Not Sent
      </span>
    );
  }
  return <span className="text-[10px] text-slate-400">—</span>;
}

export default function LongClaimsPage() {
  const router = useRouter();
  const [claims, setClaims] = useState<LongClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Create form states
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createFormData, setCreateFormData] = useState({ starting_date: "", ending_date: "" });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Inline edit states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<{ starting_date: string; ending_date: string }>({
    starting_date: "",
    ending_date: "",
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
      setError(err.response?.data?.message || "Failed to load sovereign long term claims.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, []);

  // ── Create ────────────────────────────────────────────────
  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);

    try {
      const payload = {
        starting_date: createFormData.starting_date || null,
        ending_date: createFormData.ending_date || null,
      };

      await api.post("/api/long-claim", payload, {
        headers: { requiresAuth: true },
      });

      setCreateFormData({ starting_date: "", ending_date: "" });
      setShowCreateForm(false);
      await fetchClaims();
    } catch (err: any) {
      setCreateError(err.response?.data?.message || "Failed to create long claim.");
    } finally {
      setCreating(false);
    }
  };

  // ── Inline Edit ───────────────────────────────────────────
  const startEditing = (claim: LongClaim) => {
    setEditingId(claim.id);
    setEditFormData({
      starting_date: claim.starting_date || "",
      ending_date: claim.ending_date || "",
    });
    setSaveError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditFormData({ starting_date: "", ending_date: "" });
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
      };

      await api.put("/api/long-claim", payload, {
        headers: { requiresAuth: true },
      });

      // Optimistic update
      setClaims((prev) =>
        prev.map((c) =>
          c.id === claimId
            ? {
                ...c,
                starting_date: payload.starting_date,
                ending_date: payload.ending_date,
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

  // ── Delete ────────────────────────────────────────────────
  const handleDelete = async (claimId: string) => {
    if (!confirm(`Are you sure you want to mark claim ${claimId} as deleted?`)) return;

    setDeletingId(claimId);
    try {
      const res = await api.patch(`/api/long-claims/${claimId}/mark-deleted`, {}, {
        headers: { requiresAuth: true },
      });

      if (res.data.success) {
        setClaims((prev) => prev.filter((c) => c.id !== claimId));
      } else {
        alert(res.data.message || "Failed to mark as deleted");
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Error deleting claim");
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = claims.filter((c) =>
    c.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50/20">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">
              Sovereign Long term
            </h1>
            <p className="mt-1 text-slate-500 text-sm">
              {claims.length} claim{claims.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={fetchClaims}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition text-sm font-medium disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
            <button
              onClick={() => setShowCreateForm((v) => !v)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition text-sm font-semibold shadow-sm"
            >
              <Plus size={15} />
              New Claim
            </button>
          </div>
        </div>

        {/* Create Form (still above table) */}
        {showCreateForm && (
          <div className="mb-6 bg-white border border-emerald-100 rounded-xl shadow p-5">
            <h2 className="text-base font-bold text-slate-800 mb-4">Create New Long Claim</h2>
            <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">
                  Starting Date
                </label>
                <input
                  required
                  type="date"
                  value={createFormData.starting_date}
                  onChange={(e) => setCreateFormData((p) => ({ ...p, starting_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-slate-50"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">
                  Ending Date
                </label>
                <input
                  type="date"
                  value={createFormData.ending_date}
                  onChange={(e) => setCreateFormData((p) => ({ ...p, ending_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-slate-50"
                />
              </div>
              <div className="sm:col-span-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex items-center gap-2 px-5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition disabled:opacity-60"
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
                <p className="sm:col-span-2 text-red-600 text-sm text-center">{createError}</p>
              )}
            </form>
          </div>
        )}

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by claim ID..."
            className="w-full sm:w-64 px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
          />
        </div>

        {error && (
          <div className="mb-4 p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-emerald-500" size={32} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
            <FileText size={36} strokeWidth={1.3} />
            <p className="text-base font-medium">
              {search ? "No matching claims" : "No sovereign long term yet"}
            </p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-2.5 font-semibold w-28">Claim ID</th>
                  <th className="px-4 py-2.5 font-semibold w-32">Start</th>
                  <th className="px-4 py-2.5 font-semibold w-32">End</th>
                  <th className="px-4 py-2.5 font-semibold w-24">Invoice</th>
                  <th className="px-4 py-2.5 font-semibold w-36">Date Sent</th>
                  <th className="w-24 text-right pr-5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((claim) => {
                  const isEditing = editingId === claim.id;
                  const isSaving = savingId === claim.id;

                  return (
                    <tr
                      key={claim.id}
                      className="hover:bg-emerald-50/70 transition-colors h-10"
                    >
                      <td
                        className="px-5 py-2 font-medium text-slate-800 cursor-pointer"
                        onClick={() => !isEditing && router.push(`/long-claims/${claim.id}`)}
                      >
                        {claim.id}
                      </td>

                      {/* Starting Date - editable inline */}
                      <td className="px-4 py-2 text-slate-700">
                        {isEditing ? (
                          <input
                            type="date"
                            value={editFormData.starting_date}
                            onChange={(e) =>
                              setEditFormData((p) => ({ ...p, starting_date: e.target.value }))
                            }
                            className="w-full px-2 py-1 border border-slate-300 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                          />
                        ) : (
                          formatDate(claim.starting_date)
                        )}
                      </td>

                      {/* Ending Date - editable inline */}
                      <td className="px-4 py-2 text-slate-700">
                        {isEditing ? (
                          <input
                            type="date"
                            value={editFormData.ending_date}
                            onChange={(e) =>
                              setEditFormData((p) => ({ ...p, ending_date: e.target.value }))
                            }
                            className="w-full px-2 py-1 border border-slate-300 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                          />
                        ) : (
                          formatDate(claim.ending_date)
                        )}
                      </td>

                      <td
                        className="px-4 py-2 cursor-pointer"
                        onClick={() => !isEditing && router.push(`/long-claims/${claim.id}`)}
                      >
                        {getInvoiceBadge(claim.invoice_sent)}
                      </td>

                      <td
                        className="px-4 py-2 text-slate-700 cursor-pointer"
                        onClick={() => !isEditing && router.push(`/long-claims/${claim.id}`)}
                      >
                        {claim.invoice_sent === true ? formatDate(claim.date_sent) : "—"}
                      </td>

                      <td className="px-4 py-2 text-right flex items-center justify-end gap-2">
                        {isEditing ? (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!isSaving) handleSaveEdit(claim.id);
                              }}
                              disabled={isSaving}
                              className="text-green-600 hover:text-green-800 p-1 rounded hover:bg-green-50 transition disabled:opacity-50"
                              title="Save"
                            >
                              {isSaving ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : (
                                <Check size={16} />
                              )}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                cancelEdit();
                              }}
                              disabled={isSaving}
                              className="text-slate-500 hover:text-slate-700 p-1 rounded hover:bg-slate-100 transition disabled:opacity-50"
                              title="Cancel"
                            >
                              <X size={16} />
                            </button>

                            {saveError && isEditing && (
                              <div className="absolute z-10 mt-1 text-red-600 text-[10px] bg-red-50 border border-red-200 rounded px-2 py-1">
                                {saveError}
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditing(claim);
                              }}
                              className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition"
                              title="Edit dates"
                            >
                              <Pencil size={16} />
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(claim.id);
                              }}
                              disabled={deletingId === claim.id}
                              className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition"
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
        )}
      </main>
    </div>
  );
}