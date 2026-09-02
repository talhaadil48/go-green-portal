"use client";

import { useState, useEffect, useMemo, FormEvent } from "react";
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
  Banknote,
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
  status: string | null;
  solicitor_fee: number | null;
  payment_received: number | null;
  date_received: string | null;
}

interface OfferEntry {
  amount: number | null;
  date: string | null;
  status: string | null;
}

interface OfferRecord {
  claim_id: string;
  offers: OfferEntry[];
  latest_offer: OfferEntry | null;
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

type SortConfig = { key: string; direction: "asc" | "desc" } | null;
type InvoiceStatus = "paid" | "accepted" | "rejected" | "";

const STATUS_OPTIONS: InvoiceStatus[] = ["", "paid", "accepted", "rejected"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Get the latest offer from an offers array based on the most recent date.
 */
function getLatestOfferFromList(offers: OfferEntry[]): OfferEntry | null {
  const withDate = offers.filter((o) => o.date != null);
  if (withDate.length === 0) return null;
  return withDate.reduce((latest, current) =>
    (current.date ?? "") > (latest.date ?? "") ? current : latest
  );
}

/**
 * Derives the effective status for a claim invoice row from the offers data.
 * Uses the latest offer's status (paid/accepted/rejected).
 * If no offer exists for this claim, returns null.
 */
function effectiveStatus(inv: ClaimInvoice, offersMap: Map<string, OfferRecord>): string | null {
  const offer = offersMap.get(inv.claim_id || "");
  if (!offer) return null;
  const latest = offer.latest_offer ?? getLatestOfferFromList(offer.offers ?? []);
  return latest?.status?.toLowerCase() ?? null;
}

/**
 * Derives the "Sent Status" for a claim invoice row.
 * Sent  -> user_name AND invoice_datetime are both present
 * Not Sent -> either user_name or invoice_datetime is missing
 */
function sentStatus(inv: ClaimInvoice): "SE" | "NS" {
  return inv.user_name && hasRealDate(inv.invoice_datetime) ? "SE" : "NS";
}

function sentStatusBadge(status: "SE" | "NS") {
  const styles =
    status === "SE"
      ? "bg-blue-100 text-blue-800"
      : "bg-slate-100 text-slate-600";
  return (
    <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${styles}`}>
      {status}
    </span>
  );
}

function statusBadge(status: string | null) {
  if (!status) return <span className="text-[10px] text-slate-400">—</span>;
  const normalised = status.toLowerCase();
  const styles: Record<string, string> = {
    paid: "bg-green-100 text-green-800",
    accepted: "bg-blue-100 text-blue-800",
    rejected: "bg-red-100 text-red-800",
  };
  return (
    <span
      className={`px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${styles[normalised] ?? "bg-slate-100 text-slate-700"
        }`}
    >
      {normalised.charAt(0).toUpperCase() + normalised.slice(1)}
    </span>
  );
}

/**
 * Treats null/empty and "epoch" placeholder dates (e.g. 1970-01-01, which is
 * what a lot of backends emit for an unset datetime column) as "no date".
 */
function hasRealDate(d: string | null | undefined): boolean {
  if (!d) return false;
  const parsed = new Date(d);
  if (isNaN(parsed.getTime())) return false;
  return parsed.getFullYear() > 1970;
}

function formatDate(d: string | null) {
  if (!hasRealDate(d)) return "—";
  return new Date(d as string).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatCurrency(value: number | null | undefined | string) {
  let n = Number(value);
  if (isNaN(n) && typeof value === "string")
    n = parseFloat(value.replace(/[^0-9.-]+/g, "")) || 0;
  if (value == null || isNaN(n)) n = 0;
  return n.toLocaleString("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

/**
 * Calculate percentage received: (payment_received + solicitor_fee) / (hire + storage) * 100
 * Returns null if any required value is missing (null/undefined)
 */
function calculatePercentageReceived(inv: ClaimInvoice): number | null {
  // Check if we have all required values
  if (inv.rent_bill == null && inv.storage_bill == null) return null;
  if (inv.payment_received == null && inv.solicitor_fee == null) return null;
  
  const hireStorageTotal = (inv.rent_bill || 0) + (inv.storage_bill || 0);
  if (hireStorageTotal === 0) return null;
  
  const totalReceived = (inv.payment_received || 0);
  if (totalReceived === 0) return 0;
  
  return (totalReceived / hireStorageTotal) * 100;
}

/**
 * Format percentage for display
 */
function formatPercentage(inv: ClaimInvoice): string {
  const percentage = calculatePercentageReceived(inv);
  if (percentage === null) return "—";
  return `${percentage.toFixed(1)}%`;
}

/**
 * Always convert a YYYY-MM-DD date from frontend into ISO datetime at 00:00:00
 * e.g. "2026-07-04" -> "2026-07-04T00:00:00"
 */
function toMidnightDateTime(dateValue: string) {
  return `${dateValue}T00:00:00`;
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function InvoiceManagementPage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"claim" | "longhire">("claim");

  const [claimInvoices, setClaimInvoices] = useState<ClaimInvoice[]>([]);
  const [loadingClaim, setLoadingClaim] = useState(true);
  const [errorClaim, setErrorClaim] = useState<string | null>(null);

  const [longHireInvoices, setLongHireInvoices] = useState<LongHireInvoice[]>([]);
  const [loadingLongHire, setLoadingLongHire] = useState(true);
  const [errorLongHire, setErrorLongHire] = useState<string | null>(null);

  // Offers data for deriving offer-based status
  const [allOffers, setAllOffers] = useState<OfferRecord[]>([]);

  // Claim invoice editing
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState({
    status: "" as InvoiceStatus,
    info: "",
    storage_bill: "",
    rent_bill: "",
    user_name: "",
    payment_amount: "",
    payment_date: "",
    solicitor_fee: "",
    invoice_datetime: "",
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Long hire editing
  const [editingLongHireId, setEditingLongHireId] = useState<number | null>(null);
  const [editLongHireFormData, setEditLongHireFormData] = useState({ payment_date: "" });
  const [savingLongHire, setSavingLongHire] = useState(false);
  const [saveLongHireError, setSaveLongHireError] = useState<string | null>(null);

  // ── "Mark paid" modal state ────────────────────────────────────────────────
  const [markPaidInvoice, setMarkPaidInvoice] = useState<ClaimInvoice | null>(null);
  const [markPaidAmount, setMarkPaidAmount] = useState("");
  const [markPaidDate, setMarkPaidDate] = useState("");
  const [markPaidError, setMarkPaidError] = useState<string | null>(null);
  const [markPaidSaving, setMarkPaidSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [filterClaimId, setFilterClaimId] = useState("");
  const [filterClaimant, setFilterClaimant] = useState("");
  const [filterSentBy, setFilterSentBy] = useState("");
  const [filterHirer, setFilterHirer] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    claim_id: "",
    claimant_name: "",
    storage_bill: "",
    rent_bill: "",
    user_name: "",
    payment_amount: "",
    payment_date: "",
    solicitor_fee: "",
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [sortConfig, setSortConfig] = useState<SortConfig>(null);

  // ── Offers map for deriving status from latest offer ──
  const offersMap = useMemo(() => {
    const map = new Map<string, OfferRecord>();
    for (const o of allOffers) {
      map.set(o.claim_id, o);
    }
    return map;
  }, [allOffers]);

  // ─── Fetch helpers ─────────────────────────────────────────────────────────
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

  const fetchOffers = async () => {
    try {
      const res = await api.get("/api/offers", { headers: { requiresAuth: true } });
      setAllOffers(res.data.data || []);
    } catch {
      setAllOffers([]);
    }
  };

  useEffect(() => {
    fetchClaimInvoices();
    fetchLongHireInvoices();
    fetchOffers();
  }, []);

  // ─── Mark-paid modal handlers ──────────────────────────────────────────────
  const startMarkPaid = (inv: ClaimInvoice) => {
    const hireStorageTotal = (inv.rent_bill || 0) + (inv.storage_bill || 0);
    setMarkPaidInvoice(inv);
    setMarkPaidAmount(hireStorageTotal ? String(hireStorageTotal) : "");
    setMarkPaidDate("");
    setMarkPaidError(null);
    if (editingId === inv.id) cancelEdit();
  };

  const cancelMarkPaid = () => {
    setMarkPaidInvoice(null);
    setMarkPaidAmount("");
    setMarkPaidDate("");
    setMarkPaidError(null);
  };

  const canSubmitMarkPaid =
    markPaidAmount.trim() !== "" &&
    !isNaN(Number(markPaidAmount)) &&
    markPaidDate.trim() !== "";

  const confirmMarkPaid = async () => {
    const inv = markPaidInvoice;
    if (!inv) return;
    if (!canSubmitMarkPaid) {
      setMarkPaidError("Enter a payment amount and date.");
      return;
    }
    if (!inv.claim_id) {
      setMarkPaidError("No Claim ID.");
      return;
    }
    const amount = Number(markPaidAmount);
    setMarkPaidSaving(true);
    setMarkPaidError(null);
    try {
      const res = await api.post(
        "/api/offers",
        {
          claim_id: inv.claim_id,
          offer: {
            amount: amount,
            date: markPaidDate,
            status: "paid",
          },
        },
        { headers: { requiresAuth: true } }
      );
      if (!res.data.success) throw new Error(res.data.message || "Failed.");
      const solicitorFee = amount * 0.15;
      // Optimistic, in-place update only — no refetch, so the row stays exactly
      // where it is (same page, same sort position context) instead of vanishing.
      setClaimInvoices((prev) =>
        prev.map((item) =>
          item.id === inv.id
            ? {
              ...item,
              payment_received: amount,
              date_received: markPaidDate,
              solicitor_fee: solicitorFee,
            }
            : item
        )
      );
      cancelMarkPaid();
    } catch (err: any) {
      setMarkPaidError(err.response?.data?.message || err.message || "Failed.");
    } finally {
      setMarkPaidSaving(false);
    }
  };

  // ─── Create claim invoice ─────────────────────────────────────────────────
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
        solicitor_fee: createFormData.solicitor_fee ? Number(createFormData.solicitor_fee) : null,
      };
      const res = await api.post("/api/invoice", payload, { headers: { requiresAuth: true } });
      const newRecord: ClaimInvoice = res.data.data ?? {
        id: res.data.id ?? Date.now(),
        claim_type: null,
        invoice_datetime: new Date().toISOString(),
        info: null,
        docs: null,
        hire_days: null,
        status: null,
        payment_received: null,
        date_received: null,
        ...payload,
      };
      setClaimInvoices((prev) => [newRecord, ...prev]);
      setCreateFormData({
        claim_id: "",
        claimant_name: "",
        storage_bill: "",
        rent_bill: "",
        user_name: "",
        payment_amount: "",
        payment_date: "",
        solicitor_fee: "",
      });
      setShowCreateForm(false);
    } catch (err: any) {
      setCreateError(err.response?.data?.message || "Failed to create invoice.");
    } finally {
      setCreating(false);
    }
  };

  // ─── Claim invoice edit handlers ──────────────────────────────────────────
  const startEditing = (inv: ClaimInvoice) => {
    setEditingId(inv.id);
    setEditFormData({
      status: (inv.status?.toLowerCase() as InvoiceStatus) || "",
      info: inv.info || "",
      storage_bill: inv.storage_bill?.toString() || "",
      rent_bill: inv.rent_bill?.toString() || "",
      user_name: inv.user_name || "",
      payment_amount: inv.payment_amount || "",
      payment_date: inv.payment_date ? inv.payment_date.slice(0, 10) : "",
      solicitor_fee: inv.solicitor_fee?.toString() || "",
      invoice_datetime: hasRealDate(inv.invoice_datetime)
        ? (inv.invoice_datetime as string).slice(0, 10)
        : "",
    });
    setSaveError(null);
    if (markPaidInvoice?.id === inv.id) cancelMarkPaid();
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditFormData({
      status: "",
      info: "",
      storage_bill: "",
      rent_bill: "",
      user_name: "",
      payment_amount: "",
      payment_date: "",
      solicitor_fee: "",
      invoice_datetime: "",
    });
    setSaveError(null);
  };

  const handleSaveEdit = async (invoiceId: number) => {
    setSaving(true);
    setSaveError(null);
    try {
      const payload = {
        status: editFormData.status || null,
        info: editFormData.info.trim() || null,
        storage_bill: editFormData.storage_bill ? Number(editFormData.storage_bill) : null,
        rent_bill: editFormData.rent_bill ? Number(editFormData.rent_bill) : null,
        user_name: editFormData.user_name.trim() || null,
        payment_amount: editFormData.payment_amount.trim() || null,
        payment_date: editFormData.payment_date.trim() || null,
        solicitor_fee: editFormData.solicitor_fee ? Number(editFormData.solicitor_fee) : null,
      };

      const res = await api.put(`/api/invoice/${invoiceId}`, payload, {
        headers: { requiresAuth: true },
      });
      if (!res.data.success) throw new Error(res.data.message || "Update failed");

      // Update invoice datetime through dedicated endpoint with fixed 00:00:00 time
      if (editFormData.invoice_datetime.trim()) {
        const datetimeRes = await api.put(
          `/api/invoice/${invoiceId}/datetime`,
          {
            invoice_datetime: toMidnightDateTime(editFormData.invoice_datetime.trim()),
          },
          { headers: { requiresAuth: true } }
        );
        if (!datetimeRes.data.success) {
          throw new Error(datetimeRes.data.message || "Failed to update invoice date");
        }
      }

      // Optimistic, in-place update only — no refetch of the whole list, so the
      // page doesn't reset and the row you just edited stays visible right where it was.
      setClaimInvoices((prev) =>
        prev.map((inv) =>
          inv.id === invoiceId
            ? {
              ...inv,
              ...payload,
              invoice_datetime: editFormData.invoice_datetime
                ? toMidnightDateTime(editFormData.invoice_datetime)
                : inv.invoice_datetime,
            }
            : inv
        )
      );
      cancelEdit();
    } catch (err: any) {
      setSaveError(err.response?.data?.message || err.message || "Failed to update invoice.");
    } finally {
      setSaving(false);
    }
  };

  // ─── Long hire edit handlers ───────────────────────────────────────────────
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

  const saveLongHirePaymentDate = async (inv: LongHireInvoice, dateValue: string | null) => {
    if (!inv.claim_id) { setSaveLongHireError("No Claim ID on this record."); return; }
    setSavingLongHire(true);
    setSaveLongHireError(null);
    try {
      const res = await api.post(
        "/api/long_hire_invoice/update_payment_date",
        { claim_id: inv.claim_id, payment_date: dateValue || null },
        { headers: { requiresAuth: true } }
      );
      if (!res.data.success) throw new Error(res.data.message || "Update failed");
      setLongHireInvoices((prev) =>
        prev.map((item) => (item.id === inv.id ? { ...item, payment_date: dateValue } : item))
      );
      cancelEditLongHire();
    } catch (err: any) {
      setSaveLongHireError(err.response?.data?.message || "Failed to update payment date.");
    } finally {
      setSavingLongHire(false);
    }
  };

  const handleSaveLongHireEdit = (inv: LongHireInvoice) =>
    saveLongHirePaymentDate(inv, editLongHireFormData.payment_date.trim() || null);
  const handleClearLongHirePaymentDate = (inv: LongHireInvoice) =>
    saveLongHirePaymentDate(inv, null);

  // ─── Sorting ───────────────────────────────────────────────────────────────
  const handleSort = (key: string) => {
    setSortConfig((prev) => ({
      key,
      direction: prev?.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  // Generic sorter used for both tabs. Handles the special derived columns
  // (hire+storage total, effective status, sent status, numeric-looking
  // payment_amount strings) so every column header reliably sorts.
  const sortData = <T extends Record<string, any>>(data: T[]): T[] => {
    if (!sortConfig) return data;
    const { key, direction } = sortConfig;

    const getValue = (row: T) => {
      if (key === "hire_storage_total") {
        return (row.storage_bill || 0) + (row.rent_bill || 0);
      }
      if (key === "percentage_received") {
        if (!("payment_received" in row)) return -1;
        const percentage = calculatePercentageReceived(row as unknown as ClaimInvoice);
        return percentage !== null ? percentage : -1;
      }
      if (key === "status" && "payment_received" in row) {
        // Use offer-based status (paid/accepted/rejected from latest offer)
        return effectiveStatus(row as unknown as ClaimInvoice, offersMap) || "";
      }
      if (key === "sent_status" && "invoice_datetime" in row) {
        return sentStatus(row as unknown as ClaimInvoice);
      }
      if (key === "payment_amount") {
        const v = row[key];
        return typeof v === "string"
          ? parseFloat(v.replace(/[^0-9.-]+/g, "")) || 0
          : v || 0;
      }
      if (key === "amount" || key === "payment_received" || key === "solicitor_fee") {
        return row[key] ?? 0;
      }
      return row[key];
    };

    return [...data].sort((a, b) => {
      const valA = getValue(a);
      const valB = getValue(b);

      if (valA === valB) return 0;
      if (valA == null || valA === "" || valA === -1) return direction === "asc" ? -1 : 1;
      if (valB == null || valB === "" || valB === -1) return direction === "asc" ? 1 : -1;

      if (typeof valA === "string" && typeof valB === "string") {
        return direction === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return direction === "asc" ? (valA < valB ? -1 : 1) : valA > valB ? -1 : 1;
    });
  };

  // ─── Filtering ─────────────────────────────────────────────────────────────
  const filteredClaimInvoices = claimInvoices.filter((inv) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !search ||
      String(inv.id).includes(search) ||
      inv.claim_id?.toLowerCase().includes(q) ||
      inv.claimant_name?.toLowerCase().includes(q) ||
      inv.user_name?.toLowerCase().includes(q);
    return (
      matchesSearch &&
      (!filterClaimId || inv.claim_id?.toLowerCase().includes(filterClaimId.toLowerCase())) &&
      (!filterClaimant ||
        inv.claimant_name?.toLowerCase().includes(filterClaimant.toLowerCase())) &&
      (!filterSentBy ||
        inv.user_name?.toLowerCase().includes(filterSentBy.toLowerCase())) &&
      (!filterStatus || effectiveStatus(inv, offersMap)?.toLowerCase() === filterStatus.toLowerCase())
    );
  });

  const filteredLongHireInvoices = longHireInvoices.filter((inv) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !search ||
      String(inv.id).includes(search) ||
      inv.claim_id?.toLowerCase().includes(q) ||
      inv.hirer_name?.toLowerCase().includes(q) ||
      inv.user_name?.toLowerCase().includes(q);
    return (
      matchesSearch &&
      (!filterClaimId || inv.claim_id?.toLowerCase().includes(filterClaimId.toLowerCase())) &&
      (!filterHirer || inv.hirer_name?.toLowerCase().includes(filterHirer.toLowerCase())) &&
      (!filterSentBy || inv.user_name?.toLowerCase().includes(filterSentBy.toLowerCase()))
    );
  });

  const sortedClaimInvoices = sortData(filteredClaimInvoices);
  const sortedLongHireInvoices = sortData(filteredLongHireInvoices);

  // ─── Summary totals (based on the currently filtered claim invoices) ──────
  const summaryTotals = useMemo(() => {
    let hireStorage = 0;
    let paymentReceived = 0;
    let solicitorFees = 0;
    let totalReceived = 0;
    let validCount = 0;
    let totalPercentage = 0;
    
    for (const inv of sortedClaimInvoices) {
      const hs = (inv.rent_bill || 0) + (inv.storage_bill || 0);
      hireStorage += hs;
      paymentReceived += inv.payment_received || 0;
      solicitorFees += inv.solicitor_fee || 0;
      totalReceived += (inv.payment_received || 0) + (inv.solicitor_fee || 0);
      
      const percentage = calculatePercentageReceived(inv);
      if (percentage !== null) {
        validCount++;
        totalPercentage += percentage;
      }
    }
    const outstanding = paymentReceived - hireStorage;
    const overallPercentage = hireStorage > 0 ? (totalReceived / hireStorage) * 100 : 0;
    const avgPercentage = validCount > 0 ? totalPercentage / validCount : 0;
    
    return { 
      hireStorage, 
      paymentReceived, 
      solicitorFees, 
      outstanding, 
      totalReceived, 
      overallPercentage,
      avgPercentage,
      validCount 
    };
  }, [sortedClaimInvoices]);

  const isClaimTab = activeTab === "claim";
  const isLoading = isClaimTab ? loadingClaim : loadingLongHire;
  const error = isClaimTab ? errorClaim : errorLongHire;
  const filteredCount = isClaimTab ? sortedClaimInvoices.length : sortedLongHireInvoices.length;
  const totalCount = isClaimTab ? claimInvoices.length : longHireInvoices.length;

  const goToClaim = (claimId: string | null) => {
    if (!claimId) return;

    window.open(`/claim/${encodeURIComponent(claimId)}`, "_blank");
  };
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
        className={`sticky top-0 z-10 bg-green-100 px-2 py-1.5 text-[10px] font-semibold text-green-800 border-r border-b border-gray-400 cursor-pointer hover:bg-green-200/70 transition-colors select-none group whitespace-nowrap`}
        onClick={() => handleSort(sortKey)}
      >
        <div
          className={`flex items-center gap-0.5 ${align === "right"
            ? "justify-end"
            : align === "center"
              ? "justify-center"
              : "justify-start"
            }`}
        >
          {label}
          <span className="text-green-600">
            {isActive ? (
              sortConfig.direction === "asc" ? (
                <ChevronUp size={12} />
              ) : (
                <ChevronDown size={12} />
              )
            ) : (
              <ArrowUpDown
                size={12}
                className="opacity-0 group-hover:opacity-50 transition-opacity"
              />
            )}
          </span>
        </div>
      </th>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50/40">
      <main className="max-w-full mx-auto px-2 sm:px-4 lg:px-6 py-4">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
          <div>
            <h1 className="text-xl font-extrabold text-green-800 tracking-tight">
              Invoice Management
            </h1>
            <p className="mt-0.5 text-sm text-green-700/80">
              Transport / RTA & Long Term Hire invoices
            </p>
          </div>
          <div className="flex gap-2 mt-3 md:mt-0">
            <button
              onClick={() => { fetchClaimInvoices(); fetchLongHireInvoices(); }}
              disabled={isLoading}
              className="px-3 py-1.5 bg-white border border-green-200 text-green-700 rounded-xl hover:bg-green-50 transition disabled:opacity-50 flex items-center gap-1.5 text-xs"
            >
              <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
              Refresh All
            </button>
          </div>
        </div>

        {/* Summary boxes (claim invoices only) */}
        {isClaimTab && (
          <div className="mb-4 grid grid-cols-3 lg:grid-cols-8 gap-2">
            <div className="bg-white/80 border border-green-100 rounded-xl px-3 py-2 shadow-sm">
              <p className="text-[9px] font-medium text-green-700/70 uppercase tracking-wide">
                Invoice Sent
              </p>
              <p className="text-sm font-bold text-blue-800 mt-0.5">
                {claimInvoices.filter((inv) => sentStatus(inv) === "SE").length}
              </p>
            </div>
            <div className="bg-white/80 border border-green-100 rounded-xl px-3 py-2 shadow-sm">
              <p className="text-[9px] font-medium text-green-700/70 uppercase tracking-wide">
                Invoice Pending
              </p>
              <p className="text-sm font-bold text-amber-800 mt-0.5">
                {claimInvoices.filter((inv) => sentStatus(inv) === "NS").length}
              </p>
            </div>
            <div className="bg-white/80 border border-green-100 rounded-xl px-3 py-2 shadow-sm">
              <p className="text-[9px] font-medium text-green-700/70 uppercase tracking-wide">
                Hire + Storage
              </p>
              <p className="text-sm font-bold text-green-800 mt-0.5">
                {formatCurrency(summaryTotals.hireStorage)}
              </p>
            </div>
            <div className="bg-white/80 border border-green-100 rounded-xl px-3 py-2 shadow-sm">
              <p className="text-[9px] font-medium text-green-700/70 uppercase tracking-wide">
                Payment Received
              </p>
              <p className="text-sm font-bold text-green-800 mt-0.5">
                {formatCurrency(summaryTotals.paymentReceived)}
              </p>
            </div>
            <div className="bg-white/80 border border-green-100 rounded-xl px-3 py-2 shadow-sm">
              <p className="text-[9px] font-medium text-green-700/70 uppercase tracking-wide">
                Fees
              </p>
              <p className="text-sm font-bold text-green-800 mt-0.5">
                {formatCurrency(summaryTotals.solicitorFees)}
              </p>
            </div>
            <div className="bg-white/80 border border-green-100 rounded-xl px-3 py-2 shadow-sm">
              <p className="text-[9px] font-medium text-green-700/70 uppercase tracking-wide">
                Total Received
              </p>
              <p className="text-sm font-bold text-green-800 mt-0.5">
                {formatCurrency(summaryTotals.totalReceived)}
              </p>
            </div>
            <div className="bg-white/80 border border-green-100 rounded-xl px-3 py-2 shadow-sm">
              <p className="text-[9px] font-medium text-green-700/70 uppercase tracking-wide">
                Overall %
              </p>
              <p className="text-sm font-bold text-green-800 mt-0.5">
                {summaryTotals.hireStorage > 0 ? `${summaryTotals.overallPercentage.toFixed(1)}%` : "—"}
              </p>
            </div>
            <div className="bg-white/80 border border-green-100 rounded-xl px-3 py-2 shadow-sm">
              <p className="text-[9px] font-medium text-green-700/70 uppercase tracking-wide">
                Avg % (valid)
              </p>
              <p className="text-sm font-bold text-green-800 mt-0.5">
                {summaryTotals.validCount > 0 ? `${summaryTotals.avgPercentage.toFixed(1)}%` : "—"}
              </p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-4 border-b border-green-200">
          <div className="flex space-x-6">
            {(["claim", "longhire"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setSortConfig(null); }}
                className={`pb-2 px-1 text-sm font-medium transition-colors ${activeTab === tab
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
          <div className="mb-6 bg-white/80 backdrop-blur-md shadow-xl rounded-2xl border border-green-100/60 p-4">
            <h2 className="text-lg font-bold text-green-800 mb-4">Create New Hire Invoice</h2>
            <form onSubmit={handleCreateClaimInvoice} className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {[
                { label: "Claim ID", key: "claim_id", placeholder: "TC123", type: "text" },
                { label: "Claimant Name", key: "claimant_name", placeholder: "Muhammad Ahmed", type: "text" },
                { label: "Storage Bill (£)", key: "storage_bill", placeholder: "0", type: "number" },
                { label: "Rent Bill (£)", key: "rent_bill", placeholder: "0", type: "number" },
                { label: "Solicitor Fee (£)", key: "solicitor_fee", placeholder: "0", type: "number" },
                { label: "Sent By (optional)", key: "user_name", placeholder: "Your name", type: "text" },
                { label: "Payment Amount (optional)", key: "payment_amount", placeholder: "e.g. £500", type: "text" },
              ].map(({ label, key, placeholder, type }) => (
                <div key={key}>
                  <label className="block text-[10px] font-medium text-gray-700 mb-0.5">{label}</label>
                  <input
                    type={type}
                    value={createFormData[key as keyof typeof createFormData]}
                    onChange={(e) =>
                      setCreateFormData((p) => ({ ...p, [key]: e.target.value }))
                    }
                    placeholder={placeholder}
                    className="w-full px-2 py-1.5 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-400 bg-white/70 text-xs"
                  />
                </div>
              ))}
              <div>
                <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
                  Payment Date (optional)
                </label>
                <input
                  type="date"
                  value={createFormData.payment_date}
                  onChange={(e) =>
                    setCreateFormData((p) => ({ ...p, payment_date: e.target.value }))
                  }
                  className="w-full px-2 py-1.5 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-400 bg-white/70 text-xs"
                />
              </div>
              <div className="md:col-span-4 flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-1.5 border border-green-200 text-green-700 rounded-lg hover:bg-green-50 transition text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-1.5 px-5 rounded-full shadow flex items-center gap-2 disabled:opacity-60 text-xs"
                >
                  {creating ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create"
                  )}
                </button>
              </div>
              {createError && (
                <p className="md:col-span-4 text-red-600 text-center text-xs mt-1">
                  {createError}
                </p>
              )}
            </form>
          </div>
        )}

        {/* Filters */}
        <div className="mb-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Quick search..."
            className="px-2 py-1.5 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-400 bg-white/70 text-xs"
          />
          <input
            type="text"
            value={filterClaimId}
            onChange={(e) => setFilterClaimId(e.target.value)}
            placeholder="Filter Claim ID"
            className="px-2 py-1.5 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-400 bg-white/70 text-xs"
          />
          {isClaimTab ? (
            <>
              <input
                type="text"
                value={filterClaimant}
                onChange={(e) => setFilterClaimant(e.target.value)}
                placeholder="Filter Claimant"
                className="px-2 py-1.5 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-400 bg-white/70 text-xs"
              />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-2 py-1.5 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-400 bg-white/70 text-xs text-gray-600"
              >
                <option value="">All Statuses</option>
                <option value="paid">Paid</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
                <option value="">No Status / Null</option>
              </select>
              <input
                type="text"
                value={filterSentBy}
                onChange={(e) => setFilterSentBy(e.target.value)}
                placeholder="Filter Sent By"
                className="px-2 py-1.5 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-400 bg-white/70 text-xs"
              />
            </>
          ) : (
            <>
              <input
                type="text"
                value={filterHirer}
                onChange={(e) => setFilterHirer(e.target.value)}
                placeholder="Filter Hirer Name"
                className="px-2 py-1.5 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-400 bg-white/70 text-xs"
              />
              <input
                type="text"
                value={filterSentBy}
                onChange={(e) => setFilterSentBy(e.target.value)}
                placeholder="Filter Sent By"
                className="px-2 py-1.5 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-400 bg-white/70 text-xs"
              />
            </>
          )}
          <div className="text-[10px] font-medium text-green-700 bg-white border border-green-200 rounded-lg px-2 py-1.5 flex items-center justify-center">
            {filteredCount} / {totalCount}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-2 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
            {error}
          </div>
        )}

        {/* Table */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-10 h-10 text-green-600 animate-spin" />
          </div>
        ) : (isClaimTab ? sortedClaimInvoices : sortedLongHireInvoices).length === 0 ? (
          <div className="text-center py-10 bg-white/60 rounded-2xl border border-green-100 shadow text-xs text-green-700/80">
            {search ||
              filterClaimId ||
              filterSentBy ||
              filterStatus ||
              (isClaimTab ? filterClaimant : filterHirer)
              ? "No matching invoices"
              : `No ${isClaimTab ? "claim" : "long term hire"} invoices yet`}
          </div>
        ) : (
          <div className="bg-white/85 backdrop-blur-sm border border-green-100 rounded-xl shadow overflow-hidden">
            {/* Scrollable body with a sticky header — header always stays visible while scrolling */}
            <div className="overflow-auto max-h-[65vh]">
              <table className="min-w-full divide-y divide-gray-300 text-[10px] border-collapse table-auto">
                <thead>
                  <tr>
                    {isClaimTab ? (
                      <>
                        <SortHeader label="Status" sortKey="status" align="center" />
                        <SortHeader label="Sent" sortKey="sent_status" align="center" />
                        <SortHeader label="Claim ID" sortKey="claim_id" />
                        <SortHeader label="Claimant" sortKey="claimant_name" />
                        <SortHeader label="Type" sortKey="claim_type" />
                        <SortHeader label="Date Sent" sortKey="invoice_datetime" />
                        <SortHeader label="Sent By" sortKey="user_name" />
                        <SortHeader label="Hire+Storage" sortKey="hire_storage_total" align="right" />
                        <SortHeader label="Fees" sortKey="solicitor_fee" align="right" />
                        <SortHeader label="Paid" sortKey="payment_received" align="right" />
                        <SortHeader label="Date Rec" sortKey="date_received" />
                        <SortHeader label="%" sortKey="percentage_received" align="center" />
                        <th className="sticky top-0 z-10 bg-green-100 px-2 py-1.5 text-center font-semibold text-green-800 border-b border-gray-400 whitespace-nowrap text-[10px]">
                          Actions
                        </th>
                      </>
                    ) : (
                      <>
                        <SortHeader label="Claim ID" sortKey="claim_id" />
                        <SortHeader label="Hirer" sortKey="hirer_name" />
                        <SortHeader label="Date Sent" sortKey="date_sent" />
                        <SortHeader label="Sent By" sortKey="user_name" />
                        <SortHeader label="Amount" sortKey="amount" align="right" />
                        <SortHeader label="Payment Date" sortKey="payment_date" />
                        <th className="sticky top-0 z-10 bg-green-100 px-2 py-1.5 text-center font-semibold text-green-800 border-b border-gray-400 whitespace-nowrap text-[10px]">
                          Actions
                        </th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {isClaimTab
                    ? sortedClaimInvoices.map((inv) => {
                      const isEditing = editingId === inv.id;
                      const isMarkingPaid = markPaidInvoice?.id === inv.id;
                      const canMarkPaid =
                        inv.payment_received == null && inv.date_received == null;
                      const hireStorageTotal =
                        (inv.rent_bill || 0) + (inv.storage_bill || 0);
                      const derivedStatus = effectiveStatus(inv, offersMap);
                      const derivedSentStatus = sentStatus(inv);
                      const percentage = calculatePercentageReceived(inv);

                      return (
                        <tr
                          key={inv.id}
                          className={`transition-colors ${isMarkingPaid ? "bg-emerald-50/60" : "hover:bg-green-50/30"
                            }`}
                        >
                          {/* Status */}
                          <td className="px-2 py-1.5 border-r border-gray-300 text-center whitespace-nowrap">
                            {isEditing ? (
                              <select
                                value={editFormData.status}
                                onChange={(e) =>
                                  setEditFormData((p) => ({
                                    ...p,
                                    status: e.target.value as InvoiceStatus,
                                  }))
                                }
                                className="px-1 py-0.5 border border-green-300 rounded text-[10px] focus:outline-none focus:ring-1 focus:ring-green-500 bg-white"
                              >
                                {STATUS_OPTIONS.map((opt) => (
                                  <option key={opt} value={opt}>
                                    {opt === "" ? "—" : opt}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              statusBadge(derivedStatus)
                            )}
                          </td>

                          {/* Sent Status */}
                          <td className="px-2 py-1.5 border-r border-gray-300 text-center whitespace-nowrap">
                            {sentStatusBadge(derivedSentStatus)}
                          </td>

                          {/* Claim ID */}
                          <td className="px-2 py-1.5 border-r border-gray-300 whitespace-nowrap font-medium">
                            {inv.claim_id ? (
                              <button
                                onClick={() => goToClaim(inv.claim_id)}
                                className="text-green-700 hover:text-green-900 underline underline-offset-2 decoration-green-300 hover:decoration-green-600 transition-colors text-[10px]"
                                title={`Open claim ${inv.claim_id}`}
                              >
                                {inv.claim_id}
                              </button>
                            ) : (
                              "—"
                            )}
                          </td>

                          {/* Claimant */}
                          <td className="px-2 py-1.5 border-r border-gray-300 truncate max-w-[100px] text-[10px]">
                            {inv.claimant_name?.toUpperCase() || "—"}
                          </td>

                          {/* Claim Type */}
                          <td className="px-2 py-1.5 border-r border-gray-300 whitespace-nowrap text-[10px]">
                            {inv.claim_type?.toUpperCase() || "—"}
                          </td>

                          {/* Date Sent */}
                          <td className="px-2 py-1.5 border-r border-gray-300 whitespace-nowrap text-[10px]">
                            {isEditing ? (
                              <input
                                type="date"
                                value={editFormData.invoice_datetime}
                                onChange={(e) =>
                                  setEditFormData((p) => ({
                                    ...p,
                                    invoice_datetime: e.target.value,
                                  }))
                                }
                                className="px-1 py-0.5 border border-green-300 rounded text-[10px] focus:outline-none focus:ring-1 focus:ring-green-500 bg-white"
                              />
                            ) : (
                              formatDate(inv.invoice_datetime)
                            )}
                          </td>

                          {/* Sent By */}
                          <td className="px-2 py-1.5 border-r border-gray-300 text-[10px]">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editFormData.user_name}
                                onChange={(e) =>
                                  setEditFormData((p) => ({
                                    ...p,
                                    user_name: e.target.value,
                                  }))
                                }
                                className="w-full px-1 py-0.5 border border-green-300 rounded text-[10px] focus:outline-none focus:ring-1 focus:ring-green-500"
                                placeholder="Name"
                              />
                            ) : (
                              <span className="truncate block max-w-[80px]">
                                {inv.user_name?.toUpperCase() || "—"}
                              </span>
                            )}
                          </td>

                          {/* Hire + Storage */}
                          <td className="px-2 py-1.5 text-right border-r border-gray-300 font-medium whitespace-nowrap text-[10px]">
                            {isEditing ? (
                              <div className="flex flex-col gap-0.5 items-end">
                                <div className="flex items-center gap-0.5">
                                  <span className="text-slate-400 text-[8px]">Hire</span>
                                  <input
                                    type="number"
                                    value={editFormData.rent_bill}
                                    onChange={(e) =>
                                      setEditFormData((p) => ({
                                        ...p,
                                        rent_bill: e.target.value,
                                      }))
                                    }
                                    className="w-14 text-right px-1 py-0.5 border border-green-300 rounded text-[10px] focus:outline-none focus:ring-1 focus:ring-green-500"
                                    placeholder="0"
                                  />
                                </div>
                                <div className="flex items-center gap-0.5">
                                  <span className="text-slate-400 text-[8px]">Storage</span>
                                  <input
                                    type="number"
                                    value={editFormData.storage_bill}
                                    onChange={(e) =>
                                      setEditFormData((p) => ({
                                        ...p,
                                        storage_bill: e.target.value,
                                      }))
                                    }
                                    className="w-14 text-right px-1 py-0.5 border border-green-300 rounded text-[10px] focus:outline-none focus:ring-1 focus:ring-green-500"
                                    placeholder="0"
                                  />
                                </div>
                              </div>
                            ) : (
                              <span>{formatCurrency(hireStorageTotal)}</span>
                            )}
                          </td>

                          {/* Solicitor Fee */}
                          <td className="px-2 py-1.5 text-right border-r border-gray-300 font-medium whitespace-nowrap text-[10px]">
                            <span className={inv.solicitor_fee ? "" : "text-slate-400"}>
                              {inv.solicitor_fee != null
                                ? formatCurrency(inv.solicitor_fee)
                                : "—"}
                            </span>
                          </td>

                          {/* Payment Received */}
                          <td className="px-2 py-1.5 border-r border-gray-300 text-right whitespace-nowrap text-[10px]">
                            <span
                              className={`font-medium ${inv.payment_received ? "text-green-700" : "text-slate-400"
                                }`}
                            >
                              {inv.payment_received != null
                                ? formatCurrency(inv.payment_received * 0.85)
                                : "—"}
                            </span>
                          </td>

                          {/* Date Received */}
                          <td className="px-2 py-1.5 border-r border-gray-300 whitespace-nowrap text-[10px]">
                            <span
                              className={
                                hasRealDate(inv.date_received)
                                  ? "text-green-700 font-medium"
                                  : "text-slate-400"
                              }
                            >
                              {formatDate(inv.date_received)}
                            </span>
                          </td>

                          {/* Percentage Received */}
                          <td className="px-2 py-1.5 border-r border-gray-300 text-center whitespace-nowrap text-[10px]">
                            {percentage !== null ? (
                              <span
                                className={`font-semibold ${
                                  percentage >= 100
                                    ? "text-green-700"
                                    : percentage > 0
                                    ? "text-amber-600"
                                    : "text-slate-400"
                                }`}
                              >
                                {percentage.toFixed(1)}%
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-2 py-1.5 text-center min-w-[70px] whitespace-nowrap">
                            {isEditing ? (
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => handleSaveEdit(inv.id)}
                                  disabled={saving}
                                  className="text-green-600 hover:text-green-800 disabled:opacity-50"
                                  title="Save"
                                >
                                  {saving ? (
                                    <Loader2 size={12} className="animate-spin" />
                                  ) : (
                                    <Check size={14} />
                                  )}
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  disabled={saving}
                                  className="text-red-600 hover:text-red-800 disabled:opacity-50"
                                  title="Cancel"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => startEditing(inv)}
                                  className="text-green-600 hover:text-green-800"
                                  title="Edit invoice"
                                >
                                  <Edit2 size={14} />
                                </button>
                                {canMarkPaid && (
                                  <button
                                    onClick={() => startMarkPaid(inv)}
                                    className="text-emerald-600 hover:text-emerald-800"
                                    title="Mark as paid"
                                  >
                                    <Banknote size={14} />
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                    : sortedLongHireInvoices.map((inv) => {
                      const isEditingLH = editingLongHireId === inv.id;
                      return (
                        <tr
                          key={inv.id}
                          className="hover:bg-green-50/30 transition-colors"
                        >
                          <td className="px-2 py-1.5 border-r border-gray-300 whitespace-nowrap text-[10px]">
                            {inv.claim_id ? (
                              <button
                                onClick={() => goToClaim(inv.claim_id)}
                                className="text-green-700 hover:text-green-900 underline underline-offset-2 decoration-green-300 hover:decoration-green-600 transition-colors text-[10px]"
                                title={`Open claim ${inv.claim_id}`}
                              >
                                {inv.claim_id}
                              </button>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-2 py-1.5 border-r border-gray-300 truncate max-w-[120px] text-[10px]">
                            {inv.hirer_name || "—"}
                          </td>
                          <td className="px-2 py-1.5 border-r border-gray-300 whitespace-nowrap text-[10px]">
                            {formatDate(inv.date_sent)}
                          </td>
                          <td className="px-2 py-1.5 border-r border-gray-300 truncate max-w-[100px] text-[10px]">
                            {inv.user_name || "—"}
                          </td>
                          <td className="px-2 py-1.5 text-right border-r border-gray-300 font-medium whitespace-nowrap text-[10px]">
                            {formatCurrency(inv.amount)}
                          </td>
                          <td className="px-2 py-1.5 border-r border-gray-300 whitespace-nowrap text-[10px]">
                            {isEditingLH ? (
                              <div className="flex items-center gap-0.5">
                                <input
                                  type="date"
                                  value={editLongHireFormData.payment_date}
                                  onChange={(e) =>
                                    setEditLongHireFormData((p) => ({
                                      ...p,
                                      payment_date: e.target.value,
                                    }))
                                  }
                                  className="px-1 py-0.5 border border-green-300 rounded text-[10px] focus:outline-none focus:ring-1 focus:ring-green-500"
                                />
                                {editLongHireFormData.payment_date && (
                                  <button
                                    onClick={() =>
                                      setEditLongHireFormData((p) => ({
                                        ...p,
                                        payment_date: "",
                                      }))
                                    }
                                    className="text-slate-400 hover:text-red-500 transition-colors"
                                    title="Clear date"
                                  >
                                    <X size={10} />
                                  </button>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center gap-0.5">
                                <span
                                  className={
                                    inv.payment_date
                                      ? "text-green-700 font-medium"
                                      : "text-slate-400"
                                  }
                                >
                                  {formatDate(inv.payment_date)}
                                </span>
                                {inv.payment_date && !isEditingLH && (
                                  <button
                                    onClick={() => handleClearLongHirePaymentDate(inv)}
                                    disabled={savingLongHire}
                                    className="text-slate-300 hover:text-red-400 transition-colors disabled:opacity-40"
                                    title="Clear payment date"
                                  >
                                    <Trash2 size={9} />
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-2 py-1.5 text-center whitespace-nowrap">
                            {isEditingLH ? (
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => handleSaveLongHireEdit(inv)}
                                  disabled={savingLongHire}
                                  className="text-green-600 hover:text-green-800 disabled:opacity-50"
                                  title="Save"
                                >
                                  {savingLongHire ? (
                                    <Loader2 size={12} className="animate-spin" />
                                  ) : (
                                    <Check size={14} />
                                  )}
                                </button>
                                <button
                                  onClick={cancelEditLongHire}
                                  disabled={savingLongHire}
                                  className="text-red-600 hover:text-red-800 disabled:opacity-50"
                                  title="Cancel"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => startEditingLongHire(inv)}
                                className="text-green-600 hover:text-green-800"
                                title="Edit payment date"
                              >
                                <Edit2 size={14} />
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
              <div className="p-2 bg-red-50 border-t border-red-200 text-red-700 text-[10px] text-center">
                {saveError}
              </div>
            )}
            {saveLongHireError && (
              <div className="p-2 bg-red-50 border-t border-red-200 text-red-700 text-[10px] text-center">
                {saveLongHireError}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ─── Mark-as-Paid Modal ────────────────────────────────────────────── */}
      {markPaidInvoice && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => !markPaidSaving && cancelMarkPaid()}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-green-800">Mark Invoice as Paid</h3>
              <button
                onClick={cancelMarkPaid}
                disabled={markPaidSaving}
                className="text-slate-400 hover:text-red-500 disabled:opacity-40"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-[10px] text-green-700/70 mb-3">
              Claim ID:{" "}
              <span className="font-semibold text-green-800">
                {markPaidInvoice.claim_id || "—"}
              </span>
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
                  Payment Amount (£)
                </label>
                <input
                  type="number"
                  value={markPaidAmount}
                  onChange={(e) => {
                    setMarkPaidAmount(e.target.value);
                    setMarkPaidError(null);
                  }}
                  placeholder="0"
                  className="w-full px-2 py-1.5 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-400 bg-white text-xs"
                />
                <p className="mt-0.5 text-[9px] text-slate-400">
                  Defaults to Hire + Storage total — editable.
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
                  Payment Date
                </label>
                <input
                  type="date"
                  value={markPaidDate}
                  onChange={(e) => {
                    setMarkPaidDate(e.target.value);
                    setMarkPaidError(null);
                  }}
                  className="w-full px-2 py-1.5 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-400 bg-white text-xs"
                />
              </div>

              {markPaidError && (
                <p className="text-red-600 text-[10px]">{markPaidError}</p>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={cancelMarkPaid}
                  disabled={markPaidSaving}
                  className="px-3 py-1.5 border border-green-200 text-green-700 rounded-lg hover:bg-green-50 transition text-xs disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmMarkPaid}
                  disabled={!canSubmitMarkPaid || markPaidSaving}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-1.5 px-4 rounded-full shadow flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                >
                  {markPaidSaving ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}