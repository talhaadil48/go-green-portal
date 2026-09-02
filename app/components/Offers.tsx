"use client";

import { Fragment, useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  CheckCircle2,
  PoundSterling,
  History,
  ChevronRight,
} from "lucide-react";
import api from "@/lib/axios";

// ─── Types ────────────────────────────────────────────────────────────────────

interface OfferEntry {
  amount: number | null;
  date: string | null;
  status: string | null;
}

interface Offer {
  claim_id: string;
  offers: OfferEntry[];
  latest_offer: OfferEntry | null;
  status: string | null;
  seen: boolean;
  claim_type: string | null;
  claimant_name: string | null;
  hire_storage: number | null;
}

interface ClaimSearchResult {
  claim_id: string;
  claimant_name: string;
  claim_type: string;
}

type SortKey =
  | "status"
  | "claim_id"
  | "claimant_name"
  | "claim_type"
  | "hire_storage"
  | "latest_amount"
  | "latest_date";
type SortConfig = { key: SortKey; direction: "asc" | "desc" } | null;

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
 * Get the latest offer from the offers JSON array based on the most recent date.
 * This replaces the old offer3 → offer2 → offer1 fallback logic.
 */
function getLatestOffer(offers: OfferEntry[]): OfferEntry | null {
  const withDate = offers.filter((o) => o.date != null);
  if (withDate.length === 0) return null;
  return withDate.reduce((latest, current) =>
    (current.date ?? "") > (latest.date ?? "") ? current : latest
  );
}

/**
 * Get the latest offer from an Offer record (uses pre-computed latest_offer
 * from the API if available, otherwise computes from the array).
 */
function resolveLatestOffer(offer: Offer): OfferEntry | null {
  return offer.latest_offer ?? getLatestOffer(offer.offers ?? []);
}

function deriveGlobalStatus(offer: Offer): string {
  const latest = resolveLatestOffer(offer);
  return latest?.status ?? "";
}

// Status ranking used purely for sorting (so it's deterministic & meaningful,
// not alphabetical noise)
const STATUS_RANK: Record<string, number> = {
  paid: 3,
  accepted: 2,
  rejected: 1,
  "": 0,
};

// "blank" is a special filter value (not a real stored status) meaning
// "this claim has no current offer status at all" — i.e. brand-new blank
// offers you just created. It's handled separately from the real statuses
// below wherever filterStatus is used.
const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "blank", label: "No Offer / Blank" },
  { value: "paid", label: "Paid" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
];

// ─── Badges ───────────────────────────────────────────────────────────────────

function GlobalStatusBadge({ status }: { status: string | null }) {
  if (!status) {
    return (
      <span className="px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap bg-gray-100 text-gray-500">
        No Offer
      </span>
    );
  }
  const map: Record<string, string> = {
    paid:     "bg-emerald-100 text-emerald-800",
    accepted: "bg-blue-100 text-blue-800",
    rejected: "bg-red-100 text-red-700",
  };
  const cls = map[status.toLowerCase()];
  if (!cls) {
    return (
      <span className="px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap bg-gray-100 text-gray-500">
        No Offer
      </span>
    );
  }
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

// ─── Offer History Modal ─────────────────────────────────────────────────────

function OfferHistoryModal({
  isOpen,
  onClose,
  offer,
}: {
  isOpen: boolean;
  onClose: () => void;
  offer: Offer | null;
}) {
  if (!isOpen || !offer) return null;

  // Sort offers newest first
  const sorted = [...(offer.offers ?? [])].sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  const latestDate = offer.latest_offer?.date;

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Offer History</h3>
            <p className="text-sm text-gray-500">
              {offer.claim_id} — {offer.claimant_name?.toUpperCase() || "—"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Offers list */}
        <div className="px-6 py-4 overflow-y-auto max-h-[60vh]">
          {sorted.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No offers yet</p>
          ) : (
            <div className="space-y-3">
              {sorted.map((entry, idx) => {
                const isLatest =
                  latestDate && entry.date === latestDate && entry.amount != null;
                const amtColor =
                  entry.status === "paid"
                    ? "text-emerald-700 font-semibold"
                    : entry.status === "accepted"
                    ? "text-blue-700 font-semibold"
                    : "text-gray-700";

                return (
                  <div
                    key={idx}
                    className={`flex items-center gap-4 p-4 rounded-xl border transition ${
                      isLatest
                        ? "bg-green-50 border-green-300"
                        : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    {/* Offer number */}
                    <div className="shrink-0 w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold">
                      {sorted.length - idx}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={entry.amount != null ? amtColor : "text-slate-400"}>
                          {formatCurrency(entry.amount)}
                        </span>
                        <OfferStatusDot status={entry.amount != null ? entry.status : null} />
                        {isLatest && (
                          <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-green-200 text-green-800">
                            Latest
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatDate(entry.date)}
                        {entry.status && entry.amount != null && (
                          <span className="ml-2 text-gray-400">• {entry.status}</span>
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OffersManagementPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [allClaims, setAllClaims] = useState<ClaimSearchResult[]>([]);
  const [claimSearch, setClaimSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [selectedClaim, setSelectedClaim] = useState<ClaimSearchResult | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [filterClaimId, setFilterClaimId] = useState("");
  const [filterClaimant, setFilterClaimant] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Editing — one offer entry at a time
  const [editKey, setEditKey] = useState<{ claimId: string; offerIndex: number } | null>(null);
  const [editForm, setEditForm] = useState({ amount: "", date: "", offerStatus: "rejected" });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Sort
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);

  // Scroll preservation + "just updated" row highlight
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [recentlyUpdatedClaimId, setRecentlyUpdatedClaimId] = useState<string | null>(null);

  // Offer history modal
  const [historyOffer, setHistoryOffer] = useState<Offer | null>(null);

  // Tracks whether the current inline form is for creating a new offer (vs editing existing)
  // null = editing existing offer; string = claim_id of the new offer being created
  const [creatingNewOfferForClaimId, setCreatingNewOfferForClaimId] = useState<string | null>(null);

  // ── Fetch

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
    setCreateError(null); setCreateSuccess(null);

    const claimId = selectedClaim.claim_id;

    try {
      // Create a blank offer record on the backend (empty offers JSONB column)
      await api.post("/api/offers/create", { claim_id: claimId }, { headers: { requiresAuth: true } });

      // Close the create panel
      setSelectedClaim(null); setClaimSearch(""); setDropdownOpen(false);
      setShowCreatePanel(false);
      await fetchOffers();

      // Auto-open the edit form so user can fill in the offer details
      const refreshedRes = await api.get("/api/offers", { headers: { requiresAuth: true } });
      const refreshedOffers = refreshedRes.data.data || [];
      const newOffer = refreshedOffers.find((o: Offer) => o.claim_id === claimId);
      if (newOffer && newOffer.offers?.length > 0) {
        const lastIdx = newOffer.offers.length - 1;
        startEditing(newOffer, lastIdx);
      }

      setRecentlyUpdatedClaimId(claimId);
      setTimeout(() => setRecentlyUpdatedClaimId((cur) => (cur === claimId ? null : cur)), 2500);
    } catch (err: any) {
      setCreateError(err.response?.data?.message || "Failed to create offer.");
    }
  };

  // ── Edit helpers ───────────────────────────────────────────────────────────

  const startEditing = (offer: Offer, offerIndex: number) => {
    const entry = offer.offers?.[offerIndex];
    setEditKey({ claimId: offer.claim_id, offerIndex });
    setEditForm({
      amount: entry?.amount?.toString() ?? "",
      date: entry?.date ? entry.date.slice(0, 10) : "",
      offerStatus: entry?.status ?? "rejected",
    });
    setSaveError(null);
  };

  const cancelEdit = () => {
    setEditKey(null);
    setEditForm({ amount: "", date: "", offerStatus: "rejected" });
    setSaveError(null);
    setCreatingNewOfferForClaimId(null);
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

    const scrollTop = scrollContainerRef.current?.scrollTop ?? null;
    const claimId = offer.claim_id;
    const isNewOffer = creatingNewOfferForClaimId === claimId;

    try {
      const amountVal    = hasAmount ? Number(editForm.amount) : null;
      const dateVal      = hasDate   ? editForm.date.trim()    : null;
      const offerStatVal = hasAmount ? editForm.offerStatus     : null;

      if (isNewOffer) {
        // ── Creating a brand-new offer: require at least amount & date ──
        if (!hasAmount || !hasDate) {
          setSaveError("You must provide an amount and a date to create this offer.");
          setSaving(false);
          return;
        }

        await api.post(
          "/api/offers",
          { claim_id: claimId, offer: { amount: amountVal, date: dateVal, status: offerStatVal }, seen: true },
          { headers: { requiresAuth: true } }
        );
      } else {
        // ── Editing an existing offer ──
        const payload: Record<string, unknown> = hasAmount === false && hasDate === false
          ? { offer_index: editKey.offerIndex, offer: null }
          : {
              offer_index: editKey.offerIndex,
              offer: { amount: amountVal, date: dateVal, status: offerStatVal },
            };

        const res = await api.put(`/api/offers/${offer.claim_id}`, payload, { headers: { requiresAuth: true } });
        if (!res.data.success) throw new Error(res.data.message || "Update failed");
      }

      await fetchOffers();
      cancelEdit();

      requestAnimationFrame(() => {
        if (scrollContainerRef.current && scrollTop != null) {
          scrollContainerRef.current.scrollTop = scrollTop;
        }
      });

      setRecentlyUpdatedClaimId(claimId);
      setTimeout(() => setRecentlyUpdatedClaimId((cur) => (cur === claimId ? null : cur)), 2500);
    } catch (err: any) {
      setSaveError(err.response?.data?.message || "Failed to save offer.");
    } finally { setSaving(false); }
  };

  // ── Add new offer (client-side form only, no API call yet) ──────────────────

  const handleAppendNewOffer = (offer: Offer) => {
    const claimId = offer.claim_id;
    const newOfferIndex = offer.offers?.length ?? 0;

    // Open the inline form with empty fields — NO API call at this point
    setCreatingNewOfferForClaimId(claimId);
    setEditKey({ claimId, offerIndex: newOfferIndex });
    setEditForm({ amount: "", date: "", offerStatus: "rejected" });
    setSaveError(null);
  };

  // ── Sort ───────────────────────────────────────────────────────────────────

  const handleSort = (key: SortKey) =>
    setSortConfig((prev) =>
      prev?.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" }
    );

  const sortData = (data: Offer[]) => {
    if (!sortConfig) return data;
    const { key, direction } = sortConfig;
    const dir = direction === "asc" ? 1 : -1;

    return [...data].sort((a, b) => {
      if (key === "status") {
        const ra = STATUS_RANK[deriveGlobalStatus(a).toLowerCase()] ?? 0;
        const rb = STATUS_RANK[deriveGlobalStatus(b).toLowerCase()] ?? 0;
        return (ra - rb) * dir;
      }

      if (key === "hire_storage") {
        const va = a.hire_storage ?? 0;
        const vb = b.hire_storage ?? 0;
        return (va - vb) * dir;
      }

      if (key === "latest_amount") {
        const va = resolveLatestOffer(a)?.amount ?? null;
        const vb = resolveLatestOffer(b)?.amount ?? null;
        if (va === vb) return 0;
        if (va == null) return 1;
        if (vb == null) return -1;
        return (va - vb) * dir;
      }

      if (key === "latest_date") {
        const va = resolveLatestOffer(a)?.date;
        const vb = resolveLatestOffer(b)?.date;
        const ta = va ? new Date(va).getTime() : null;
        const tb = vb ? new Date(vb).getTime() : null;
        if (ta === tb) return 0;
        if (ta == null) return 1;
        if (tb == null) return -1;
        return (ta - tb) * dir;
      }

      const va = (a[key] ?? "") as string;
      const vb = (b[key] ?? "") as string;
      if (!va && vb) return 1;
      if (va && !vb) return -1;
      return va.localeCompare(vb) * dir;
    });
  };

  // ── Filter ─────────────────────────────────────────────────────────────────

  const filtered = sortData(
    offers.filter((o) => {
      const q = search.toLowerCase();
      const currentStatus = deriveGlobalStatus(o).toLowerCase();
      const matchesStatus =
        !filterStatus ||
        (filterStatus === "blank"
          ? currentStatus === ""
          : currentStatus === filterStatus.toLowerCase());
      return (
        (!search ||
          o.claim_id.toLowerCase().includes(q) ||
          o.claimant_name?.toLowerCase().includes(q) ||
          o.claim_type?.toLowerCase().includes(q)) &&
        (!filterClaimId  || o.claim_id.toLowerCase().includes(filterClaimId.toLowerCase())) &&
        (!filterClaimant || o.claimant_name?.toLowerCase().includes(filterClaimant.toLowerCase())) &&
        matchesStatus
      );
    })
  );

  // ── Summary (accepted offers count + total accepted amount) ────────────────

  const { acceptedCount, acceptedTotal } = useMemo(() => {
    let count = 0;
    let total = 0;
    for (const o of offers) {
      const latest = resolveLatestOffer(o);
      if (latest?.status?.toLowerCase() === "accepted" && latest.amount != null) {
        count += 1;
        total += latest.amount;
      }
    }
    return { acceptedCount: count, acceptedTotal: total };
  }, [offers]);

  // ── SortHeader sub-component ───────────────────────────────────────────────

  const SortHeader = ({ label, sortKey, align = "left" }: { label: string; sortKey: SortKey; align?: "left" | "right" | "center" }) => {
    const active = sortConfig?.key === sortKey;
    const alignClass = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
    return (
      <th
        onClick={() => handleSort(sortKey)}
        className={`px-3 py-2 ${alignClass} font-semibold text-green-800 border-r border-gray-400 cursor-pointer hover:bg-green-100/50 transition-colors select-none group whitespace-nowrap`}
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

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50/40">
      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
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

        {/* Summary cards */}
        <div className="mb-6 flex flex-wrap gap-3">
          <div className="flex items-center gap-3 bg-white/85 border border-blue-100 rounded-xl shadow-sm px-4 py-2.5 min-w-[170px]">
            <span className="shrink-0 w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <CheckCircle2 size={16} />
            </span>
            <div>
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Accepted Offers</p>
              <p className="text-sm font-bold text-blue-800">{acceptedCount}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-white/85 border border-emerald-100 rounded-xl shadow-sm px-4 py-2.5 min-w-[170px]">
            <span className="shrink-0 w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <PoundSterling size={16} />
            </span>
            <div>
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Accepted Total</p>
              <p className="text-sm font-bold text-emerald-800">{formatCurrency(acceptedTotal)}</p>
            </div>
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
                    disabled={!selectedClaim}
                    className="shrink-0 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-2 px-5 rounded-full shadow flex items-center gap-2 text-sm disabled:opacity-60 transition"
                  >
                    <Plus size={14} /> Add Offer
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
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Quick search…"
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
            placeholder="Filter Claimant"
            className="px-3 py-2 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-400 bg-white/70 text-sm"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-400 bg-white/70 text-sm text-gray-700"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
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
            <div ref={scrollContainerRef} className="overflow-x-auto overflow-y-auto max-h-[70vh]">
              <table className="min-w-full divide-y divide-gray-300 text-xs">
                <thead className="bg-green-50 sticky top-0 z-20 shadow-sm">
                  <tr>
                    <SortHeader label="Status"    sortKey="status"        align="center" />
                    <SortHeader label="Claim ID"  sortKey="claim_id" />
                    <SortHeader label="Claimant"  sortKey="claimant_name" />
                    <SortHeader label="Type"      sortKey="claim_type"    align="center" />
                    <SortHeader label="Hire/Storage" sortKey="hire_storage" align="right" />
                    <SortHeader label="Latest Offer" sortKey="latest_amount" align="right" />
                    <SortHeader label="Offer Date"   sortKey="latest_date" />
                    <th className="px-3 py-2 text-center font-semibold text-green-800 border-r border-gray-400 whitespace-nowrap">
                      History
                    </th>
                    <th className="px-3 py-2 text-center font-semibold text-green-800 whitespace-nowrap">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filtered.map((offer) => {
                    const latest = resolveLatestOffer(offer);
                    const isEditingThisRow = editKey?.claimId === offer.claim_id;
                    const isRecentlyUpdated = recentlyUpdatedClaimId === offer.claim_id;
                    const offerCount = offer.offers?.length ?? 0;

                    return (
                      <Fragment key={offer.claim_id}>
                        <tr
                          className={`transition-colors duration-700 ${
                            isRecentlyUpdated ? "bg-yellow-100" : "hover:bg-green-50/30"
                          }`}
                        >
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
                          {/* Hire/Storage */}
                          <td className="px-3 py-1.5 text-right border-r border-gray-300 font-medium text-purple-700">
                            {formatCurrency(offer.hire_storage)}
                          </td>
                          {/* Latest Offer Amount */}
                          <td className="px-3 py-1.5 border-r border-gray-300 text-right group/cell">
                            <div className="flex items-center justify-end gap-1.5">
                              <OfferStatusDot status={latest?.amount != null ? latest.status : null} />
                              <span className={latest?.amount != null
                                ? latest.status === "paid" ? "text-emerald-700 font-semibold"
                                : latest.status === "accepted" ? "text-blue-700 font-semibold"
                                : "text-gray-700"
                                : "text-slate-400"
                              }>
                                {formatCurrency(latest?.amount ?? null)}
                              </span>
                            </div>
                          </td>
                          {/* Latest Offer Date */}
                          <td className="px-3 py-1.5 border-r border-gray-300 whitespace-nowrap">
                            <span className={latest?.date ? "text-gray-700" : "text-slate-400"}>
                              {formatDate(latest?.date ?? null)}
                            </span>
                          </td>
                          {/* History button */}
                          <td className="px-3 py-1.5 text-center border-r border-gray-300">
                            {offerCount > 0 ? (
                              <button
                                onClick={() => setHistoryOffer(offer)}
                                className="inline-flex items-center gap-1 px-2 py-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition text-xs font-medium"
                                title={`View ${offerCount} offer${offerCount !== 1 ? "s" : ""}`}
                              >
                                <History size={14} />
                                <span>{offerCount}</span>
                                <ChevronRight size={12} />
                              </button>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                          {/* Edit + Add buttons */}
                          <td className="px-3 py-1.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {offerCount > 0 && (
                                <button
                                  onClick={() => {
                                    const latestIdx = offer.offers.findIndex(
                                      (e) => e.date === latest?.date && e.amount === latest?.amount
                                    );
                                    if (latestIdx >= 0) startEditing(offer, latestIdx);
                                  }}
                                  className="text-green-500 hover:text-green-800 p-1 rounded hover:bg-green-50 transition"
                                  title="Edit latest offer"
                                >
                                  <Edit2 size={14} />
                                </button>
                              )}
                              <button
                                onClick={() => handleAppendNewOffer(offer)}
                                className="text-blue-500 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition"
                                title="Add new offer entry"
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Inline edit row - REDESIGNED */}
                        {isEditingThisRow && editKey && (
                          <tr className="bg-gradient-to-r from-slate-50 to-gray-50 border-b-2 border-green-200">
                            <td colSpan={9} className="px-6 py-4">
                              <div className="flex items-center gap-6">
                                {/* Offer number badge */}
                                <div className="shrink-0">
                                  <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-green-100 text-green-700 font-bold text-sm">
                                    #{editKey.offerIndex + 1}
                                  </span>
                                </div>

                                {/* Amount input */}
                                <div className="flex-1 max-w-[200px]">
                                  <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                                    Amount (£)
                                  </label>
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm">£</span>
                                    <input
                                      type="number"
                                      value={editForm.amount}
                                      onChange={(e) => setEditForm((p) => ({ ...p, amount: e.target.value }))}
                                      placeholder="0.00"
                                      autoFocus
                                      className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white shadow-sm"
                                    />
                                  </div>
                                </div>

                                {/* Date input */}
                                <div className="flex-1 max-w-[200px]">
                                  <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                                    Date
                                  </label>
                                  <input
                                    type="date"
                                    value={editForm.date}
                                    onChange={(e) => setEditForm((p) => ({ ...p, date: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white shadow-sm"
                                  />
                                </div>

                                {/* Status selector - redesigned as modern toggle pills */}
                                <div className="flex-1">
                                  <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                                    Status
                                  </label>
                                  <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                                    {(["rejected", "accepted", "paid"] as const).map((s) => {
                                      const isActive = editForm.offerStatus === s;
                                      return (
                                        <button
                                          key={s}
                                          onMouseDown={(e) => e.preventDefault()}
                                          onClick={() => setEditForm((p) => ({ ...p, offerStatus: s }))}
                                          className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 ${
                                            isActive
                                              ? s === "paid"
                                                ? "bg-emerald-500 text-white shadow-sm"
                                                : s === "accepted"
                                                ? "bg-blue-500 text-white shadow-sm"
                                                : "bg-red-500 text-white shadow-sm"
                                              : "text-gray-600 hover:text-gray-900 hover:bg-white"
                                          }`}
                                        >
                                          {s.charAt(0).toUpperCase() + s.slice(1)}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* Action buttons */}
                                <div className="flex items-center gap-2 shrink-0">
                                  {saveError && (
                                    <span className="text-red-600 text-xs max-w-[200px] bg-red-50 px-2 py-1 rounded">{saveError}</span>
                                  )}
                                  <button
                                    onClick={cancelEdit}
                                    disabled={saving}
                                    className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 text-gray-600 hover:text-red-600 hover:border-red-300 hover:bg-red-50 rounded-lg text-xs font-semibold disabled:opacity-40 transition-all"
                                  >
                                    <X size={14} /> Cancel
                                  </button>
                                  <button
                                    onClick={() => handleSaveEdit(offer)}
                                    disabled={saving}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition-all shadow-sm hover:shadow"
                                  >
                                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                    {creatingNewOfferForClaimId === offer.claim_id ? "Submit" : "Save"}
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
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
          <span className="text-gray-400">· Status shows only when an offer is accepted or paid · Click History to view all offers</span>
        </div>
      </main>

      {/* Offer History Modal */}
      <OfferHistoryModal
        isOpen={historyOffer !== null}
        onClose={() => setHistoryOffer(null)}
        offer={historyOffer}
      />
    </div>
  );
}