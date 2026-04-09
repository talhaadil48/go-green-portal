"use client";
import { useState, useEffect, FormEvent, ChangeEvent, useRef, useMemo } from "react";
import Link from "next/link";
import api from "@/lib/axios";
import { useRouter } from "next/navigation";
import { Eye, Trash2, Pencil, Check, X, Loader2, Lock, Unlock, Plus, TrendingUp, FileText, Clock, CheckCircle2, AlertCircle, BarChart3, Receipt, Car, Crown, BookOpen, User, LayoutGrid, MessageSquarePlus } from "lucide-react";
import Cookies from "js-cookie";
import { OverviewSkeleton, ClaimsTableSkeleton } from "@/app/components/Loading";

interface Claim {
    claim_id: string;
    claimant_name: string | null;
    claim_type: string | null;
    claim_start_date: string | null;
    invoice_sent: string | null;
    council: string | null;
    invoice_id: string | null;
    info: string | null;
    invoice_datetime: string | null;
    invoice_date: string | null;
    pay_date: string | null;
    hire_start_date: string | null;
    recently_deleted: boolean;
    recently_deleted_date: string | null;
    closed_date: string | null;
    closed_by: string | null;
    deleted_by: string | null;
    status: string;
    hire_end_date: string | null;
    reason: string | null;
    is_disputed: boolean;
    updates?: any[];
}

type SortColumn =
    | "claim_id"
    | "claimant_name"
    | "claim_type"
    | "claim_start_date"
    | "hire_start_date"
    | "pay_date"
    | "hire_end_date"
    | "invoice_date"
    | "council"
    | "status"
    | "closed";

type SortDirection = "asc" | "desc" | null;

const COUNCIL_OPTIONS = [
    { value: "", label: "All Councils" },
    { value: "None", label: "None" },
    { value: "Wolverhampton", label: "Wolverhampton" },
    { value: "East Staffordshire", label: "East Staffordshire" },
    { value: "South Derbyshire", label: "South Derbyshire" },
    { value: "Ashfield", label: "Ashfield" },
    { value: "Lichfield District", label: "Lichfield District" },
    { value: "North West Leicestershire", label: "North West Leicestershire" },
];

const STATUS_COLORS: Record<string, { color: string; number: number; label: string; badgeBg: string; badgeText: string }> = {
    "claim created": { color: "text-gray-900", number: 1, label: "Claim Created", badgeBg: "border-gray-900", badgeText: "bg-gray-900" },
    "hire start": { color: "text-gray-900", number: 2, label: "Hire Start", badgeBg: "border-gray-900", badgeText: "bg-gray-900" },
    "client paid": { color: "text-gray-900", number: 3, label: "Client Paid", badgeBg: "border-gray-900", badgeText: "bg-gray-900" },
    "hire end": { color: "text-[#FA6020]", number: 4, label: "Hire End", badgeBg: "border-[#FA6020]", badgeText: "bg-[#FA6020]" },
    "invoice sent": { color: "text-green-600", number: 5, label: "Invoice Sent", badgeBg: "border-green-600", badgeText: "bg-green-600" },
    default: { color: "text-gray-500", number: 0, label: "Unknown", badgeBg: "border-gray-100", badgeText: "bg-gray-100" },
};

const CLAIM_TYPES = ["taxi", "personal", "learning", "vehicle damage", "sovereign"];

const TYPE_CONFIG: Record<string, { icon: React.ElementType; gradient: string; border: string; text: string; iconBg: string; bar: string }> = {
    taxi: {
        icon: Car,
        gradient: "from-amber-50 via-amber-50 to-orange-50",
        border: "border-amber-200",
        text: "text-amber-900",
        iconBg: "bg-amber-100 text-amber-600",
        bar: "bg-amber-400",
    },
    personal: {
        icon: User,
        gradient: "from-sky-50 via-sky-50 to-blue-50",
        border: "border-sky-200",
        text: "text-sky-900",
        iconBg: "bg-sky-100 text-sky-600",
        bar: "bg-sky-400",
    },
    sovereign: {
        icon: Crown,
        gradient: "from-violet-50 via-violet-50 to-purple-50",
        border: "border-violet-200",
        text: "text-violet-900",
        iconBg: "bg-violet-100 text-violet-600",
        bar: "bg-violet-400",
    },
    learning: {
        icon: BookOpen,
        gradient: "from-teal-50 via-teal-50 to-emerald-50",
        border: "border-teal-200",
        text: "text-teal-900",
        iconBg: "bg-teal-100 text-teal-600",
        bar: "bg-teal-400",
    },
};

export default function ClaimsPage() {
    const [claims, setClaims] = useState<Claim[]>([]);
    const [allClaims, setAllClaims] = useState<Claim[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
    const [sortDirection, setSortDirection] = useState<SortDirection>(null);

    // Filters
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedType, setSelectedType] = useState("");
    const [selectedCouncil, setSelectedCouncil] = useState("");
    const [selectedStage, setSelectedStage] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "Active" | "Non Active" | "Closed">("all");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    // Form / Modal
    const [formData, setFormData] = useState({
        claim_id: "",
        claimant_name: "",
        claim_type: "learning",
        council: "",
    });
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [userName, setUsername] = useState<string | null>(null);

    // Updates Modals
    const [updateModalState, setUpdateModalState] = useState<{ type: 'add' | 'view' | null, claim_id: string | null }>({ type: null, claim_id: null });
    const [updateMessage, setUpdateMessage] = useState("");
    const [updateDate, setUpdateDate] = useState(new Date().toISOString().slice(0, 10));
    const [updatesList, setUpdatesList] = useState<any[]>([]);
    const [addingUpdate, setAddingUpdate] = useState(false);

    // Editing
    const [editingClaimId, setEditingClaimId] = useState<string | null>(null);
    const [editNameValue, setEditNameValue] = useState("");
    const [editCouncilValue, setEditCouncilValue] = useState("");
    const [editTypeValue, setEditTypeValue] = useState("");
    const [editClaimStartDate, setEditClaimStartDate] = useState("");
    const [editPayDate, setEditPayDate] = useState("");
    const [editInvoiceDate, setEditInvoiceDate] = useState("");
    const [editHireStartDate, setEditHireStartDate] = useState("");
    const [editHireEndDate, setEditHireEndDate] = useState("");

    const [editingField, setEditingField] = useState<
        "name" | "council" | "claim_type" | "claim_start_date" | "pay_date" | "invoice_date" | "hire_start_date" | "hire_end_date" | null
    >(null);
    const [savingClaimId, setSavingClaimId] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const selectRef = useRef<HTMLSelectElement>(null);
    const typeRef = useRef<HTMLSelectElement>(null);
    const dateInputRef = useRef<HTMLInputElement>(null);
    const tableRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const getCurrentUsername = (): string | null => {
            try {
                const userData = Cookies.get("user");
                if (!userData) return null;
                const parsed = JSON.parse(userData);
                return parsed?.username || null;
            } catch {
                return null;
            }
        };
        const currentUser = getCurrentUsername();
        setUsername(currentUser);
    }, []);

    useEffect(() => {
        if (tableRef.current) {
            const element = tableRef.current;
            const elementTop = element.getBoundingClientRect().top + window.scrollY;
            const targetScroll = elementTop - window.innerHeight * 0.4;
            window.scrollTo({ top: targetScroll, behavior: "smooth" });
        }
    }, [selectedType, statusFilter, selectedCouncil, selectedStage, searchTerm, startDate, endDate]);

    const fetchClaims = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get("/api/claims", {
                headers: { requiresAuth: true },
            });
            setAllClaims(res.data);
            setClaims(res.data);
        } catch (err: any) {
            console.error(err);
            setError("Failed to load claims. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchClaims();
    }, []);

    useEffect(() => {
        let filtered = [...allClaims];

        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase().trim();
            filtered = filtered.filter(
                (claim) =>
                    claim.claimant_name?.toLowerCase().includes(term) ||
                    claim.claim_id.toLowerCase().includes(term)
            );
        }

        if (selectedType) {
            filtered = filtered.filter((claim) => claim.claim_type === selectedType);
        }

        if (selectedCouncil) {
            filtered = filtered.filter((claim) => claim.council === selectedCouncil);
        }

        if (selectedStage) {
            filtered = filtered.filter((claim) => claim.status === selectedStage);
        }

        if (statusFilter === "Active") {
            filtered = filtered.filter((claim) =>
                !claim.is_disputed &&
                !claim.closed_date &&
                !claim.closed_by &&
                ["claim created", "hire start", "client paid"].includes(claim.status?.toLowerCase())
            );
        } else if (statusFilter === "Non Active") {
            filtered = filtered.filter((claim) =>
                claim.is_disputed || ["hire end", "invoice sent"].includes(claim.status?.toLowerCase())
            );
        } else if (statusFilter === "Closed") {
            filtered = filtered.filter((claim) =>
                claim.status?.toLowerCase() === "close claim" || (claim.closed_date && claim.closed_by)
            );
        }

        if (startDate || endDate) {
            const start = startDate ? new Date(startDate) : null;
            const end = endDate ? new Date(endDate) : null;
            filtered = filtered.filter((claim) => {
                if (!claim.claim_start_date) return false;
                const claimDate = new Date(claim.claim_start_date);
                if (start && claimDate < start) return false;
                if (end && claimDate > end) return false;
                return true;
            });
        }

        if (sortColumn && sortDirection) {
            filtered.sort((a, b) => {
                let aVal: any = a[sortColumn] ?? "";
                let bVal: any = b[sortColumn] ?? "";

                if (sortColumn === "claim_id") {
                    const getParts = (id: string) => {
                        const prefixMatch = id.match(/^[A-Za-z]+/);
                        const numMatch = id.match(/\d+$/);
                        return {
                            prefix: prefixMatch ? prefixMatch[0].toLowerCase() : "",
                            num: numMatch ? parseInt(numMatch[0]) : 0,
                        };
                    };
                    const aParts = getParts(a.claim_id);
                    const bParts = getParts(b.claim_id);
                    let cmp = aParts.prefix.localeCompare(bParts.prefix);
                    if (cmp === 0) cmp = aParts.num - bParts.num;
                    return sortDirection === "asc" ? cmp : -cmp;
                }

                if (sortColumn === "status") {
                    const aNum = STATUS_COLORS[a.status?.toLowerCase()]?.number ?? 0;
                    const bNum = STATUS_COLORS[b.status?.toLowerCase()]?.number ?? 0;
                    const comparison = aNum - bNum;
                    return sortDirection === "asc" ? comparison : -comparison;
                }

                if (["claim_start_date", "hire_start_date", "pay_date", "hire_end_date", "invoice_date"].includes(sortColumn as string)) {
                    let field: "claim_start_date" | "hire_start_date" | "pay_date" | "hire_end_date" | "invoice_date" = "claim_start_date";
                    if (sortColumn === "hire_start_date") field = "hire_start_date";
                    if (sortColumn === "pay_date") field = "pay_date";
                    if (sortColumn === "hire_end_date") field = "hire_end_date";
                    if (sortColumn === "invoice_date") field = "invoice_date";
                    const sentinel = sortDirection === "asc" ? Infinity : -Infinity;
                    aVal = a[field] ? new Date(a[field]).getTime() : sentinel;
                    bVal = b[field] ? new Date(b[field]).getTime() : sentinel;
                }

                if (sortColumn === "closed") {
                    const aClosed = !!(a.closed_date && a.closed_by);
                    const bClosed = !!(b.closed_date && b.closed_by);
                    const comparison = aClosed === bClosed ? 0 : aClosed ? 1 : -1;
                    return sortDirection === "asc" ? comparison : -comparison;
                }

                if (typeof aVal === "string" && typeof bVal === "string") {
                    const comparison = aVal.toLowerCase().localeCompare(bVal.toLowerCase());
                    return sortDirection === "asc" ? comparison : -comparison;
                }

                const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
                return sortDirection === "asc" ? comparison : -comparison;
            });
        }

        setClaims(filtered);
    }, [
        allClaims,
        searchTerm,
        selectedType,
        selectedCouncil,
        selectedStage,
        statusFilter,
        startDate,
        endDate,
        sortColumn,
        sortDirection,
    ]);

    const handleSort = (column: SortColumn) => {
        if (sortColumn === column) {
            if (sortDirection === "asc") setSortDirection("desc");
            else if (sortDirection === "desc") {
                setSortDirection(null);
                setSortColumn(null);
            }
        } else {
            setSortColumn(column);
            setSortDirection("asc");
        }
    };

    const getSortArrow = (column: SortColumn) => {
        if (sortColumn !== column) return " ↕";
        if (sortDirection === "asc") return " ↑";
        if (sortDirection === "desc") return " ↓";
        return " ↕";
    };

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: name === "claim_id" ? value.toUpperCase() : value,
        }));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setCreating(true);
        setCreateError(null);
        try {
            const payload: any = {
                claimant_name: formData.claimant_name.trim().toUpperCase() || undefined,
                claim_type: formData.claim_type.trim() || "learning",
                council: formData.council.trim() || undefined,
            };
            if (formData.claim_id.trim()) payload.claim_id = formData.claim_id.trim();
            await api.post("/api/claims", payload, { headers: { requiresAuth: true } });
            setFormData({ claim_id: "", claimant_name: "", claim_type: "learning", council: "" });
            setShowCreateModal(false);
            await fetchClaims();
        } catch (err: any) {
            console.error(err);
            if (err.response?.status === 409) {
                setCreateError("This Claim ID already exists. Please use a different one or leave it blank.");
            } else {
                setCreateError(err.response?.data?.detail || "Failed to create claim.");
            }
        } finally {
            setCreating(false);
        }
    };

    // ── Update Logic ──────────────────────────────────────────────────
    const openAddUpdate = (claim_id: string) => {
        setUpdateModalState({ type: 'add', claim_id });
        setUpdateMessage("");
        setUpdateDate(new Date().toISOString().slice(0, 10));
    };

    const openViewUpdates = (claim: Claim) => {
        setUpdateModalState({ type: 'view', claim_id: claim.claim_id });
        const sorted = [...(claim.updates || [])].sort((a: any, b: any) => {
            const dateA = new Date(a.date || 0).getTime();
            const dateB = new Date(b.date || 0).getTime();
            return (isNaN(dateB) ? 0 : dateB) - (isNaN(dateA) ? 0 : dateA);
        });
        setUpdatesList(sorted);
    };

    const submitAddUpdate = async (e: FormEvent) => {
        e.preventDefault();
        const claimId = updateModalState.claim_id;
        if (!claimId || !updateMessage.trim()) return;
        
        setAddingUpdate(true);
        try {
            const currentClaim = allClaims.find(c => c.claim_id === claimId);
            const existing = currentClaim?.updates || [];
            const nextId = existing.length > 0 ? Math.max(...existing.map((u: any) => u.id || 0)) + 1 : 1;

            const now = new Date();
            const [year, month, day] = updateDate.split('-');
            const finalDate = new Date(Number(year), Number(month) - 1, Number(day), now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());

            await api.post(`/api/claims/${claimId}/updates`, {
                update: {
                    id: nextId,
                    message: updateMessage.trim(),
                    date: finalDate.toISOString(),
                    user: userName || "Unknown User"
                }
            }, { headers: { requiresAuth: true } });

            setUpdateModalState({ type: null, claim_id: null });
            await fetchClaims();
        } catch (err: any) {
            console.error(err);
            alert("Failed to add update. Please try again.");
        } finally {
            setAddingUpdate(false);
        }
    };

    const performActionWithUsername = async (
        claimId: string,
        apiPath: string,
        bodyKey: string,
        actionName: string
    ) => {
        if (!userName) {
            alert("User session not found. Please log in again.");
            return;
        }
        const confirmationPassword = prompt(
            "Security Confirmation\n\nPlease enter the confirmation password to proceed."
        );
        if (!confirmationPassword) return;
        if (confirmationPassword !== "12345678") {
            alert("Incorrect confirmation password.");
            return;
        }
        if (!window.confirm(`You want to ${actionName} claim ${claimId}?`)) return;
        try {
            await api.put(
                `/api/claims/${claimId}${apiPath}`,
                { [bodyKey]: userName },
                { headers: { requiresAuth: true } }
            );
            await fetchClaims();
        } catch (err: any) {
            alert(err.response?.data?.detail || `Failed to ${actionName} claim.`);
        }
    };

    const startEditing = (
        claim: Claim,
        field: "name" | "council" | "claim_type" | "claim_start_date" | "pay_date" | "invoice_date" | "hire_start_date" | "hire_end_date"
    ) => {
        if (savingClaimId) return;
        setEditingClaimId(claim.claim_id);
        setEditingField(field);
        if (field === "name") {
            setEditNameValue(claim.claimant_name || "");
            setTimeout(() => inputRef.current?.focus(), 10);
        } else if (field === "council") {
            setEditCouncilValue(claim.council || "");
            setTimeout(() => selectRef.current?.focus(), 10);
        } else if (field === "claim_type") {
            setEditTypeValue(claim.claim_type || "");
            setTimeout(() => typeRef.current?.focus(), 10);
        } else if (field === "claim_start_date") {
            setEditClaimStartDate(claim.claim_start_date ? claim.claim_start_date.slice(0, 10) : "");
            setTimeout(() => dateInputRef.current?.focus(), 10);
        } else if (field === "pay_date") {
            setEditPayDate(claim.pay_date ? claim.pay_date.slice(0, 10) : "");
            setTimeout(() => dateInputRef.current?.focus(), 10);
        } else if (field === "invoice_date") {
            setEditInvoiceDate(claim.invoice_date ? claim.invoice_date.slice(0, 10) : "");
            setTimeout(() => dateInputRef.current?.focus(), 10);
        } else if (field === "hire_start_date") {
            setEditHireStartDate(claim.hire_start_date ? claim.hire_start_date.slice(0, 10) : "");
            setTimeout(() => dateInputRef.current?.focus(), 10);
        } else if (field === "hire_end_date") {
            setEditHireEndDate(claim.hire_end_date ? claim.hire_end_date.slice(0, 10) : "");
            setTimeout(() => dateInputRef.current?.focus(), 10);
        }
    };

    const cancelEdit = () => {
        setEditingClaimId(null);
        setEditingField(null);
        setEditNameValue("");
        setEditCouncilValue("");
        setEditTypeValue("");
        setEditClaimStartDate("");
        setEditPayDate("");
        setEditInvoiceDate("");
        setEditHireStartDate("");
        setEditHireEndDate("");
        setSavingClaimId(null);
    };

    const saveEdit = async (claim_id: string) => {
        if (editingField === "name" && !editNameValue.trim()) {
            alert("Claimant name cannot be empty.");
            return;
        }
        if (editingField === "council" && !editCouncilValue.trim()) {
            alert("Council cannot be empty.");
            return;
        }
        if (editingField === "claim_type" && !editTypeValue.trim()) {
            alert("Claim type cannot be empty.");
            return;
        }
        if (savingClaimId) return;
        setSavingClaimId(claim_id);

        try {
            if (editingField === "hire_start_date" || editingField === "hire_end_date") {
                const currentClaim = allClaims.find(c => c.claim_id === claim_id);
                const dateOut = editingField === "hire_start_date"
                    ? editHireStartDate || null
                    : (currentClaim?.hire_start_date ? currentClaim.hire_start_date.slice(0, 10) : null);
                const dateIn = editingField === "hire_end_date"
                    ? editHireEndDate || null
                    : (currentClaim?.hire_end_date ? currentClaim.hire_end_date.slice(0, 10) : null);

                await api.put(
                    `/api/claims/${claim_id}/hire-vehicle-dates`,
                    { date_in: dateIn, date_out: dateOut },
                    { headers: { requiresAuth: true } }
                );

                setAllClaims((prev) =>
                    prev.map((c) => {
                        if (c.claim_id === claim_id) {
                            return {
                                ...c,
                                hire_start_date: editingField === "hire_start_date" ? (editHireStartDate || null) : c.hire_start_date,
                                hire_end_date: editingField === "hire_end_date" ? (editHireEndDate || null) : c.hire_end_date,
                            };
                        }
                        return c;
                    })
                );
            } else {
                const payload: any = {};
                if (editingField === "name") payload.claimant_name = editNameValue.trim();
                else if (editingField === "council") payload.council = editCouncilValue.trim();
                else if (editingField === "claim_type") payload.claim_type = editTypeValue.trim();
                else if (editingField === "claim_start_date") payload.claim_start_date = editClaimStartDate || null;
                else if (editingField === "pay_date") payload.pay_date = editPayDate || null;
                else if (editingField === "invoice_date") payload.invoice_date = editInvoiceDate || null;

                await api.put(
                    `/api/claims/${claim_id}`,
                    payload,
                    { headers: { requiresAuth: true } }
                );

                setAllClaims((prev) =>
                    prev.map((c) => {
                        if (c.claim_id === claim_id) {
                            if (editingField === "name") return { ...c, claimant_name: editNameValue.trim() };
                            if (editingField === "council") return { ...c, council: editCouncilValue.trim() };
                            if (editingField === "claim_type") return { ...c, claim_type: editTypeValue.trim() };
                            if (editingField === "claim_start_date") return { ...c, claim_start_date: editClaimStartDate || null };
                            if (editingField === "pay_date") return { ...c, pay_date: editPayDate || null };
                            if (editingField === "invoice_date") return { ...c, invoice_date: editInvoiceDate || null };
                        }
                        return c;
                    })
                );
            }

            setEditingClaimId(null);
            setEditingField(null);
            setEditNameValue("");
            setEditCouncilValue("");
            setEditTypeValue("");
            setEditClaimStartDate("");
            setEditPayDate("");
            setEditInvoiceDate("");
            setEditHireStartDate("");
            setEditHireEndDate("");
        } catch (err: any) {
            alert(err.response?.data?.detail || "Failed to update claim field.");
        } finally {
            setSavingClaimId(null);
        }
    };

    const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>, claim_id: string) => {
        if (e.key === "Enter") { e.preventDefault(); saveEdit(claim_id); }
        else if (e.key === "Escape") { cancelEdit(); }
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return "—";
        try {
            return new Date(dateStr).toLocaleDateString("en-GB", {
                day: "2-digit", month: "short", year: "numeric",
            });
        } catch { return dateStr; }
    };

    const formatDateTime = (dateStr: string | null) => {
        if (!dateStr) return "—";
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            return d.toLocaleString("en-GB", {
                day: "2-digit", month: "short", year: "numeric",
                hour: "2-digit", minute: "2-digit"
            });
        } catch { return dateStr; }
    };

    const clearFilters = () => {
        setSearchTerm("");
        setSelectedType("");
        setSelectedCouncil("");
        setSelectedStage("");
        setStatusFilter("all");
        setStartDate("");
        setEndDate("");
        setSortColumn(null);
        setSortDirection(null);
    };

    // ── Summary calculations (Memoized) ──────────────────────────────────────────────────
    const summary = useMemo(() => {
        const total = allClaims.length;
        const activeClaims = allClaims.filter(c =>
            !c.is_disputed &&
            !c.closed_date &&
            !c.closed_by &&
            ["claim created", "hire start", "client paid"].includes(c.status?.toLowerCase())
        ).length;
        const nonActiveClaims = allClaims.filter(c =>
            c.is_disputed || ["hire end", "invoice sent"].includes(c.status?.toLowerCase())
        ).length;
        const closedClaims = allClaims.filter(c =>
            c.status?.toLowerCase() === "close claim" || (c.closed_date && c.closed_by)
        ).length;
        const typeBreakdown = CLAIM_TYPES.map(type => ({
            type,
            count: allClaims.filter(c => c.claim_type?.toLowerCase() === type).length,
        }));
        const invoicePending = allClaims.filter(c =>
            c.status?.toLowerCase() === "hire end"
        ).length;
        const invoiceSent = allClaims.filter(c =>
            c.status?.toLowerCase() === "invoice sent"
        ).length;
        return { total, activeClaims, nonActiveClaims, closedClaims, typeBreakdown, invoicePending, invoiceSent };
    }, [allClaims]);

    // ── Reusable date cell renderer ───────────────────────────────────────────
    const renderDateCell = (
        claim: Claim,
        field: "claim_start_date" | "pay_date" | "invoice_date" | "hire_start_date" | "hire_end_date",
        editValue: string,
        setEditValue: (v: string) => void,
        isVehicleDamageBlocked: boolean = false
    ) => {
        const isEditing = editingClaimId === claim.claim_id && editingField === field;
        const isSaving = savingClaimId === claim.claim_id;
        const isVehicleDamage = claim.claim_type === "vehicle damage";

        // Block cell with green thick line for vehicle damage when flagged
        if (isVehicleDamageBlocked && isVehicleDamage) {
            return (
                <td className="px-1.5 py-1 text-center whitespace-nowrap border-r border-gray-300">
                    <hr className="border-emerald-500 border-[2px]  w-[50%]" />
                </td>
            );
        }
        return (
            <td className="px-3 py-1 text-gray-700 whitespace-nowrap border-r border-gray-300">
                {isEditing ? (
                    <div className="flex items-center gap-1.5">
                        <input
                            ref={dateInputRef}
                            type="date"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => handleEditKeyDown(e, claim.claim_id)}
                            disabled={isSaving}
                            autoFocus
                            className={`flex-1 px-2 py-1 border rounded text-sm focus:outline-none focus:ring-1 min-w-[130px]
                                ${isSaving ? "border-gray-300 bg-gray-50 text-gray-500" : "border-green-400 focus:ring-green-500 bg-white"}`}
                        />
                        {isSaving ? (
                            <Loader2 size={16} className="text-green-600 animate-spin" />
                        ) : (
                            <>
                                <button onClick={() => saveEdit(claim.claim_id)} disabled={isSaving} title="Save" className="p-1 text-green-600 hover:text-green-800 disabled:opacity-50">
                                    <Check size={16} />
                                </button>
                                <button onClick={cancelEdit} disabled={isSaving} title="Cancel" className="p-1 text-red-600 hover:text-red-800 disabled:opacity-50">
                                    <X size={16} />
                                </button>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="group flex items-center gap-2">
                        <span className={isSaving ? "opacity-50" : ""}>{formatDate(claim[field])}</span>
                        {!isSaving && (
                            <button
                                onClick={(e) => { e.stopPropagation(); startEditing(claim, field); }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-500 hover:text-green-700 flex-shrink-0"
                                title={`Edit ${field.replace(/_/g, " ")}`}
                            >
                                <Pencil size={14} />
                            </button>
                        )}
                    </div>
                )}
            </td>
        );
    };

    // ── Table Content (Memoized) ───────────────────────────────────────────
    const renderedTableContent = useMemo(() => {
        if (loading) {
            return (
                <div className="flex justify-center py-20">
                    <div className="w-16 h-16 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
                </div>
            );
        }
        if (claims.length === 0) {
            return (
                <div className="text-center py-16 bg-white/60 rounded-3xl border border-green-100 shadow-lg">
                    <p className="text-xl text-green-700/80">
                        {searchTerm || selectedType || selectedCouncil || selectedStage || statusFilter !== "all" || startDate || endDate
                            ? "No matching claims found"
                            : "No claims yet — create one above!"}
                    </p>
                </div>
            );
        }

        return (
            <div ref={tableRef}>
                <div className="overflow-y-auto max-h-[500px]">
                    <table className="w-full divide-y divide-gray-400 text-xs rounded-md">
                        <thead className="sticky top-0 bg-green-50/95 backdrop-blur-sm z-20">
                            <tr className="border-0 bg-transparent">
                                {/* Invisible filler cells */}
                                <th className="border-0 bg-transparent p-0" colSpan={1} />
                                <th className="border-0 bg-transparent p-0" colSpan={1} />
                                <th className="border-0 bg-transparent p-0" colSpan={1} />
                                <th className="border-0 bg-transparent p-0" colSpan={1} />
                                <th className="border-0 bg-transparent p-0" colSpan={1} />

                                {/* Visible "Claim Progress" cell */}
                                <th
                                    colSpan={5}
                                    className="px-2 py-1 text-center bg-green-300/80"
                                    style={{ borderRadius: "8px 8px 0 0" }}
                                >
                                    <span className="text-xs font-bold text-green-800 uppercase tracking-widest">
                                        — Claim Progress —
                                    </span>
                                </th>

                                {/* Invisible trailing cells for Updates and Status */}
                                <th className="border-0 bg-transparent p-0" colSpan={1} />
                                <th className="border-0 bg-transparent p-0" colSpan={1} />
                            </tr>
                            {/* ── Main header row ── */}
                            <tr className="border-b border-gray-500">
                                <th onClick={() => handleSort("closed")} className="px-1.5 py-1 text-center font-semibold text-green-800 border-r border-gray-400 cursor-pointer hover:bg-green-100/50 whitespace-nowrap">
                                    Status {getSortArrow("closed")}
                                </th>
                                <th onClick={() => handleSort("claim_id")} className="px-1.5 py-1 text-left font-semibold text-green-800 border-r border-gray-400 cursor-pointer hover:bg-green-100/50 whitespace-nowrap">
                                    Claim ID {getSortArrow("claim_id")}
                                </th>
                                <th onClick={() => handleSort("claimant_name")} className="px-1.5 py-1 text-left font-semibold text-green-800 border-r border-gray-400 cursor-pointer hover:bg-green-100/50 whitespace-nowrap">
                                    Claimant {getSortArrow("claimant_name")}
                                </th>
                                <th onClick={() => handleSort("claim_type")} className="px-1.5 py-1 text-left font-semibold text-green-800 border-r border-gray-400 cursor-pointer hover:bg-green-100/50 whitespace-nowrap">
                                    Type {getSortArrow("claim_type")}
                                </th>
                                <th onClick={() => handleSort("council")} className="px-1.5 py-1 text-left font-semibold text-green-800 border-r border-gray-400 cursor-pointer hover:bg-green-100/50 whitespace-nowrap">
                                    Council {getSortArrow("council")}
                                </th>

                                {/* Stage 1 */}
                                <th onClick={() => handleSort("claim_start_date")} className="px-1.5 py-1 text-left font-semibold text-green-800 border-r border-gray-400 cursor-pointer hover:bg-green-100/50 whitespace-nowrap">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Stage 1</span>
                                        <span>Start Date {getSortArrow("claim_start_date")}</span>
                                    </div>
                                </th>

                                {/* Stage 2 */}
                                <th onClick={() => handleSort("hire_start_date")} className="px-1.5 py-1 text-left font-semibold text-green-800 border-r border-gray-400 cursor-pointer hover:bg-green-100/50 whitespace-nowrap">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Stage 2</span>
                                        <span>Hire Start {getSortArrow("hire_start_date")}</span>
                                    </div>
                                </th>

                                {/* Stage 3 */}
                                <th onClick={() => handleSort("pay_date")} className="px-1.5 py-1 text-left font-semibold text-green-800 border-r border-gray-400 cursor-pointer hover:bg-green-100/50 whitespace-nowrap">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Stage 3</span>
                                        <span>Client Paid {getSortArrow("pay_date")}</span>
                                    </div>
                                </th>

                                {/* Stage 4 */}
                                <th onClick={() => handleSort("hire_end_date")} className="px-1.5 py-1 text-left font-semibold text-green-800 border-r border-gray-400 cursor-pointer hover:bg-green-100/50 whitespace-nowrap">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Stage 4</span>
                                        <span>Hire End {getSortArrow("hire_end_date")}</span>
                                    </div>
                                </th>

                                {/* Stage 5 */}
                                <th onClick={() => handleSort("invoice_date")} className="px-1.5 py-1 text-left font-semibold text-green-800 border-r border-gray-400 cursor-pointer hover:bg-green-100/50 whitespace-nowrap">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Stage 5</span>
                                        <span>Invoice Sent {getSortArrow("invoice_date")}</span>
                                    </div>
                                </th>

                                <th className="px-1.5 py-1 text-center font-semibold text-green-800 border-r border-gray-400 whitespace-nowrap">
                                    Updates
                                </th>

                                <th onClick={() => handleSort("status")} className="px-1.5 py-1 text-left font-semibold text-green-800 border-r border-gray-400 cursor-pointer hover:bg-green-100/50 whitespace-nowrap">
                                    Stages {getSortArrow("status")}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-300 bg-white">
                            {claims.map((claim) => {
                                const isEditing = editingClaimId === claim.claim_id;
                                const isSaving = savingClaimId === claim.claim_id;
                                const isClosed = !!(claim.closed_date && claim.closed_by);
                                const statusData = STATUS_COLORS[claim.status?.toLowerCase()] || STATUS_COLORS.default;
                                const isVehicleDamage = claim.claim_type === "vehicle damage";
                                const rowBgColor = claim.is_disputed ? "bg-red-200/50" : "bg-white";
                                const hoverBgColor = claim.is_disputed ? "hover:bg-red-200/80" : "hover:bg-green-100/80";

                                return (
                                    <tr key={claim.claim_id} className={`${rowBgColor} ${hoverBgColor} transition-colors`}>
                                        {/* Status column */}
                                        <td className="px-1.5 py-0.5 text-center border-r border-gray-300 whitespace-nowrap">
                                            <div className="relative group inline-block ">
                                                {(() => {
                                                    let statusText = "Active";
                                                    let bgColor = "bg-green-100 text-green-800";
                                                    if (isClosed) {
                                                        statusText = "Closed";
                                                        bgColor = "bg-red-100 text-red-800";
                                                    } else if (claim.is_disputed || ["hire end", "invoice sent"].includes(claim.status?.toLowerCase())) {
                                                        statusText = "Non Active";
                                                        bgColor = "bg-amber-100 text-amber-800";
                                                    }
                                                    return (
                                                        <>
                                                            <span className={`inline-flex whitespace-nowrap cursor-pointer px-2 py-0 text-[10px] font-semibold rounded-full ${bgColor}`}>
                                                                {statusText}
                                                            </span>
                                                            {isClosed && (
                                                                <div className="absolute bottom-full mb-2 hidden group-hover:block bg-black text-white text-xs rounded px-2 py-1 whitespace-nowrap shadow-lg z-100">
                                                                    Closed by {claim.closed_by} on {formatDate(claim.closed_date)} | Reason: {claim.reason}
                                                                </div>
                                                            )}
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        </td>

                                        <td className="px-1.5 py-0.5 font-medium text-green-800 border-r border-gray-300 cursor-pointer hover:text-green-600 hover:underline whitespace-nowrap" onClick={() => router.push(`/claim/${claim.claim_id}`)}>
                                            {claim.claim_id.toUpperCase()}
                                        </td>

                                        {/* Editable claimant name — no fixed width */}
                                        <td className="px-1.5 py-0.5 text-gray-700 border-r border-gray-300">
                                            {isEditing && editingField === "name" ? (
                                                <div className="flex items-center gap-1.5">
                                                    <input
                                                        ref={inputRef}
                                                        type="text"
                                                        value={editNameValue}
                                                        onChange={(e) => setEditNameValue(e.target.value)}
                                                        onKeyDown={(e) => handleEditKeyDown(e, claim.claim_id)}
                                                        disabled={isSaving}
                                                        autoFocus
                                                        className={`flex-1 px-2 py-1 border rounded text-sm focus:outline-none focus:ring-1 
                                                                    ${isSaving ? "border-gray-300 bg-gray-50 text-gray-500" : "border-green-400 focus:ring-green-500 bg-white"}`}
                                                    />
                                                    {isSaving ? (
                                                        <Loader2 size={16} className="text-green-600 animate-spin" />
                                                    ) : (
                                                        <>
                                                            <button onClick={() => saveEdit(claim.claim_id)} disabled={isSaving} title="Save" className="p-1 text-green-600 hover:text-green-800 disabled:opacity-50"><Check size={16} /></button>
                                                            <button onClick={cancelEdit} disabled={isSaving} title="Cancel" className="p-1 text-red-600 hover:text-red-800 disabled:opacity-50"><X size={16} /></button>
                                                        </>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="group flex items-center gap-2">
                                                    <span className={`whitespace-nowrap ${isSaving ? "opacity-50" : ""}`}>
                                                        {(claim.claimant_name || "—").toUpperCase()}
                                                    </span>
                                                    {!isSaving && (
                                                        <button onClick={(e) => { e.stopPropagation(); startEditing(claim, "name"); }} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-500 hover:text-green-700 flex-shrink-0 mt-0.5" title="Edit claimant name">
                                                            <Pencil size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </td>

                                        {/* Editable claim type — no fixed width */}
                                        <td className="px-1.5 py-0.5 text-gray-700 border-r border-gray-300">
                                            {isEditing && editingField === "claim_type" ? (
                                                <div className="flex items-center gap-1.5">
                                                    <select
                                                        ref={typeRef}
                                                        value={editTypeValue}
                                                        onChange={(e) => setEditTypeValue(e.target.value)}
                                                        onKeyDown={(e) => handleEditKeyDown(e, claim.claim_id)}
                                                        disabled={isSaving}
                                                        autoFocus
                                                        className={`flex-1 px-2 py-1 border rounded text-sm focus:outline-none focus:ring-1 ${isSaving ? "border-gray-300 bg-gray-50 text-gray-500" : "border-green-400 focus:ring-green-500 bg-white"}`}
                                                    >
                                                        {CLAIM_TYPES.map((type) => (
                                                            <option key={type} value={type}>
                                                                {type === "learning" ? "Learner" : type.charAt(0).toUpperCase() + type.slice(1)}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    {isSaving ? (
                                                        <Loader2 size={16} className="text-green-600 animate-spin" />
                                                    ) : (
                                                        <>
                                                            <button onClick={() => saveEdit(claim.claim_id)} disabled={isSaving} title="Save" className="p-1 text-green-600 hover:text-green-800 disabled:opacity-50"><Check size={16} /></button>
                                                            <button onClick={cancelEdit} disabled={isSaving} title="Cancel" className="p-1 text-red-600 hover:text-red-800 disabled:opacity-50"><X size={16} /></button>
                                                        </>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="group flex items-center gap-2 whitespace-nowrap">
                                                    <span>{claim.claim_type ? (claim.claim_type === "learning" ? "Learner" : claim.claim_type.charAt(0).toUpperCase() + claim.claim_type.slice(1)) : "—"}</span>
                                                    {!isSaving && (
                                                        <button onClick={(e) => { e.stopPropagation(); startEditing(claim, "claim_type"); }} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-500 hover:text-green-700" title="Edit claim type">
                                                            <Pencil size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </td>

                                        <td className="px-1.5 py-0.5 border-r border-gray-300 text-center">
                                            {isVehicleDamage ? (
                                                <hr className="border-emerald-500 border-[2px]  w-[50%] text-center" />
                                            ) : isEditing && editingField === "council" ? (<div className="flex items-center gap-1.5">
                                                <select
                                                    ref={selectRef}
                                                    value={editCouncilValue}
                                                    onChange={(e) => setEditCouncilValue(e.target.value)}
                                                    onKeyDown={(e) => handleEditKeyDown(e, claim.claim_id)}
                                                    disabled={isSaving}
                                                    autoFocus
                                                    className={`flex-1 px-2 py-1 border rounded text-sm focus:outline-none focus:ring-1 ${isSaving ? "border-gray-300 bg-gray-50 text-gray-500" : "border-green-400 focus:ring-green-500 bg-white"}`}
                                                >
                                                    {COUNCIL_OPTIONS.slice(1).map((opt) => (
                                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                    ))}
                                                </select>
                                                {isSaving ? (
                                                    <Loader2 size={16} className="text-green-600 animate-spin" />
                                                ) : (
                                                    <>
                                                        <button onClick={() => saveEdit(claim.claim_id)} disabled={isSaving} title="Save" className="p-1 text-green-600 hover:text-green-800 disabled:opacity-50"><Check size={16} /></button>
                                                        <button onClick={cancelEdit} disabled={isSaving} title="Cancel" className="p-1 text-red-600 hover:text-red-800 disabled:opacity-50"><X size={16} /></button>
                                                    </>
                                                )}
                                            </div>
                                            ) : (
                                                <div className="group flex items-center gap-2 whitespace-nowrap">
                                                    <span>{(claim.council || "—")}</span>
                                                    {!isSaving && (
                                                        <button onClick={(e) => { e.stopPropagation(); startEditing(claim, "council"); }} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-500 hover:text-green-700" title="Edit council">
                                                            <Pencil size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </td>

                                        {/* Stage 1 – Start Date */}
                                        {renderDateCell(claim, "claim_start_date", editClaimStartDate, setEditClaimStartDate, false)}

                                        {/* Stage 2 – Hire Start (blocked for vehicle damage) */}
                                        {renderDateCell(claim, "hire_start_date", editHireStartDate, setEditHireStartDate, true)}

                                        {/* Stage 3 – Client Paid */}
                                        {renderDateCell(claim, "pay_date", editPayDate, setEditPayDate, false)}

                                        {/* Stage 4 – Hire End (blocked for vehicle damage) */}
                                        {renderDateCell(claim, "hire_end_date", editHireEndDate, setEditHireEndDate, true)}

                                        {/* Stage 5 – Invoice Sent (also blocked for vehicle damage) */}
                                        {renderDateCell(claim, "invoice_date", editInvoiceDate, setEditInvoiceDate, true)}

                                        {/* Updates Column */}
                                        <td className="px-1.5 py-0.5 border-r border-gray-300 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button onClick={() => openAddUpdate(claim.claim_id)} title="Add Update" className="text-green-600 hover:text-green-800">
                                                    <Plus size={16} />
                                                </button>
                                                {claim.updates && claim.updates.length > 0 && (
                                                    <button onClick={() => openViewUpdates(claim)} title="View Updates" className="text-blue-600 hover:text-blue-800">
                                                        <FileText size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>

                                        {/* Stage badge */}
                                        <td className="border-r border-gray-300 px-1 py-0.5">
                                            <div className="flex items-center justify-center">
                                                {isClosed ? (
                                                    <div className="w-3 h-3 bg-gradient-to-br from-rose-500 via-rose-600 to-rose-700 rounded-full" title="Closed"></div>
                                                ) : claim.is_disputed ? (
                                                    <div className="w-4 h-[2px] bg-green-500" title="Disputed"></div>
                                                ) : (
                                                    <span
                                                        className={`px-2 py-0.5 rounded-full text-xs font-semibold border-2
                                                                    ${statusData.number >= 4
                                                                ? `${statusData.badgeText} text-black border-transparent`
                                                                : `bg-white ${statusData.color} ${statusData.badgeBg}`
                                                            }`}
                                                    >
                                                        {statusData.number}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }, [
        claims,
        loading,
        searchTerm,
        selectedType,
        selectedCouncil,
        selectedStage,
        statusFilter,
        startDate,
        endDate,
        editingClaimId,
        editingField,
        savingClaimId,
        editNameValue,
        editCouncilValue,
        editTypeValue,
        editClaimStartDate,
        editHireStartDate,
        editPayDate,
        editHireEndDate,
        editInvoiceDate,
        sortColumn,
        sortDirection
    ]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50/40">
            <main className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 py-10">

                {/* ── Page Header ─────────────────────────────────────────── */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-extrabold text-green-800 tracking-tight">
                            Hire Dashboard
                        </h1>
                        <p className="mt-2 text-lg text-green-700/80">
                            Manage all your claims in one place
                        </p>
                    </div>
                    <div className="flex gap-3 mt-4 md:mt-0">
                        <button
                            onClick={fetchClaims}
                            disabled={loading}
                            className="px-5 py-2.5 bg-white border border-green-200 text-green-700 rounded-xl hover:bg-green-50 transition disabled:opacity-50"
                        >
                            {loading ? "Refreshing..." : "Refresh List"}
                        </button>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-xl shadow-lg transition flex items-center gap-2"
                        >
                            <Plus size={20} />
                            New Claim
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="mb-8 p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl">
                        {error}
                    </div>
                )}

                {/* Loading State */}
                {loading && (
                    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center">
                        <div className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4">
                            <Loader2 size={48} className="text-green-600 animate-spin" />
                            <p className="text-lg font-semibold text-gray-800">Loading claims...</p>
                            <p className="text-sm text-gray-600">Please wait while we fetch your data</p>
                        </div>
                    </div>
                )}

                {/* Show skeleton when loading, otherwise show content */}
                {loading ? (
                    <div className="space-y-8">
                        <div className="flex items-center gap-3">
                            <div className="w-1 h-7 bg-gradient-to-b from-green-500 to-emerald-600 rounded-full" />
                            <h2 className="text-xl font-bold text-green-800 tracking-tight">Overview</h2>
                        </div>
                        <OverviewSkeleton />
                        <div className="flex items-center gap-3 mt-10">
                            <div className="w-1 h-7 bg-gradient-to-b from-green-500 to-emerald-600 rounded-full" />
                            <h2 className="text-xl font-bold text-green-800 tracking-tight">All Claims</h2>
                        </div>
                        <ClaimsTableSkeleton />
                    </div>
                ) : (
                    <>
                        {/* ══════════════════════════════════════════════════════════
                    SUMMARY DASHBOARD
                ══════════════════════════════════════════════════════════ */}
                        <div className="mb-10 space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="w-1 h-7 bg-gradient-to-b from-green-500 to-emerald-600 rounded-full" />
                                <h2 className="text-xl font-bold text-green-800 tracking-tight">Overview</h2>
                            </div>

                            {/* Row 1: Claim Status Summary (Clickable Filters) */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                {/* Total */}
                                <button
                                    onClick={() => setStatusFilter("all")}
                                    className={`group relative overflow-hidden rounded-3xl p-6 shadow-xl text-white transition-all duration-300 cursor-pointer border-2
                                ${statusFilter === "all"
                                            ? "border-yellow-300 scale-105 shadow-2xl shadow-yellow-500/50 ring-4 ring-yellow-400/30 bg-gradient-to-br from-slate-700 to-slate-900"
                                            : "border-transparent bg-gradient-to-br from-slate-700 to-slate-900 hover:scale-102 hover:shadow-xl"
                                        }`}
                                >
                                    <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full" />
                                    <div className="absolute -bottom-8 -right-4 w-32 h-32 bg-white/5 rounded-full" />
                                    {statusFilter === "all" && (
                                        <div className="absolute inset-0 bg-yellow-400/20 blur-3xl rounded-3xl" />
                                    )}
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-2 mb-4">
                                            <BarChart3 size={18} className="text-slate-300" />
                                            <p className="text-xs font-semibold text-slate-300 uppercase tracking-widest">Total Claims</p>
                                        </div>
                                        <p className="text-5xl font-black tracking-tighter">{summary.total}</p>
                                    </div>
                                </button>

                                {/* Active */}
                                <button
                                    onClick={() => setStatusFilter("Active")}
                                    className={`group relative overflow-hidden rounded-3xl p-6 shadow-xl text-white transition-all duration-300 cursor-pointer border-2
                                ${statusFilter === "Active"
                                            ? "border-emerald-400 scale-105 shadow-2xl shadow-emerald-500/60 ring-4 ring-emerald-400/40 bg-gradient-to-br from-emerald-500 to-teal-600"
                                            : "border-transparent bg-gradient-to-br from-green-500 to-emerald-600 hover:scale-102 hover:shadow-xl"
                                        }`}
                                >
                                    <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/15 rounded-full" />
                                    <div className="absolute -bottom-8 -right-4 w-32 h-32 bg-white/10 rounded-full" />
                                    {statusFilter === "Active" && (
                                        <div className="absolute inset-0 bg-emerald-400/25 blur-3xl rounded-3xl" />
                                    )}
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-2 mb-4">
                                            <TrendingUp size={18} className="text-emerald-100" />
                                            <p className="text-xs font-semibold text-emerald-100 uppercase tracking-widest">Active</p>
                                        </div>
                                        <p className="text-5xl font-black tracking-tighter">{summary.activeClaims}</p>
                                    </div>
                                </button>

                                {/* Non-Active */}
                                <button
                                    onClick={() => setStatusFilter("Non Active")}
                                    className={`group relative overflow-hidden rounded-3xl p-6 shadow-xl text-white transition-all duration-300 cursor-pointer border-2
                                ${statusFilter === "Non Active"
                                            ? "border-orange-400 scale-105 shadow-2xl shadow-orange-500/60 ring-4 ring-orange-400/40 bg-gradient-to-br from-orange-500 to-amber-600"
                                            : "border-transparent bg-gradient-to-br from-amber-500 to-orange-500 hover:scale-102 hover:shadow-xl"
                                        }`}
                                >
                                    <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/15 rounded-full" />
                                    <div className="absolute -bottom-8 -right-4 w-32 h-32 bg-white/10 rounded-full" />
                                    {statusFilter === "Non Active" && (
                                        <div className="absolute inset-0 bg-orange-400/25 blur-3xl rounded-3xl" />
                                    )}
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-2 mb-4">
                                            <Clock size={18} className="text-amber-100" />
                                            <p className="text-xs font-semibold text-amber-100 uppercase tracking-widest">Non-Active</p>
                                        </div>
                                        <p className="text-5xl font-black tracking-tighter">{summary.nonActiveClaims}</p>
                                    </div>
                                </button>

                                {/* Closed */}
                                <button
                                    onClick={() => setStatusFilter("Closed")}
                                    className={`group relative overflow-hidden rounded-3xl p-6 shadow-xl text-white transition-all duration-300 cursor-pointer border-2
                                ${statusFilter === "Closed"
                                            ? "border-rose-400 scale-105 shadow-2xl shadow-rose-500/60 ring-4 ring-rose-400/40 bg-gradient-to-br from-rose-500 to-pink-600"
                                            : "border-transparent bg-gradient-to-br from-rose-500 to-rose-700 hover:scale-102 hover:shadow-xl"
                                        }`}
                                >
                                    <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/15 rounded-full" />
                                    <div className="absolute -bottom-8 -right-4 w-32 h-32 bg-white/10 rounded-full" />
                                    {statusFilter === "Closed" && (
                                        <div className="absolute inset-0 bg-rose-400/25 blur-3xl rounded-3xl" />
                                    )}
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-2 mb-4">
                                            <CheckCircle2 size={18} className="text-rose-100" />
                                            <p className="text-xs font-semibold text-rose-100 uppercase tracking-widest">Closed</p>
                                        </div>
                                        <p className="text-5xl font-black tracking-tighter">{summary.closedClaims}</p>
                                    </div>
                                </button>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                                {/* Claims by Type — 2/3 */}
                                <div className="lg:col-span-2 bg-white/90 backdrop-blur-sm border border-green-100 rounded-2xl p-5 shadow-sm">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center">
                                            <FileText size={14} className="text-green-600" />
                                        </div>
                                        <h3 className="text-sm font-semibold text-green-900 tracking-tight">Claims by Type</h3>
                                    </div>
                                    <div className="w-full">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                                            {summary.typeBreakdown.map(({ type, count }) => {
                                                const cfg = TYPE_CONFIG[type] || {
                                                    icon: LayoutGrid,
                                                    gradient: "from-gray-50 to-gray-100",
                                                    border: "border-gray-200",
                                                    text: "text-gray-800",
                                                    iconBg: "bg-gray-100 text-gray-500",
                                                    bar: "bg-gray-400",
                                                };
                                                const Icon = cfg.icon;
                                                const pct = summary.total > 0 ? Math.round((count / summary.total) * 100) : 0;
                                                const displayType = type === "learning" ? "Learner" : type;
                                                return (
                                                    <button
                                                        key={type}
                                                        onClick={() => setSelectedType(type === selectedType ? "" : type)}
                                                        className={`relative bg-gradient-to-br ${cfg.gradient} 
                                                    border-2 ${selectedType === type
                                                                ? "border-yellow-300 ring-2 ring-yellow-200 shadow-lg"
                                                                : cfg.border} 
                                                    rounded-2xl p-6 flex flex-col gap-4 overflow-hidden 
                                                    group hover:shadow-xl hover:-translate-y-0.5 
                                                    transition-all duration-200 cursor-pointer w-full`}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cfg.iconBg}`}>
                                                                <Icon size={20} strokeWidth={2.5} />
                                                            </div>
                                                            <span className={`text-sm font-bold ${cfg.text} opacity-75`}>{pct}%</span>
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className={`text-4xl font-black leading-none ${cfg.text} tracking-tighter`}>
                                                                {count}
                                                            </p>
                                                            <p className="text-base font-medium text-gray-600 mt-1 capitalize">
                                                                {displayType}
                                                            </p>
                                                        </div>
                                                        <div className="h-1.5 bg-black/10 rounded-full overflow-hidden mt-auto">
                                                            <div
                                                                className={`h-full rounded-full ${cfg.bar} transition-all duration-700`}
                                                                style={{ width: `${pct}%` }}
                                                            />
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>

                                {/* Invoice Summary — 1/3 */}
                                <div className="bg-white/90 backdrop-blur-sm border border-green-100 rounded-2xl p-5 shadow-sm flex flex-col">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center">
                                            <Receipt size={14} className="text-green-600" />
                                        </div>
                                        <h3 className="text-sm font-semibold text-green-900 tracking-tight">Invoice Summary</h3>
                                    </div>
                                    <div className="flex-1 flex flex-col gap-3">
                                        <div className="flex items-center justify-between p-3.5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/70 rounded-xl">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                                                    <Clock size={15} className="text-amber-600" strokeWidth={2.2} />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-semibold text-amber-800">Pending</p>
                                                    <p className="text-[10px] text-amber-400 font-medium">Hire End status</p>
                                                </div>
                                            </div>
                                            <span className="text-2xl font-black text-amber-700 tabular-nums">{summary.invoicePending}</span>
                                        </div>
                                        <div className="flex items-center justify-between p-3.5 bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200/70 rounded-xl">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                                                    <CheckCircle2 size={15} className="text-emerald-600" strokeWidth={2.2} />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-semibold text-emerald-800">Sent</p>
                                                    <p className="text-[10px] text-emerald-400 font-medium">Invoice sent / Closed</p>
                                                </div>
                                            </div>
                                            <span className="text-2xl font-black text-emerald-700 tabular-nums">{summary.invoiceSent}</span>
                                        </div>
                                        <div className="mt-auto pt-1">
                                            {(() => {
                                                const total = summary.invoicePending + summary.invoiceSent;
                                                const ratio = total > 0 ? Math.round((summary.invoiceSent / total) * 100) : 0;
                                                return (
                                                    <>
                                                        <div className="flex justify-between items-center mb-1.5">
                                                            <span className="text-[11px] text-gray-400 font-medium">Sent ratio</span>
                                                            <span className="text-[11px] font-bold text-emerald-600">{ratio}%</span>
                                                        </div>
                                                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-gradient-to-r from-emerald-400 to-green-500 rounded-full transition-all duration-700"
                                                                style={{ width: `${ratio}%` }}
                                                            />
                                                        </div>
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ══════════════════════════════════════════════════════════
                    CREATE CLAIM MODAL
                ══════════════════════════════════════════════════════════ */}
                        {showCreateModal && (
                            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                                <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8">
                                    <div className="flex justify-between items-center mb-6">
                                        <h2 className="text-2xl font-bold text-green-800">Create New Claim</h2>
                                        <button
                                            onClick={() => { setShowCreateModal(false); setCreateError(null); }}
                                            className="text-gray-500 hover:text-gray-700"
                                        >
                                            <X size={24} />
                                        </button>
                                    </div>
                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Claimant Name</label>
                                            <input
                                                type="text"
                                                name="claimant_name"
                                                value={formData.claimant_name}
                                                onChange={handleChange}
                                                placeholder="e.g. John Doe"
                                                className="w-full px-4 py-3 border border-green-200 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-green-400 bg-white/70"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Claim Type</label>
                                            <select
                                                name="claim_type"
                                                value={formData.claim_type}
                                                onChange={handleChange}
                                                className="w-full px-4 py-3 border border-green-200 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-green-400 bg-white/70"
                                            >
                                                {CLAIM_TYPES.map((type) => (
                                                    <option key={type} value={type}>
                                                        {type === "learning" ? "Learner" : type.charAt(0).toUpperCase() + type.slice(1)}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Council</label>
                                            <select
                                                name="council"
                                                value={formData.council}
                                                onChange={handleChange}
                                                className="w-full px-4 py-3 border border-green-200 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-green-400 bg-white/70"
                                            >
                                                {COUNCIL_OPTIONS.slice(1).map((opt) => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Claim ID (optional)</label>
                                            <input
                                                type="text"
                                                name="claim_id"
                                                value={formData.claim_id}
                                                onChange={handleChange}
                                                placeholder="e.g. TC-333"
                                                className="w-full px-4 py-3 border border-green-200 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-green-400 bg-white/70"
                                            />
                                        </div>
                                        {createError && (
                                            <p className="text-red-600 text-sm font-medium">{createError}</p>
                                        )}
                                        <div className="flex gap-3 pt-4">
                                            <button
                                                type="button"
                                                onClick={() => { setShowCreateModal(false); setCreateError(null); }}
                                                className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-xl transition"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={creating}
                                                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-3 px-10 rounded-xl shadow-lg transition disabled:opacity-60 flex items-center justify-center gap-2"
                                            >
                                                {creating ? (
                                                    <>
                                                        <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                        Creating...
                                                    </>
                                                ) : "Create Claim"}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}

                        {/* ══════════════════════════════════════════════════════════
                    ADD UPDATE MODAL
                ══════════════════════════════════════════════════════════ */}
                        {updateModalState.type === 'add' && (
                            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
                                    <div className="flex justify-between items-center mb-6">
                                        <h2 className="text-2xl font-bold text-green-800">Add Update</h2>
                                        <button
                                            onClick={() => setUpdateModalState({ type: null, claim_id: null })}
                                            className="text-gray-500 hover:text-gray-700"
                                        >
                                            <X size={24} />
                                        </button>
                                    </div>
                                    <form onSubmit={submitAddUpdate} className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Date</label>
                                            <input
                                                type="date"
                                                value={updateDate}
                                                onChange={(e) => setUpdateDate(e.target.value)}
                                                required
                                                className="w-full px-4 py-3 border border-green-200 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-green-400 bg-white/70"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Message</label>
                                            <textarea
                                                value={updateMessage}
                                                onChange={(e) => setUpdateMessage(e.target.value)}
                                                placeholder="Write an update..."
                                                required
                                                rows={4}
                                                className="w-full px-4 py-3 border border-green-200 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-green-400 bg-white/70 resize-none"
                                            />
                                        </div>
                                        <div className="flex gap-3 pt-4">
                                            <button
                                                type="button"
                                                onClick={() => setUpdateModalState({ type: null, claim_id: null })}
                                                className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-xl transition"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={addingUpdate}
                                                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-3 px-10 rounded-xl shadow-lg transition disabled:opacity-60 flex items-center justify-center gap-2"
                                            >
                                                {addingUpdate ? (
                                                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                ) : "Save Update"}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}

                        {/* ══════════════════════════════════════════════════════════
                    VIEW UPDATES MODAL
                ══════════════════════════════════════════════════════════ */}
                        {updateModalState.type === 'view' && (
                            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                                <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 flex flex-col max-h-[80vh]">
                                    <div className="flex justify-between items-center mb-6">
                                        <h2 className="text-2xl font-bold text-green-800 flex items-center gap-2">
                                            Updates for {updateModalState.claim_id?.toUpperCase()}
                                        </h2>
                                        <button
                                            onClick={() => setUpdateModalState({ type: null, claim_id: null })}
                                            className="text-gray-500 hover:text-gray-700"
                                        >
                                            <X size={24} />
                                        </button>
                                    </div>
                                    
                                    <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                                        {updatesList.length === 0 ? (
                                            <div className="text-center py-10 text-gray-500">
                                                No updates available for this claim.
                                            </div>
                                        ) : (
                                            updatesList.map((update, idx) => (
                                                <div key={idx} className="p-4 border border-green-100 rounded-xl bg-green-50/30">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-1 rounded">
                                                            {formatDateTime(update.date)}
                                                        </span>
                                                        <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
                                                            <User size={12} /> {update.user}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{update.message.toUpperCase()}</p>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    
                                    <div className="mt-6 flex justify-end">
                                        <button
                                            onClick={() => setUpdateModalState({ type: null, claim_id: null })}
                                            className="px-6 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-xl transition"
                                        >
                                            Close
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ══════════════════════════════════════════════════════════
                    FILTERS
                ══════════════════════════════════════════════════════════ */}
                        <div className="space-y-6">
                            <div className="bg-white/70 backdrop-blur-sm border border-green-100 rounded-xl shadow-lg p-5">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-8 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Search</label>
                                        <input
                                            type="text"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            placeholder="Claimant / ID..."
                                            className="w-full px-3 py-2 text-sm border border-green-200 rounded-lg focus:ring-2 focus:ring-green-400 bg-white/80"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                                        <select
                                            value={selectedType}
                                            onChange={(e) => setSelectedType(e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-green-200 rounded-lg focus:ring-2 focus:ring-green-400 bg-white/80"
                                        >
                                            <option value="">All Types</option>
                                            {CLAIM_TYPES.map(type => (
                                                <option key={type} value={type}>
                                                    {type === "learning" ? "Learner" : type.charAt(0).toUpperCase() + type.slice(1)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Council</label>
                                        <select
                                            value={selectedCouncil}
                                            onChange={(e) => setSelectedCouncil(e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-green-200 rounded-lg focus:ring-2 focus:ring-green-400 bg-white/80"
                                        >
                                            {COUNCIL_OPTIONS.map((opt) => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Stages</label>
                                        <select
                                            value={selectedStage}
                                            onChange={(e) => setSelectedStage(e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-green-200 rounded-lg focus:ring-2 focus:ring-green-400 bg-white/80"
                                        >
                                            <option value="">All Stages</option>
                                            {Object.entries(STATUS_COLORS)
                                                .filter(([k]) => k !== "default")
                                                .map(([s, d]) => (
                                                    <option key={s} value={s}>
                                                        Stage {d.number} – {d.label}
                                                    </option>
                                                ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                                        <select
                                            value={statusFilter}
                                            onChange={(e) => setStatusFilter(e.target.value as any)}
                                            className="w-full px-3 py-2 text-sm border border-green-200 rounded-lg focus:ring-2 focus:ring-green-400 bg-white/80"
                                        >
                                            <option value="all">All Status</option>
                                            <option value="Active">Active</option>
                                            <option value="Non Active">Non Active</option>
                                            <option value="Closed">Closed</option>
                                        </select>
                                    </div>
                                    <div className="flex flex-col sm:flex-row sm:items-end gap-2">
                                        <div className="flex-1">
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Date Range</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="date"
                                                    value={startDate}
                                                    onChange={(e) => setStartDate(e.target.value)}
                                                    className="flex-1 px-3 py-2 text-sm border border-green-200 rounded-lg focus:ring-2 focus:ring-green-400 bg-white/80"
                                                />
                                                <input
                                                    type="date"
                                                    value={endDate}
                                                    onChange={(e) => setEndDate(e.target.value)}
                                                    className="flex-1 px-3 py-2 text-sm border border-green-200 rounded-lg focus:ring-2 focus:ring-green-400 bg-white/80"
                                                />
                                            </div>
                                        </div>
                                        <button
                                            onClick={clearFilters}
                                            className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition border border-gray-300 w-full sm:w-auto"
                                        >
                                            Clear
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mb-6 mt-6 text-sm font-medium text-green-700 px-4 py-3 bg-white border border-green-200 rounded-lg inline-block">
                            Showing <span className="font-bold text-green-800">{claims.length}</span> of{" "}
                            <span className="font-bold text-green-800">{allClaims.length}</span> claims
                        </div>

                        {/* ══════════════════════════════════════════════════════════
                    TABLE
                ══════════════════════════════════════════════════════════ */}
                        {renderedTableContent}
                    </>
                )}
            </main>
        </div>
    );
}