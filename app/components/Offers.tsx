"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Loader2,
  RefreshCw,
  Edit2,
  X,
  Check,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  Plus,
  Search,
} from "lucide-react";
import api from "@/lib/axios";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Offer {
  claim_id: string;
  offer1: number | null;
  offer1_date: string | null;
  offer1_status: string | null;
  offer2: number | null;
  offer2_date: string | null;
  offer2_status: string | null;
  offer3: number | null;
  offer3_date: string | null;
  offer3_status: string | null;
  claim_type: string | null;
  claimant_name: string | null;
}

interface ClaimSearchResult {
  claim_id: string;
  claimant_name: string;
  claim_type: string;
}

type OfferNum = 1 | 2 | 3;
type SortConfig = { key: string; direction: "asc" | "desc" } | null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatCurrency(value: number | null | undefined) {
  if (value == null) return "—";
  return value.toLocaleString("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

/**
 * Derive display status purely from the offer data — no API status field needed.
 * Walk offer3 → offer2 → offer1 and return the status of the most recent one
 * that has an amount. If none exist, return "".
 */
function deriveGlobalStatus(offer: {
  offer1: number | null; offer1_status: string | null;
  offer2: number | null; offer2_status: string | null;
  offer3: number | null; offer3_status: string | null;
}): string {
  const pairs = [
    { amount: offer.offer3, status: offer.offer3_status },
    { amount: offer.offer2, status: offer.offer2_status },
    { amount: offer.offer1, status: offer.offer1_status },
  ];
  for (const { amount, status } of pairs) {
    if (amount != null) {
      return status ?? "";
    }
  }
  return "";
}

// ─── Badges ───────────────────────────────────────────────────────────────────

function GlobalStatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-xs text-slate-400">—</span>;
  const map: Record<string, string> = {
    paid:     "bg-emerald-100 text-emerald-800",
    accepted: "bg-blue-100 text-blue-800",
    rejected: "bg-red-100 text-red-700",
  };
  const cls = map[status.toLowerCase()];
  if (!cls) return <span className="text-xs text-slate-400">—</span>;
  return (
    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full whitespace-nowrap ${cls}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function ClaimTypeBadge({ type }: { type: string | null }) {
  if (!type) return <span className="text-xs text-slate-400">—</span>;
  const map: Record<string, string> = {
    personal: "bg-purple-100 text-purple-800",
    taxi: "bg-orange-100 text-orange-800",
  };
  const cls = map[type.toLowerCase()] ?? "bg-slate-100 text-slate-700";
  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${cls}`}>
      {type.charAt(0).toUpperCase() + type.slice(1)}
    </span>
  );
}

// ─── Offer status pill (read-only, shown inside the amount cell) ──────────────

function OfferStatusDot({ status }: { status: string | null }) {
  if (!status) return null;
  const map: Record<string, string> = {
    paid: "bg-emerald-500",
    accepted: "bg-blue-500",
    sent: "bg-amber-400",
  };
  const cls = map[status.toLowerCase()] ?? "bg-gray-400";
  return (
    <span
      title={status}
      className={`inline-block w-2 h-2 rounded-full ${cls} shrink-0`}
    />
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OffersManagementPage() {
  // Data
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create panel
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [allClaims, setAllClaims] = useState<ClaimSearchResult[]>([]); // fetched once on mount
  const [claimSearch, setClaimSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [selectedClaim, setSelectedClaim] = useState<ClaimSearchResult | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [filterClaimId, setFilterClaimId] = useState("");
  const [filterClaimant, setFilterClaimant] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Editing — one offer cell at a time
  const [editKey, setEditKey] = useState<{ claimId: string; num: OfferNum } | null>(null);
  const [editForm, setEditForm] = useState({ amount: "", date: "", offerStatus: "rejected" });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Sort
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchOffers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/api/offers", { headers: { requiresAuth: true } });
      setOffers(res.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load offers.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOffers(); }, [fetchOffers]);

  // ── Fetch all claims once on mount ────────────────────────────────────────

  useEffect(() => {
    api
      .get("/api/claims-search", { headers: { requiresAuth: true } })
      .then((res) => setAllClaims(res.data.data || []))
      .catch(() => setAllClaims([]));
  }, []);

  // ── Derived: client-side filtered results (max 10) ─────────────────────────

  const claimResults = allClaims
    .filter((c) => {
      const q = claimSearch.toLowerCase().trim();
      if (!q) return false;
      return (
        c.claim_id.toLowerCase().includes(q) ||
        c.claimant_name.toLowerCase().includes(q)
      );
    })
    .slice(0, 10);

  // ── Create blank offer ─────────────────────────────────────────────────────

  const handleCreateOffer = async () => {
    if (!selectedClaim) return;
    setCreating(true); setCreateError(null); setCreateSuccess(null);
    try {
      await api.post("/api/offers/create", { claim_id: selectedClaim.claim_id }, { headers: { requiresAuth: true } });
      setCreateSuccess(`Blank offer created for ${selectedClaim.claim_id}`);
      setSelectedClaim(null); setClaimSearch(""); setDropdownOpen(false);
      await fetchOffers();
    } catch (err: any) {
      setCreateError(err.response?.data?.message || "Failed to create offer.");
    } finally { setCreating(false); }
  };

  // ── Edit helpers ───────────────────────────────────────────────────────────

  const startEditing = (offer: Offer, num: OfferNum) => {
    const amount = offer[`offer${num}` as keyof Offer] as number | null;
    const date   = offer[`offer${num}_date` as keyof Offer] as string | null;
    const status = offer[`offer${num}_status` as keyof Offer] as string | null;
    setEditKey({ claimId: offer.claim_id, num });
    setEditForm({
      amount: amount?.toString() ?? "",
      date: date ? date.slice(0, 10) : "",
      offerStatus: status ?? "rejected",
    });
    setSaveError(null);
  };

  const cancelEdit = () => {
    setEditKey(null);
    setEditForm({ amount: "", date: "", offerStatus: "rejected" });
    setSaveError(null);
  };

  const handleSaveEdit = async (offer: Offer) => {
    if (!editKey) return;
    const hasAmount = editForm.amount.trim() !== "";
    const hasDate   = editForm.date.trim() !== "";

    if (hasAmount !== hasDate) {
      setSaveError("Provide both the amount and the date together, or leave both empty.");
      return;
    }

    setSaving(true); setSaveError(null);
    try {
      const n            = editKey.num;
      const amountVal    = hasAmount ? Number(editForm.amount) : null;
      const dateVal      = hasDate   ? editForm.date.trim()    : null;
      const offerStatVal = hasAmount ? editForm.offerStatus     : null;

      const payload: Record<string, unknown> = {
        [`offer${n}`]:        amountVal,
        [`offer${n}_date`]:   dateVal,
        [`offer${n}_status`]: offerStatVal,
      };

      const res = await api.put(`/api/offers/${offer.claim_id}`, payload, { headers: { requiresAuth: true } });
      if (!res.data.success) throw new Error(res.data.message || "Update failed");
      await fetchOffers();
      cancelEdit();
    } catch (err: any) {
      setSaveError(err.response?.data?.message || "Failed to update offer.");
    } finally { setSaving(false); }
  };

  // ── Sort ───────────────────────────────────────────────────────────────────

  const handleSort = (key: string) =>
    setSortConfig((prev) =>
      prev?.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" }
    );

  const sortData = (data: Offer[]) => {
    if (!sortConfig) return data;
    return [...data].sort((a, b) => {
      let va: any = a[sortConfig.key as keyof Offer];
      let vb: any = b[sortConfig.key as keyof Offer];
      if (va === vb) return 0;
      if (va == null) return sortConfig.direction === "asc" ? -1 : 1;
      if (vb == null) return sortConfig.direction === "asc" ?  1 : -1;
      if (typeof va === "string" && typeof vb === "string")
        return sortConfig.direction === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortConfig.direction === "asc" ? (va < vb ? -1 : 1) : va > vb ? -1 : 1;
    });
  };

  // ── Filter ─────────────────────────────────────────────────────────────────

  const filtered = sortData(
    offers.filter((o) => {
      const q = search.toLowerCase();
      return (
        (!search || o.claim_id.toLowerCase().includes(q) || o.claimant_name?.toLowerCase().includes(q) || o.claim_type?.toLowerCase().includes(q)) &&
        (!filterClaimId  || o.claim_id.toLowerCase().includes(filterClaimId.toLowerCase())) &&
        (!filterClaimant || o.claimant_name?.toLowerCase().includes(filterClaimant.toLowerCase())) &&
        (!filterStatus   || o.status?.toLowerCase().includes(filterStatus.toLowerCase()))
      );
    })
  );

  // ── SortHeader sub-component ───────────────────────────────────────────────

  const SortHeader = ({ label, sortKey, align = "left" }: { label: string; sortKey: string; align?: "left" | "right" | "center" }) => {
    const active = sortConfig?.key === sortKey;
    return (
      <th
        onClick={() => handleSort(sortKey)}
        className={`px-3 py-2 text-${align} font-semibold text-green-800 border-r border-gray-400 cursor-pointer hover:bg-green-100/50 transition-colors select-none group whitespace-nowrap`}
      >
        <div className={`flex items-center gap-1 ${align === "right" ? "justify-end" : align === "center" ? "justify-center" : ""}`}>
          {label}
          <span className="text-green-600">
            {active
              ? sortConfig.direction === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />
              : <ArrowUpDown size={14} className="opacity-0 group-hover:opacity-50 transition-opacity" />}
          </span>
        </div>
      </th>
    );
  };

  // ── Read-only offer pair ───────────────────────────────────────────────────

  const ReadOfferPair = ({ offer, num }: { offer: Offer; num: OfferNum }) => {
    const amount = offer[`offer${num}` as keyof Offer] as number | null;
    const date   = offer[`offer${num}_date` as keyof Offer] as string | null;
    const status = offer[`offer${num}_status` as keyof Offer] as string | null;

    const amtColor =
      status === "paid" ? "text-emerald-700 font-semibold" :
      status === "accepted" ? "text-blue-700 font-semibold" :
      "text-gray-700";

    return (
      <>
        {/* Amount cell */}
        <td className="px-3 py-1.5 border-r border-gray-300 text-right group/cell">
          <div className="flex items-center justify-end gap-1.5">
            <OfferStatusDot status={amount != null ? status : null} />
            <span className={amount != null ? amtColor : "text-slate-400"}>
              {formatCurrency(amount)}
            </span>
            <button
              onClick={() => startEditing(offer, num)}
              className="opacity-0 group-hover/cell:opacity-100 transition-opacity text-green-500 hover:text-green-800"
              title={`Edit Offer ${num}`}
            >
              <Edit2 size={12} />
            </button>
          </div>
        </td>
        {/* Date cell */}
        <td className="px-3 py-1.5 border-r border-gray-300 whitespace-nowrap">
          <span className={date ? "text-gray-700" : "text-slate-400"}>
            {formatDate(date)}
          </span>
        </td>
      </>
    );
  };

  // EditOfferRow is inlined directly in the table body below to avoid remount focus loss

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50/40">
      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-2xl font-extrabold text-green-800 tracking-tight">
              Offers Management
            </h1>
            <p className="mt-1 text-lg text-green-700/80">
              Track settlement offers across all claims
            </p>
          </div>
          <div className="flex gap-3 mt-4 md:mt-0">
            <button
              onClick={fetchOffers}
              disabled={loading}
              className="px-5 py-2 bg-white border border-green-200 text-green-700 rounded-xl hover:bg-green-50 transition disabled:opacity-50 flex items-center gap-2 text-sm"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
            <button
              onClick={() => { setShowCreatePanel((v) => !v); setCreateError(null); setCreateSuccess(null); }}
              className="px-5 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-xl shadow flex items-center gap-2 text-sm transition"
            >
              <Plus size={16} />
              New Offer
            </button>
          </div>
        </div>

        {/* Create panel */}
        {showCreatePanel && (
          <div className="mb-8 bg-white/80 backdrop-blur-md shadow-xl rounded-2xl border border-green-100/60 p-6">
            <h2 className="text-lg font-bold text-green-800 mb-1">Add Blank Offer for a Claim</h2>
            <p className="text-xs text-gray-500 mb-5">Search by Claim ID or claimant name — up to 10 matches shown</p>

            <div className="flex flex-col sm:flex-row gap-4 items-start">
              {/* ── Combobox ── */}
              <div className="relative w-full sm:max-w-sm">
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Select Claim</label>

                {/* Input */}
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    value={claimSearch}
                    autoComplete="off"
                    onChange={(e) => {
                      const val = e.target.value;
                      setClaimSearch(val);
                      setSelectedClaim(null);
                      setHighlightedIndex(-1);
                      setDropdownOpen(val.trim().length > 0);
                    }}
                    onFocus={() => { if (claimSearch.trim() && claimResults.length > 0) setDropdownOpen(true); }}
                    onBlur={() => setTimeout(() => setDropdownOpen(false), 150)}
                    onKeyDown={(e) => {
                      if (!dropdownOpen) return;
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setHighlightedIndex((i) => Math.min(i + 1, claimResults.length - 1));
                      } else if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setHighlightedIndex((i) => Math.max(i - 1, 0));
                      } else if (e.key === "Enter" && highlightedIndex >= 0) {
                        e.preventDefault();
                        const c = claimResults[highlightedIndex];
                        setSelectedClaim(c);
                        setClaimSearch(`${c.claim_id} — ${c.claimant_name}`);
                        setDropdownOpen(false);
                      } else if (e.key === "Escape") {
                        setDropdownOpen(false);
                      }
                    }}
                    placeholder="e.g. PC156 or Ahmed…"
                    className="w-full pl-9 pr-8 py-2.5 border border-green-200 rounded-xl focus:ring-2 focus:ring-green-400 bg-white text-sm shadow-sm transition"
                  />
                  {/* Clear button */}
                  {claimSearch && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => { setClaimSearch(""); setSelectedClaim(null); setDropdownOpen(false); }}
                        className="text-gray-400 hover:text-red-400 transition"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Dropdown list */}
                {dropdownOpen && claimResults.length > 0 && (
                  <ul className="absolute z-30 w-full mt-1.5 bg-white border border-green-200 rounded-xl shadow-xl overflow-hidden divide-y divide-gray-100 max-h-[340px] overflow-y-auto">
                    {claimResults.map((c, idx) => (
                      <li key={c.claim_id}>
                        <button
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setSelectedClaim(c);
                            setClaimSearch(`${c.claim_id} — ${c.claimant_name}`);
                            setDropdownOpen(false);
                            setHighlightedIndex(-1);
                          }}
                          onMouseEnter={() => setHighlightedIndex(idx)}
                          className={`w-full text-left px-4 py-2.5 transition flex items-center gap-3 ${
                            highlightedIndex === idx ? "bg-green-50" : "hover:bg-gray-50"
                          }`}
                        >
                          {/* Claim ID pill */}
                          <span className="shrink-0 px-2 py-0.5 bg-green-100 text-green-800 text-xs font-bold rounded-md font-mono">
                            {c.claim_id}
                          </span>
                          {/* Name */}
                          <span className="text-sm text-gray-800 truncate flex-1">{c.claimant_name}</span>
                          {/* Type badge */}
                          <span className="shrink-0">
                            <ClaimTypeBadge type={c.claim_type} />
                          </span>
                        </button>
                      </li>
                    ))}
                    {/* Footer count */}
                    <li className="px-4 py-2 bg-gray-50 text-[10px] text-gray-400 text-right select-none">
                      {claimResults.length} result{claimResults.length !== 1 ? "s" : ""} shown (max 10)
                    </li>
                  </ul>
                )}

                {/* No results hint */}
                {claimSearch.trim() && claimResults.length === 0 && !selectedClaim && (
                  <p className="mt-2 text-xs text-gray-400 pl-1">No claims found for "{claimSearch}"</p>
                )}
              </div>

              {/* ── Selected claim card + action ── */}
              {selectedClaim && (
                <div className="flex-1 flex items-center gap-4 bg-green-50 border border-green-200 rounded-xl px-4 py-3 mt-6 sm:mt-0 self-end sm:self-auto">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-green-800 truncate">
                      {selectedClaim.claim_id}
                      <span className="font-normal text-gray-600"> — {selectedClaim.claimant_name}</span>
                    </p>
                    <div className="mt-1">
                      <ClaimTypeBadge type={selectedClaim.claim_type} />
                    </div>
                  </div>
                  <button
                    onClick={handleCreateOffer}
                    disabled={creating}
                    className="shrink-0 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-2 px-5 rounded-full shadow flex items-center gap-2 text-sm disabled:opacity-60 transition"
                  >
                    {creating
                      ? <><Loader2 size={14} className="animate-spin" />Creating…</>
                      : <><Plus size={14} />Create Blank Offer</>}
                  </button>
                </div>
              )}
            </div>

            {createError   && <p className="mt-4 text-red-600 text-sm">{createError}</p>}
            {createSuccess && <p className="mt-4 text-green-700 text-sm font-medium">✓ {createSuccess}</p>}
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { val: search,          set: setSearch,          ph: "Quick search…" },
            { val: filterClaimId,   set: setFilterClaimId,   ph: "Filter Claim ID" },
            { val: filterClaimant,  set: setFilterClaimant,  ph: "Filter Claimant" },
            { val: filterStatus,    set: setFilterStatus,    ph: "Filter Status" },
          ].map(({ val, set, ph }) => (
            <input
              key={ph}
              type="text"
              value={val}
              onChange={(e) => set(e.target.value)}
              placeholder={ph}
              className="px-3 py-2 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-400 bg-white/70 text-sm"
            />
          ))}
          <div className="text-xs font-medium text-green-700 bg-white border border-green-200 rounded-lg px-3 py-2 flex items-center justify-center">
            {filtered.length} / {offers.length}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{error}</div>
        )}

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-12 h-12 text-green-600 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 bg-white/60 rounded-2xl border border-green-100 shadow text-sm text-green-700/80">
            {search || filterClaimId || filterClaimant || filterStatus
              ? "No matching offers found"
              : "No offers yet — create one above"}
          </div>
        ) : (
          <div className="bg-white/85 backdrop-blur-sm border border-green-100 rounded-xl shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-300 text-xs">
                <thead className="bg-green-50/70">
                  <tr>
                    <SortHeader label="Status"   sortKey="status"        align="center" />
                    <SortHeader label="Claim ID"  sortKey="claim_id" />
                    <SortHeader label="Claimant"  sortKey="claimant_name" />
                    <SortHeader label="Type"      sortKey="claim_type"    align="center" />
                    <th className="px-3 py-2 text-right font-semibold text-green-800 border-r border-gray-400">Offer 1</th>
                    <th className="px-3 py-2 text-left  font-semibold text-green-800 border-r border-gray-400">O1 Date</th>
                    <th className="px-3 py-2 text-right font-semibold text-green-800 border-r border-gray-400">Offer 2</th>
                    <th className="px-3 py-2 text-left  font-semibold text-green-800 border-r border-gray-400">O2 Date</th>
                    <th className="px-3 py-2 text-right font-semibold text-green-800 border-r border-gray-400">Offer 3</th>
                    <th className="px-3 py-2 text-left  font-semibold text-green-800 border-r border-gray-400">O3 Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filtered.map((offer) => {
                    const isEditingThisRow = editKey?.claimId === offer.claim_id;
                    return (
                      <>
                        <tr key={offer.claim_id} className="hover:bg-green-50/30 transition-colors">
                          {/* Global status */}
                          <td className="px-3 py-1.5 text-center border-r border-gray-300">
                            <GlobalStatusBadge status={deriveGlobalStatus(offer)} />
                          </td>
                          {/* Claim ID */}
                          <td className="px-3 py-1.5 border-r border-gray-300 font-medium text-green-700 whitespace-nowrap">
                            {offer.claim_id}
                          </td>
                          {/* Claimant */}
                          <td className="px-3 py-1.5 border-r border-gray-300 truncate max-w-[180px]">
                            {offer.claimant_name?.toUpperCase() || "—"}
                          </td>
                          {/* Type */}
                          <td className="px-3 py-1.5 text-center border-r border-gray-300">
                            <ClaimTypeBadge type={offer.claim_type} />
                          </td>
                          {/* Offer pairs — read-only; edit opens the sub-row */}
                          <ReadOfferPair offer={offer} num={1} />
                          <ReadOfferPair offer={offer} num={2} />
                          <ReadOfferPair offer={offer} num={3} />
                        </tr>

                        {/* Inline edit row — inlined (not a sub-component) to preserve input focus */}
                        {isEditingThisRow && editKey && (
                          <tr className="bg-green-50/80 border-b border-green-200">
                            <td colSpan={10} className="px-4 py-3">
                              <div className="flex flex-wrap items-end gap-4">
                                <p className="text-xs font-bold text-green-800 uppercase tracking-wide w-full mb-0.5">
                                  Editing Offer {editKey.num} — {offer.claim_id}
                                </p>
                                {/* Amount */}
                                <div className="flex flex-col gap-1 min-w-[120px]">
                                  <label className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">Amount (£)</label>
                                  <input
                                    type="number"
                                    value={editForm.amount}
                                    onChange={(e) => setEditForm((p) => ({ ...p, amount: e.target.value }))}
                                    placeholder="0"
                                    autoFocus
                                    className="px-2 py-1.5 border border-green-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-green-400 bg-white"
                                  />
                                </div>
                                {/* Date */}
                                <div className="flex flex-col gap-1">
                                  <label className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">Offer Date</label>
                                  <input
                                    type="date"
                                    value={editForm.date}
                                    onChange={(e) => setEditForm((p) => ({ ...p, date: e.target.value }))}
                                    className="px-2 py-1.5 border border-green-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-green-400 bg-white"
                                  />
                                </div>
                                {/* Status pills */}
                                <div className="flex flex-col gap-1">
                                  <label className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">Is this offer…</label>
                                  <div className="flex gap-2">
                                    {(["rejected", "accepted", "paid"] as const).map((s) => (
                                      <label
                                        key={s}
                                        className={`flex items-center gap-1.5 cursor-pointer text-xs font-semibold px-3 py-1.5 rounded-full border transition-all select-none ${
                                          editForm.offerStatus === s
                                            ? s === "paid"
                                              ? "bg-emerald-600 text-white border-emerald-600 shadow"
                                              : s === "accepted"
                                              ? "bg-blue-600 text-white border-blue-600 shadow"
                                              : "bg-red-500 text-white border-red-500 shadow"
                                            : "bg-white text-gray-600 border-gray-300 hover:border-green-400"
                                        }`}
                                      >
                                        <input
                                          type="radio"
                                          name={`offer-status-${offer.claim_id}-${editKey.num}`}
                                          value={s}
                                          checked={editForm.offerStatus === s}
                                          onChange={() => setEditForm((p) => ({ ...p, offerStatus: s }))}
                                          className="sr-only"
                                        />
                                        {s.charAt(0).toUpperCase() + s.slice(1)}
                                      </label>
                                    ))}
                                  </div>
                                </div>
                                {/* Save / Cancel */}
                                <div className="flex items-center gap-2 ml-auto">
                                  {saveError && <span className="text-red-600 text-xs max-w-xs">{saveError}</span>}
                                  <button
                                    onClick={cancelEdit}
                                    disabled={saving}
                                    className="flex items-center gap-1.5 px-4 py-1.5 border border-gray-300 text-gray-600 hover:text-red-600 hover:border-red-300 rounded-lg text-xs font-semibold disabled:opacity-40 transition"
                                  >
                                    <X size={13} /> Cancel
                                  </button>
                                  <button
                                    onClick={() => handleSaveEdit(offer)}
                                    disabled={saving}
                                    className="flex items-center gap-1.5 px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition shadow"
                                  >
                                    {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                                    Save
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-4 text-xs text-gray-500">
          {[
            { color: "bg-emerald-400", label: "Paid" },
            { color: "bg-blue-400",    label: "Accepted" },
          ].map(({ color, label }) => (
            <span key={label} className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${color} inline-block`} />
              {label}
            </span>
          ))}
          <span className="text-gray-400">· Status shows only when an offer is accepted or paid · Hover any offer amount to edit</span>
        </div>
      </main>
    </div>
  );
}