"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, RefreshCw, ChevronRight, FileText, Trash2 } from "lucide-react";
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
        Pending
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

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ starting_date: "", ending_date: "" });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const fetchClaims = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/api/long-claims", {
        headers: { requiresAuth: true },
      });
      setClaims(res.data.data || []);
    } catch {
      setError("Failed to load sovereign long term.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);

    try {
      const payload = {
        starting_date: formData.starting_date,
        ending_date: formData.ending_date,
      };

      await api.post("/api/long-claim", payload, {
        headers: { requiresAuth: true },
      });

      setFormData({ starting_date: "", ending_date: "" });
      setShowForm(false);
      await fetchClaims();
    } catch (err: any) {
      setCreateError(err.response?.data?.message || "Failed to create long claim.");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (claimId: string) => {
    if (!confirm(`Are you sure you want to mark claim ${claimId} as deleted?`)) {
      return;
    }

    setDeletingId(claimId);
    try {
      const res = await api.patch(`/api/long-claims/${claimId}/mark-deleted`, {}, {
        headers: { requiresAuth: true },
      });

      if (res.data.success) {
        // Optimistic update + refetch
        setClaims((prev) => prev.filter((c) => c.id !== claimId));
        // You can also just refetch:
        // await fetchClaims();
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
        {/* Header - unchanged */}
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
              onClick={() => setShowForm((v) => !v)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition text-sm font-semibold shadow-sm"
            >
              <Plus size={15} />
              New Claim
            </button>
          </div>
        </div>

        {/* Create form - unchanged */}
        {showForm && (
          <div className="mb-6 bg-white border border-emerald-100 rounded-xl shadow p-5">
            <h2 className="text-base font-bold text-slate-800 mb-4">Create New Long Claim</h2>
            <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* ... existing form fields ... */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">
                  Starting Date
                </label>
                <input
                  required
                  type="date"
                  value={formData.starting_date}
                  onChange={(e) => setFormData((p) => ({ ...p, starting_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-slate-50"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">
                  Ending Date
                </label>
                <input
                  required
                  type="date"
                  value={formData.ending_date}
                  onChange={(e) => setFormData((p) => ({ ...p, ending_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-slate-50"
                />
              </div>
              <div className="sm:col-span-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
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
                  <th className="w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((claim) => (
                  <tr
                    key={claim.id}
                    className="hover:bg-emerald-50/70 transition-colors h-10"
                  >
                    <td 
                      className="px-5 py-2 font-medium text-slate-800 cursor-pointer"
                      onClick={() => router.push(`/long-claims/${claim.id}`)}
                    >
                      {claim.id}
                    </td>
                    <td 
                      className="px-4 py-2 text-slate-700 cursor-pointer"
                      onClick={() => router.push(`/long-claims/${claim.id}`)}
                    >
                      {formatDate(claim.starting_date)}
                    </td>
                    <td 
                      className="px-4 py-2 text-slate-700 cursor-pointer"
                      onClick={() => router.push(`/long-claims/${claim.id}`)}
                    >
                      {formatDate(claim.ending_date)}
                    </td>
                    <td 
                      className="px-4 py-2 cursor-pointer"
                      onClick={() => router.push(`/long-claims/${claim.id}`)}
                    >
                      {getInvoiceBadge(claim.invoice_sent)}
                    </td>
                    <td 
                      className="px-4 py-2 text-slate-700 cursor-pointer"
                      onClick={() => router.push(`/long-claims/${claim.id}`)}
                    >
                      {claim.invoice_sent === true
                        ? formatDate(claim.date_sent)
                        : "—"}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent row click → detail page
                          handleDelete(claim.id);
                        }}
                        disabled={deletingId === claim.id}
                        className="text-red-500 hover:text-red-700 transition-colors p-1 rounded hover:bg-red-50"
                        title="Mark as deleted"
                      >
                        {deletingId === claim.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}