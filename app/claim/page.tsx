"use client";
import { useState, useEffect, FormEvent, ChangeEvent, useRef, useMemo } from "react";
import Link from "next/link";
import api from "@/lib/axios";
import { useRouter } from "next/navigation";
import { Eye, Trash2, Pencil, Check, X, Loader2, Lock, Unlock, Plus, TrendingUp, FileText, Clock, CheckCircle2, AlertCircle, BarChart3, Receipt, Car, Crown, BookOpen, User, LayoutGrid, MessageSquarePlus, Activity } from "lucide-react";
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
    latest_vehicle_reg: string | null;
    updates?: any[];
}

type SortColumn =
    | "claim_id"
    | "claimant_name"
    | "claim_type"
    | "latest_vehicle_reg"
    | "claim_start_date"
    | "hire_start_date"
    | "pay_date"
    | "hire_end_date"
    | "count"
    | "invoice_datetime"
    | "council"
    | "status";

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
    { value: "Watford", label: "Watford" },
];

const STATUS_COLORS: Record<string, { color: string; number: number; label: string; badgeBg: string; badgeText: string }> = {
    "claim created": { color: "text-gray-900", number: 1, label: "Claim Created", badgeBg: "border-gray-900", badgeText: "bg-gray-900" },
    "hire start": { color: "text-gray-900", number: 2, label: "Active Hire", badgeBg: "border-gray-900", badgeText: "bg-gray-900" },
    "client paid": { color: "text-gray-900", number: 3, label: "Settled in Hire", badgeBg: "border-gray-900", badgeText: "bg-gray-900" },
    "hire end": { color: "text-orange-300", number: 4, label: "Hire End", badgeBg: "border-orange-300", badgeText: "bg-orange-300" },
    "invoice sent": { color: "text-green-600", number: 5, label: "Invoice Sent", badgeBg: "border-green-600", badgeText: "bg-green-600" },
    default: { color: "text-gray-500", number: 0, label: "Unknown", badgeBg: "border-gray-100", badgeText: "bg-gray-400" },
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

export default function ClaimsDashboard() {
    const router = useRouter();

    const [claims, setClaims] = useState<Claim[]>([]);
    const [allClaims, setAllClaims] = useState<Claim[]>([]);
    const [vehiclesCount, setVehiclesCount] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
    const [sortDirection, setSortDirection] = useState<SortDirection>(null);

    // Filters
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedType, setSelectedType] = useState("");
    const [selectedCouncil, setSelectedCouncil] = useState("");
    const [selectedStage, setSelectedStage] = useState("claim created");
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
    const [updateModalState, setUpdateModalState] = useState<{ type: 'add' | 'view' | 'edit' | null, claim_id: string | null, update_id?: number | null }>({ type: null, claim_id: null });
    const [updateMessage, setUpdateMessage] = useState("");
    const [updateDate, setUpdateDate] = useState(new Date().toISOString().slice(0, 10));
    const [updatesList, setUpdatesList] = useState<any[]>([]);
    const [addingUpdate, setAddingUpdate] = useState(false);
    const [editingUpdateId, setEditingUpdateId] = useState<number | null>(null);

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
        "name" | "council" | "claim_type" | "claim_start_date" | "pay_date" | "invoice_datetime" | "hire_start_date" | "hire_end_date" | null
    >(null);
    const [savingClaimId, setSavingClaimId] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const selectRef = useRef<HTMLSelectElement>(null);
    const typeRef = useRef<HTMLSelectElement>(null);
    const dateInputRef = useRef<HTMLInputElement>(null);
    const tableRef = useRef<HTMLDivElement>(null);

    const isClaimClosed = (claim: Claim) => !!(claim.closed_date && claim.closed_by) || claim.status?.toLowerCase() === "close claim";

    const getHireCount = (start: string | null, end: string | null) => {
        if (!start) return null;
        const startDate = new Date(start);
        startDate.setHours(0, 0, 0, 0);

        const endDate = end ? new Date(end) : new Date();
        endDate.setHours(0, 0, 0, 0);

        const diffTime = endDate.getTime() - startDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return diffDays;
    };

    const isValidDate = (dateStr: string | null | undefined): boolean => {
        if (!dateStr) return false;
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return false;
        if (d.getFullYear() <= 1971) return false;
        return true;
    };

    const getStageFromDates = (claim: Claim): string => {
        if (isClaimClosed(claim)) {
            return "closed";
        }

        if (isValidDate(claim.invoice_datetime)) {
            return "invoice sent";
        }
        if (isValidDate(claim.hire_end_date)) {
            return "hire end";
        }
        if (isValidDate(claim.pay_date)) {
            return "client paid";
        }
        if (isValidDate(claim.hire_start_date)) {
            return "hire start";
        }
        if (isValidDate(claim.claim_start_date)) {
            return "claim created";
        }
        return "claim created";
    };

    const getStageNumber = (claim: Claim): number => {
        const stage = getStageFromDates(claim);
        return STATUS_COLORS[stage]?.number || 0;
    };

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
    }, [selectedType, selectedCouncil, selectedStage, searchTerm, startDate, endDate]);

    const fetchClaims = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get("/api/claims", {
                headers: { requiresAuth: true },
            });
            setAllClaims(res.data);

            try {
                const vehiclesRes = await api.get("/api/cars/free/count", { headers: { requiresAuth: true } });
                setVehiclesCount(vehiclesRes.data.count);
            } catch (err) {
                console.error("Failed to fetch vehicles count", err);
            }
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
        let filtered = allClaims.filter(claim => !isClaimClosed(claim));

        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase().trim();
            filtered = filtered.filter(
                (claim) =>
                    claim.claimant_name?.toLowerCase().includes(term) ||
                    claim.claim_id.toLowerCase().includes(term) ||
                    claim.latest_vehicle_reg?.toLowerCase().includes(term)
            );
        }

        if (selectedType) {
            filtered = filtered.filter((claim) => claim.claim_type === selectedType);
        }

        if (selectedCouncil) {
            filtered = filtered.filter((claim) => claim.council === selectedCouncil);
        }

        if (selectedStage) {
            if (selectedStage === "claim created") {
                filtered = filtered.filter((claim) => {
                    const stage = getStageFromDates(claim);
                    return stage === "claim created" || stage === "hire start";
                });
            } else {
                filtered = filtered.filter((claim) => {
                    const stage = getStageFromDates(claim);
                    return stage === selectedStage;
                });
            }
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
                let aVal: any = a[sortColumn as keyof Claim] ?? "";
                let bVal: any = b[sortColumn as keyof Claim] ?? "";

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
                    const aNum = getStageNumber(a);
                    const bNum = getStageNumber(b);
                    const comparison = aNum - bNum;
                    return sortDirection === "asc" ? comparison : -comparison;
                }

                if (sortColumn === "count") {
                    const aCount = getHireCount(a.hire_start_date, a.hire_end_date) ?? -Infinity;
                    const bCount = getHireCount(b.hire_start_date, b.hire_end_date) ?? -Infinity;
                    const comparison = aCount - bCount;
                    return sortDirection === "asc" ? comparison : -comparison;
                }

                if (["claim_start_date", "hire_start_date", "pay_date", "hire_end_date", "invoice_datetime"].includes(sortColumn as string)) {
                    let field: "claim_start_date" | "hire_start_date" | "pay_date" | "hire_end_date" | "invoice_datetime" = "claim_start_date";
                    if (sortColumn === "hire_start_date") field = "hire_start_date";
                    if (sortColumn === "pay_date") field = "pay_date";
                    if (sortColumn === "hire_end_date") field = "hire_end_date";
                    if (sortColumn === "invoice_datetime") field = "invoice_datetime";
                    const sentinel = sortDirection === "asc" ? Infinity : -Infinity;
                    aVal = a[field] ? new Date(a[field]!).getTime() : sentinel;
                    bVal = b[field] ? new Date(b[field]!).getTime() : sentinel;
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
        startDate,
        endDate,
        sortColumn,
        sortDirection
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

    const openAddUpdate = (claim_id: string) => {
        setUpdateModalState({ type: 'add', claim_id });
        setUpdateMessage("");
        setUpdateDate(new Date().toISOString().slice(0, 10));
        setEditingUpdateId(null);
    };

    const openViewUpdates = (claim: Claim) => {
        setUpdateModalState({ type: 'view', claim_id: claim.claim_id });
        const sorted = [...(claim.updates || [])].sort((a: any, b: any) => {
            const dateA = new Date(a.date || 0).getTime();
            const dateB = new Date(b.date || 0).getTime();
            return (isNaN(dateB) ? 0 : dateB) - (isNaN(dateA) ? 0 : dateA);
        });
        setUpdatesList(sorted);
        setEditingUpdateId(null);
    };

    const openEditUpdate = (claim_id: string, update: any) => {
        setUpdateModalState({ type: 'edit', claim_id, update_id: update.id });
        setUpdateMessage(update.message || "");
        setUpdateDate(update.date ? new Date(update.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
        setEditingUpdateId(update.id);
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

    const submitEditUpdate = async (e: FormEvent) => {
        e.preventDefault();
        const claimId = updateModalState.claim_id;
        const updateId = updateModalState.update_id;
        if (!claimId || !updateId || !updateMessage.trim()) return;

        setAddingUpdate(true);
        try {
            const now = new Date();
            const [year, month, day] = updateDate.split('-');
            const finalDate = new Date(Number(year), Number(month) - 1, Number(day), now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());

            await api.put(`/api/claims/${claimId}/updates/${updateId}`, {
                update: {
                    message: updateMessage.trim(),
                    date: finalDate.toISOString()
                }
            }, { headers: { requiresAuth: true } });

            setUpdateModalState({ type: null, claim_id: null });
            await fetchClaims();
        } catch (err: any) {
            console.error(err);
            if (err.response?.status === 403) {
                alert("You can only edit updates you created.");
            } else {
                alert("Failed to edit update. Please try again.");
            }
        } finally {
            setAddingUpdate(false);
        }
    };

    const startEditing = (
        claim: Claim,
        field: "name" | "council" | "claim_type" | "claim_start_date" | "pay_date" | "invoice_datetime" | "hire_start_date" | "hire_end_date"
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
        } else if (field === "invoice_datetime") {
            setEditInvoiceDate(claim.invoice_datetime ? claim.invoice_datetime.slice(0, 10) : "");
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
                else if (editingField === "invoice_datetime") payload.invoice_datetime = editInvoiceDate || null;

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
                            if (editingField === "invoice_datetime") return { ...c, invoice_datetime: editInvoiceDate || null };
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
        setSelectedStage("claim created");
        setStartDate("");
        setEndDate("");
        setSortColumn(null);
        setSortDirection(null);
    };

    const summary = useMemo(() => {
        const activeClaims = allClaims.filter(c =>
            !isClaimClosed(c) && getStageFromDates(c) !== "invoice sent"
        );
        const activeHire = activeClaims.filter(c =>
            getStageFromDates(c) === "hire start" && !c.is_disputed
        ).length;

        const settledInHire = activeClaims.filter(c =>
            getStageFromDates(c) === "client paid" && !c.is_disputed
        ).length;

        const hireEnd = activeClaims.filter(c =>
            getStageFromDates(c) === "hire end" && !c.is_disputed
        ).length;

        const invoiceSent = activeClaims.filter(c =>
            getStageFromDates(c) === "invoice sent" && !c.is_disputed
        ).length;

        let filteredForTypes;
        if (selectedStage === "claim created") {
            filteredForTypes = activeClaims.filter(c =>
                getStageFromDates(c) === "claim created" || getStageFromDates(c) === "hire start"
            );
        } else if (selectedStage) {
            filteredForTypes = activeClaims.filter(c => getStageFromDates(c) === selectedStage);
        } else {
            filteredForTypes = activeClaims;
        }

        const typeBreakdown = CLAIM_TYPES.filter(t => t !== "vehicle damage").map(type => ({
            type,
            count: filteredForTypes.filter(c => c.claim_type?.toLowerCase() === type).length,
        }));

        const councilBreakdown = COUNCIL_OPTIONS
            .slice(1)
            .filter(opt => opt.value !== "None")
            .map(opt => ({
                council: opt.value,
                label: opt.label,
                count: filteredForTypes.filter(c => (c.council || "None") === opt.value).length,
            }));

        return {
            vehicles: vehiclesCount,
            activeHire,
            settledInHire,
            hireEnd,
            invoiceSent,
            typeBreakdown,
            councilBreakdown,
            totalInViewForTypes: filteredForTypes.length
        };
    }, [allClaims, vehiclesCount, selectedStage]);

    const getStageBadge = (claim: Claim) => {
        const stage = getStageFromDates(claim);
        const statusData = STATUS_COLORS[stage] || STATUS_COLORS.default;
        return {
            number: statusData.number,
            label: statusData.label,
            color: statusData.color,
            badgeBg: statusData.badgeBg,
            badgeText: statusData.badgeText
        };
    };

    const renderDateCell = (
        claim: Claim,
        field: "claim_start_date" | "pay_date" | "invoice_datetime" | "hire_start_date" | "hire_end_date",
        editValue: string,
        setEditValue: (v: string) => void,
        isVehicleDamageBlocked: boolean = false
    ) => {
        const isEditing = editingClaimId === claim.claim_id && editingField === field;
        const isSaving = savingClaimId === claim.claim_id;
        const isVehicleDamage = claim.claim_type === "vehicle damage";

        if (isVehicleDamageBlocked && isVehicleDamage) {
            return (
                <td className="px-1 py-1 text-center whitespace-nowrap border-r border-gray-300">
                    <hr className="border-emerald-500 border-[2px] w-[50%] mx-auto" />
                </td>
            );
        }
        return (
            <td className="px-2 py-1 text-center text-gray-700 whitespace-nowrap border-r border-gray-300">
                {isEditing ? (
                    <div className="flex items-center justify-center gap-1">
                        <input
                            ref={dateInputRef}
                            type="date"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => handleEditKeyDown(e, claim.claim_id)}
                            disabled={isSaving}
                            autoFocus
                            className={`flex-1 px-1 py-0.5 border rounded focus:outline-none focus:ring-1 min-w-[110px] text-[11px]
                                ${isSaving ? "border-gray-300 bg-gray-50 text-gray-500" : "border-green-400 focus:ring-green-500 bg-white"}`}
                        />
                        {isSaving ? (
                            <Loader2 size={14} className="text-green-600 animate-spin" />
                        ) : (
                            <>
                                <button onClick={() => setEditValue("")} title="Clear Date" disabled={isSaving} className="p-0.5 text-orange-500 hover:text-orange-700 disabled:opacity-50">
                                    <Trash2 size={14} />
                                </button>
                                <button onClick={() => saveEdit(claim.claim_id)} disabled={isSaving} title="Save" className="p-0.5 text-green-600 hover:text-green-800 disabled:opacity-50">
                                    <Check size={14} />
                                </button>
                                <button onClick={cancelEdit} disabled={isSaving} title="Cancel" className="p-0.5 text-red-600 hover:text-red-800 disabled:opacity-50">
                                    <X size={14} />
                                </button>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="group flex items-center justify-center gap-1.5">
                        <span className={isSaving ? "opacity-50" : ""}>{formatDate(claim[field])}</span>
                        {!isSaving && (
                            <button
                                onClick={(e) => { e.stopPropagation(); startEditing(claim, field); }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-gray-500 hover:text-green-700 flex-shrink-0"
                                title={`Edit ${field.replace(/_/g, " ")}`}
                            >
                                <Pencil size={12} />
                            </button>
                        )}
                    </div>
                )}
            </td>
        );
    };

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
                        {searchTerm || selectedType || selectedCouncil || selectedStage || startDate || endDate
                            ? "No matching hire found"
                            : "No hire yet — create one above!"}
                    </p>
                </div>
            );
        }

        return (
            <div ref={tableRef}>
                <div className="overflow-x-auto overflow-y-auto max-h-[500px]">
                    <table className="w-full divide-y divide-gray-400 text-[11px] rounded-md min-w-max">
                        <thead className="sticky top-0 bg-green-50/95 backdrop-blur-sm z-20">
                            <tr className="border-0 bg-transparent">
                                <th className="border-0 bg-transparent p-0" colSpan={1} />
                                <th className="border-0 bg-transparent p-0" colSpan={1} />
                                <th className="border-0 bg-transparent p-0" colSpan={1} />
                                <th className="border-0 bg-transparent p-0" colSpan={1} />
                                <th className="border-0 bg-transparent p-0" colSpan={1} />
                                <th
                                    colSpan={4}
                                    className="px-2 py-1 text-center bg-green-800"
                                    style={{ borderRadius: "8px 8px 0 0" }}
                                >
                                    <div className="flex justify-center items-center w-full">
                                        <span className="text-[11px] font-bold text-white uppercase tracking-widest">
                                            — Hire Progress —
                                        </span>
                                    </div>
                                </th>
                                <th className="border-0 bg-transparent p-0" colSpan={1} />
                                <th className="border-0 bg-transparent p-0" colSpan={1} />
                            </tr>
                            <tr className="border-b border-gray-500">
                                <th onClick={() => handleSort("claim_id")} className="px-1 py-1 text-left font-semibold text-green-800 border-r border-gray-400 cursor-pointer hover:bg-green-100/50 whitespace-nowrap">
                                    Claim ID {getSortArrow("claim_id")}
                                </th>
                                <th onClick={() => handleSort("claimant_name")} className="px-1 py-1 text-left font-semibold text-green-800 border-r border-gray-400 cursor-pointer hover:bg-green-100/50 whitespace-nowrap">
                                    Claimant {getSortArrow("claimant_name")}
                                </th>
                                <th onClick={() => handleSort("claim_type")} className="px-1 py-1 text-left font-semibold text-green-800 border-r border-gray-400 cursor-pointer hover:bg-green-100/50 whitespace-nowrap">
                                    Type {getSortArrow("claim_type")}
                                </th>
                                <th onClick={() => handleSort("latest_vehicle_reg")} className="px-1 py-1 text-left font-semibold text-green-800 border-r border-gray-400 cursor-pointer hover:bg-green-100/50 whitespace-nowrap">
                                    Reg {getSortArrow("latest_vehicle_reg")}
                                </th>
                                <th onClick={() => handleSort("council")} className="px-1 py-1 text-left font-semibold text-green-800 border-r border-gray-400 cursor-pointer hover:bg-green-100/50 whitespace-nowrap">
                                    Council {getSortArrow("council")}
                                </th>
                                <th onClick={() => handleSort("claim_start_date")} className="px-1 py-1 text-center font-semibold text-green-800 border-r border-gray-400 cursor-pointer hover:bg-green-100/50 whitespace-nowrap">
                                    <div className="flex flex-col items-center justify-center gap-0.5">
                                        <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">1</span>
                                        <span>Start Date {getSortArrow("claim_start_date")}</span>
                                    </div>
                                </th>
                                <th onClick={() => handleSort("hire_start_date")} className="px-1 py-1 text-center font-semibold text-green-800 border-r border-gray-400 cursor-pointer hover:bg-green-100/50 whitespace-nowrap">
                                    <div className="flex flex-col items-center justify-center gap-0.5">
                                        <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">2</span>
                                        <span>Active Hire {getSortArrow("hire_start_date")}</span>
                                    </div>
                                </th>
                                <th onClick={() => handleSort("pay_date")} className="px-1 py-1 text-center font-semibold text-green-800 border-r border-gray-400 cursor-pointer hover:bg-green-100/50 whitespace-nowrap">
                                    <div className="flex flex-col items-center justify-center gap-0.5">
                                        <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">3</span>
                                        <span>Settled Date {getSortArrow("pay_date")}</span>
                                    </div>
                                </th>
                                <th onClick={() => handleSort("hire_end_date")} className="px-1 py-1 text-center font-semibold text-green-800 border-r border-gray-400 cursor-pointer hover:bg-green-100/50 whitespace-nowrap">
                                    <div className="flex flex-col items-center justify-center gap-0.5">
                                        <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">4</span>
                                        <span>Hire End {getSortArrow("hire_end_date")}</span>
                                    </div>
                                </th>
                                <th onClick={() => handleSort("count")} className="px-1 py-1 text-center font-semibold text-green-800 border-r border-gray-400 cursor-pointer hover:bg-green-100/50 whitespace-nowrap">
                                    <div className="flex flex-col items-center justify-center gap-0.5">
                                        <span>Days {getSortArrow("count")}</span>
                                    </div>
                                </th>
                                <th className="px-1 py-1 text-center font-semibold text-green-800 border-r border-gray-400 whitespace-nowrap">
                                    Updates
                                </th>
                                <th onClick={() => handleSort("status")} className="px-1 py-1 text-left font-semibold text-green-800 border-r border-gray-400 cursor-pointer hover:bg-green-100/50 whitespace-nowrap">
                                    Stages {getSortArrow("status")}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-300 bg-white">
                            {claims.map((claim) => {
                                const isEditing = editingClaimId === claim.claim_id;
                                const isSaving = savingClaimId === claim.claim_id;
                                const isClosed = isClaimClosed(claim);
                                const stageInfo = getStageBadge(claim);
                                const isVehicleDamage = claim.claim_type === "vehicle damage";
                                const rowBgColor = claim.is_disputed ? "bg-red-200/50" : "bg-white";
                                const hoverBgColor = claim.is_disputed ? "hover:bg-red-200/80" : "hover:bg-green-100/80";
                                const hireCount = getHireCount(claim.hire_start_date, claim.hire_end_date);

                                return (
                                    <tr key={claim.claim_id} className={`${rowBgColor} ${hoverBgColor} transition-colors`}>
                                        <td className="px-1 py-0.5 font-medium text-green-800 border-r border-gray-300 whitespace-nowrap text-left">
                                            <a
                                                href={`/claim/${claim.claim_id}`}
                                                className="cursor-pointer hover:text-green-600 hover:underline"
                                            >
                                                {claim.claim_id.toUpperCase()}
                                            </a>
                                        </td>
                                        <td className="px-1 py-0.5 text-gray-700 border-r border-gray-300 whitespace-nowrap">
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
                                                        className={`flex-1 px-1 py-0.5 border rounded text-[11px] focus:outline-none focus:ring-1 
                                                                    ${isSaving ? "border-gray-300 bg-gray-50 text-gray-500" : "border-green-400 focus:ring-green-500 bg-white"}`}
                                                    />
                                                    {isSaving ? (
                                                        <Loader2 size={14} className="text-green-600 animate-spin" />
                                                    ) : (
                                                        <>
                                                            <button onClick={() => saveEdit(claim.claim_id)} disabled={isSaving} title="Save" className="p-0.5 text-green-600 hover:text-green-800 disabled:opacity-50"><Check size={14} /></button>
                                                            <button onClick={cancelEdit} disabled={isSaving} title="Cancel" className="p-0.5 text-red-600 hover:text-red-800 disabled:opacity-50"><X size={14} /></button>
                                                        </>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="group flex items-center gap-1.5">
                                                    <span className={`whitespace-nowrap ${isSaving ? "opacity-50" : ""}`}>
                                                        {(claim.claimant_name || "—").toUpperCase()}
                                                    </span>
                                                    {!isSaving && (
                                                        <button onClick={(e) => { e.stopPropagation(); startEditing(claim, "name"); }} className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-gray-500 hover:text-green-700 flex-shrink-0" title="Edit claimant name">
                                                            <Pencil size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-1 py-0.5 text-gray-700 border-r border-gray-300 whitespace-nowrap">
                                            {isEditing && editingField === "claim_type" ? (
                                                <div className="flex items-center gap-1.5">
                                                    <select
                                                        ref={typeRef}
                                                        value={editTypeValue}
                                                        onChange={(e) => setEditTypeValue(e.target.value)}
                                                        onKeyDown={(e) => handleEditKeyDown(e, claim.claim_id)}
                                                        disabled={isSaving}
                                                        autoFocus
                                                        className={`flex-1 px-1 py-0.5 border rounded text-[11px] focus:outline-none focus:ring-1 ${isSaving ? "border-gray-300 bg-gray-50 text-gray-500" : "border-green-400 focus:ring-green-500 bg-white"}`}
                                                    >
                                                        {CLAIM_TYPES.map((type) => (
                                                            <option key={type} value={type}>
                                                                {type === "learning" ? "Learner" : type.charAt(0).toUpperCase() + type.slice(1)}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    {isSaving ? (
                                                        <Loader2 size={14} className="text-green-600 animate-spin" />
                                                    ) : (
                                                        <>
                                                            <button onClick={() => saveEdit(claim.claim_id)} disabled={isSaving} title="Save" className="p-0.5 text-green-600 hover:text-green-800 disabled:opacity-50"><Check size={14} /></button>
                                                            <button onClick={cancelEdit} disabled={isSaving} title="Cancel" className="p-0.5 text-red-600 hover:text-red-800 disabled:opacity-50"><X size={14} /></button>
                                                        </>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="group flex items-center gap-1.5 whitespace-nowrap">
                                                    <span>{claim.claim_type ? (claim.claim_type === "learning" ? "Learner" : claim.claim_type.charAt(0).toUpperCase() + claim.claim_type.slice(1)) : "—"}</span>
                                                    {!isSaving && (
                                                        <button onClick={(e) => { e.stopPropagation(); startEditing(claim, "claim_type"); }} className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-gray-500 hover:text-green-700" title="Edit claim type">
                                                            <Pencil size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-1 py-0.5 text-gray-700 border-r border-gray-300 whitespace-nowrap text-center">
                                            {claim.latest_vehicle_reg ? (
                                                <span className="inline-block px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-[10px] font-mono font-semibold text-gray-800 tracking-wider uppercase">
                                                    {claim.latest_vehicle_reg}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400">—</span>
                                            )}
                                        </td>
                                        <td className="px-1 py-0.5 border-r border-gray-300 text-center whitespace-nowrap">
                                            {isVehicleDamage ? (
                                                <hr className="border-emerald-500 border-[2px]  w-[50%] text-center mx-auto" />
                                            ) : isEditing && editingField === "council" ? (<div className="flex items-center gap-1.5">
                                                <select
                                                    ref={selectRef}
                                                    value={editCouncilValue}
                                                    onChange={(e) => setEditCouncilValue(e.target.value)}
                                                    onKeyDown={(e) => handleEditKeyDown(e, claim.claim_id)}
                                                    disabled={isSaving}
                                                    autoFocus
                                                    className={`flex-1 px-1 py-0.5 border rounded text-[11px] focus:outline-none focus:ring-1 ${isSaving ? "border-gray-300 bg-gray-50 text-gray-500" : "border-green-400 focus:ring-green-500 bg-white"}`}
                                                >
                                                    {COUNCIL_OPTIONS.slice(1).map((opt) => (
                                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                    ))}
                                                </select>
                                                {isSaving ? (
                                                    <Loader2 size={14} className="text-green-600 animate-spin" />
                                                ) : (
                                                    <>
                                                        <button onClick={() => saveEdit(claim.claim_id)} disabled={isSaving} title="Save" className="p-0.5 text-green-600 hover:text-green-800 disabled:opacity-50"><Check size={14} /></button>
                                                        <button onClick={cancelEdit} disabled={isSaving} title="Cancel" className="p-0.5 text-red-600 hover:text-red-800 disabled:opacity-50"><X size={14} /></button>
                                                    </>
                                                )}
                                            </div>
                                            ) : (
                                                <div className="group flex items-center gap-1.5 whitespace-nowrap">
                                                    <span>{(claim.council || "—")}</span>
                                                    {!isSaving && (
                                                        <button onClick={(e) => { e.stopPropagation(); startEditing(claim, "council"); }} className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-gray-500 hover:text-green-700" title="Edit council">
                                                            <Pencil size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        {renderDateCell(claim, "claim_start_date", editClaimStartDate, setEditClaimStartDate, false)}
                                        {renderDateCell(claim, "hire_start_date", editHireStartDate, setEditHireStartDate, true)}
                                        {renderDateCell(claim, "pay_date", editPayDate, setEditPayDate, false)}
                                        {renderDateCell(claim, "hire_end_date", editHireEndDate, setEditHireEndDate, true)}

                                        <td className="px-1 py-0.5 text-center text-gray-800 font-semibold border-r border-gray-300 whitespace-nowrap">
                                            {hireCount !== null ? hireCount : "—"}
                                        </td>
                                        <td className="px-1 py-0.5 border-r border-gray-300 text-center whitespace-nowrap">
                                            <div className="flex items-center justify-center gap-1.5">
                                                <button onClick={() => openAddUpdate(claim.claim_id)} title="Add Update" className="text-green-600 hover:text-green-800">
                                                    <Plus size={14} />
                                                </button>
                                                {claim.updates && claim.updates.length > 0 && (
                                                    <button onClick={() => openViewUpdates(claim)} title="View Updates" className="text-blue-600 hover:text-blue-800">
                                                        <FileText size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        <td className="border-r border-gray-300 px-1 py-0.5 whitespace-nowrap">
                                            <div className="flex items-center justify-center">
                                                {isClosed ? (
                                                    <div className="w-3 h-3 bg-gradient-to-br from-rose-500 via-rose-600 to-rose-700 rounded-full" title="Closed"></div>
                                                ) : claim.is_disputed ? (
                                                    <div className="w-4 h-[2px] bg-green-500" title="Disputed"></div>
                                                ) : (
                                                    <span
                                                        className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold border-2
                                                                    ${stageInfo.number >= 4
                                                                ? `${stageInfo.badgeText} text-black border-transparent`
                                                                : `bg-white ${stageInfo.color} ${stageInfo.badgeBg}`
                                                            }`}
                                                    >
                                                        {stageInfo.number}
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

                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-extrabold text-green-800 tracking-tight">
                            Hire Dashboard
                        </h1>
                        <p className="mt-2 text-lg text-green-700/80">
                            Active Hires Overview
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 mt-4 md:mt-0">
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
                            New Hire
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="mb-8 p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl">
                        {error}
                    </div>
                )}

                {loading && (
                    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center">
                        <div className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4">
                            <Loader2 size={48} className="text-green-600 animate-spin" />
                            <p className="text-lg font-semibold text-gray-800">Loading claims...</p>
                            <p className="text-sm text-gray-600">Please wait while we fetch your data</p>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="space-y-8">
                        <div className="flex items-center gap-3">
                            <div className="w-1 h-7 bg-gradient-to-b from-green-500 to-emerald-600 rounded-full" />
                            <h2 className="text-xl font-bold text-green-800 tracking-tight">Overview</h2>
                        </div>
                        <OverviewSkeleton />
                        <div className="flex items-center gap-3 mt-10">
                            <div className="w-1 h-7 bg-gradient-to-b from-green-500 to-emerald-600 rounded-full" />
                            <h2 className="text-xl font-bold text-green-800 tracking-tight">Active Hire</h2>
                        </div>
                        <ClaimsTableSkeleton />
                    </div>
                ) : (
                    <>
                        <div className="mb-10 space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="w-1 h-7 bg-gradient-to-b from-green-500 to-emerald-600 rounded-full" />
                                <h2 className="text-xl font-bold text-green-800 tracking-tight">Overview</h2>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                <button
                                    className="text-left w-full group relative overflow-hidden rounded-3xl p-5 shadow-lg border-2 bg-gradient-to-br from-zinc-800 to-zinc-900 text-white hover:scale-102 hover:shadow-xl transition-all duration-300 border-transparent"
                                >
                                    <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full" />
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Car size={16} className="text-indigo-100" />
                                            <p className="text-[10px] font-semibold text-indigo-100 uppercase tracking-widest">Vehicles</p>
                                        </div>
                                        <p className="text-4xl font-black tracking-tighter">{summary.vehicles}</p>
                                    </div>
                                </button>
                                <button
                                    onClick={() => setSelectedStage(selectedStage === "hire start" ? "claim created" : "hire start")}
                                    className={`text-left w-full group relative overflow-hidden rounded-3xl p-5 shadow-lg border-2 bg-gradient-to-br from-emerald-400 to-green-500 text-white hover:scale-102 hover:shadow-xl transition-all duration-300 ${selectedStage === "hire start" ? "border-yellow-600 ring-4 ring-yellow-400" : "border-transparent"}`}
                                >
                                    <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full" />
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Activity size={16} className="text-emerald-100" />
                                            <p className="text-[10px] font-semibold text-emerald-100 uppercase tracking-widest">Active Hire</p>
                                        </div>
                                        <p className="text-4xl font-black tracking-tighter">{summary.activeHire}</p>
                                    </div>
                                </button>

                                <button
                                    onClick={() => setSelectedStage(selectedStage === "client paid" ? "claim created" : "client paid")}
                                    className={`text-left w-full group relative overflow-hidden rounded-3xl p-5 shadow-lg border-2 bg-gradient-to-br from-cyan-400 to-blue-500 text-white hover:scale-102 hover:shadow-xl transition-all duration-300 ${selectedStage === "client paid" ? "border-yellow-600 ring-4 ring-yellow-400" : "border-transparent"}`}
                                >
                                    <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full" />
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-2 mb-3">
                                            <CheckCircle2 size={16} className="text-cyan-100" />
                                            <p className="text-[10px] font-semibold text-cyan-100 uppercase tracking-widest">Settled in Hire</p>
                                        </div>
                                        <p className="text-4xl font-black tracking-tighter">{summary.settledInHire}</p>
                                    </div>
                                </button>

                                <button
                                    onClick={() => setSelectedStage(selectedStage === "hire end" ? "claim created" : "hire end")}
                                    className={`text-left w-full group relative overflow-hidden rounded-3xl p-5 shadow-lg border-2 bg-gradient-to-br from-amber-400 to-orange-500 text-white hover:scale-102 hover:shadow-xl transition-all duration-300 ${selectedStage === "hire end" ? "border-yellow-600 ring-4 ring-yellow-400" : "border-transparent"}`}
                                >
                                    <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full" />
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Clock size={16} className="text-amber-100" />
                                            <p className="text-[10px] font-semibold text-amber-100 uppercase tracking-widest">Hire End</p>
                                        </div>
                                        <p className="text-4xl font-black tracking-tighter">{summary.hireEnd}</p>
                                    </div>
                                </button>
                            </div>

                            <div className="flex flex-col xl:flex-row xl:items-start gap-4 w-full">
                                <div className="xl:w-[50%] w-full self-start bg-white/90 backdrop-blur-sm border border-green-100 rounded-2xl p-4 shadow-sm">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-5 h-5 rounded-lg bg-green-50 flex items-center justify-center">
                                            <FileText size={12} className="text-green-600" />
                                        </div>
                                        <h3 className="text-xs font-semibold text-green-900 tracking-tight">
                                            Claims by Type {selectedStage === "claim created" ? "(Stage 1 + 2)" : selectedStage ? `(${selectedStage})` : ''}
                                        </h3>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
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
                                            const totalInView = summary.totalInViewForTypes;
                                            const pct = totalInView > 0 ? Math.round((count / totalInView) * 100) : 0;
                                            const displayType = type === "learning" ? "Learner" : type;

                                            return (
                                                <button
                                                    key={type}
                                                    onClick={() => setSelectedType(type === selectedType ? "" : type)}
                                                    className={`relative bg-gradient-to-br ${cfg.gradient} 
                                                        border-2 ${selectedType === type
                                                            ? "border-yellow-300 ring-1 ring-yellow-200 shadow-sm"
                                                            : cfg.border} 
                                                        rounded-xl p-2.5 flex flex-col gap-1 overflow-hidden 
                                                        group hover:shadow-md hover:-translate-y-0.5 
                                                        transition-all duration-200 cursor-pointer w-full text-left`}
                                                >
                                                    <div className="flex items-center justify-between w-full">
                                                        <div className={`w-6 h-6 rounded flex items-center justify-center ${cfg.iconBg}`}>
                                                            <Icon size={12} strokeWidth={2.5} />
                                                        </div>
                                                        <span className={`text-[10px] font-bold ${cfg.text} opacity-75`}>{pct}%</span>
                                                    </div>
                                                    <div className="flex-1 mt-1">
                                                        <p className={`text-2xl font-black leading-none ${cfg.text} tracking-tighter`}>
                                                            {count}
                                                        </p>
                                                        <p className="text-[10px] font-medium text-gray-600 mt-0.5 capitalize truncate">
                                                            {displayType}
                                                        </p>
                                                    </div>
                                                    <div className="h-0.5 bg-black/10 rounded-full overflow-hidden mt-1.5 w-full">
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

                                <div className="xl:w-[65%] w-full bg-white/90 backdrop-blur-sm border border-green-100 rounded-2xl p-4 shadow-sm">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-5 h-5 rounded-lg bg-green-50 flex items-center justify-center">
                                            <LayoutGrid size={12} className="text-green-600" />
                                        </div>
                                        <h3 className="text-xs font-semibold text-green-900 tracking-tight">
                                            Claims by Council {selectedStage === "claim created" ? "(Stage 1 + 2)" : selectedStage ? `(${selectedStage})` : ''}
                                        </h3>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        {summary.councilBreakdown.map(({ council, label, count }) => {
                                            const totalInView = summary.totalInViewForTypes;
                                            const pct = totalInView > 0 ? Math.round((count / totalInView) * 100) : 0;
                                            const isSelected = selectedCouncil === council;

                                            return (
                                                <button
                                                    key={council}
                                                    onClick={() => setSelectedCouncil(isSelected ? "" : council)}
                                                    className={`relative bg-gradient-to-br from-gray-50 to-gray-100 
                                                        border-2 ${isSelected ? "border-yellow-300 ring-1 ring-yellow-200 shadow-sm" : "border-gray-200"} 
                                                        rounded-xl p-2.5 flex flex-col gap-1 overflow-hidden 
                                                        group hover:shadow-md hover:-translate-y-0.5 
                                                        transition-all duration-200 cursor-pointer w-full text-left`}
                                                    title={label}
                                                >
                                                    <div className="flex items-center justify-between w-full">
                                                        <div className="w-6 h-6 rounded flex items-center justify-center bg-gray-200 text-gray-600">
                                                            <LayoutGrid size={11} strokeWidth={2.5} />
                                                        </div>
                                                        <span className="text-[10px] font-bold text-gray-800 opacity-75">{pct}%</span>
                                                    </div>
                                                    <div className="flex-1 mt-1 min-w-0">
                                                        <p className="text-2xl font-black leading-none text-gray-800 tracking-tighter">
                                                            {count}
                                                        </p>
                                                        <p className="text-[10px] font-medium text-gray-600 mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
                                                            {label}
                                                        </p>
                                                    </div>
                                                    <div className="h-0.5 bg-black/10 rounded-full overflow-hidden mt-1.5 w-full">
                                                        <div
                                                            className="h-full rounded-full bg-gray-400 transition-all duration-700"
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {showCreateModal && (
                            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                                <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8">
                                    <div className="flex justify-between items-center mb-6">
                                        <h2 className="text-2xl font-bold text-green-800">Create New Hire</h2>
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
                                                ) : "Create Hire"}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}

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

                        {updateModalState.type === 'edit' && (
                            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
                                    <div className="flex justify-between items-center mb-6">
                                        <h2 className="text-2xl font-bold text-green-800">Edit Update</h2>
                                        <button
                                            onClick={() => setUpdateModalState({ type: null, claim_id: null })}
                                            className="text-gray-500 hover:text-gray-700"
                                        >
                                            <X size={24} />
                                        </button>
                                    </div>
                                    <form onSubmit={submitEditUpdate} className="space-y-4">
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
                                                placeholder="Edit update..."
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
                                                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-10 rounded-xl shadow-lg transition disabled:opacity-60 flex items-center justify-center gap-2"
                                            >
                                                {addingUpdate ? (
                                                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                ) : "Update"}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}

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
                                            updatesList.map((update, idx) => {
                                                const isOwnUpdate = update.user?.toLowerCase() === userName?.toLowerCase();
                                                return (
                                                    <div key={idx} className="p-4 border border-green-100 rounded-xl bg-green-50/30 group">
                                                        <div className="flex justify-between items-center mb-2">
                                                            <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-1 rounded">
                                                                {formatDateTime(update.date)}
                                                            </span>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
                                                                    <User size={12} /> {update.user}
                                                                </span>
                                                                {isOwnUpdate && (
                                                                    <button
                                                                        onClick={() => {
                                                                            const claimId = updateModalState.claim_id;
                                                                            if (claimId) {
                                                                                openEditUpdate(claimId, update);
                                                                            }
                                                                        }}
                                                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-blue-600 hover:text-blue-800"
                                                                        title="Edit this update"
                                                                    >
                                                                        <Pencil size={14} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <p className="text-sm text-gray-800 whitespace-pre-wrap">{update.message.toUpperCase()}</p>
                                                        {!isOwnUpdate && (
                                                            <p className="text-[10px] text-gray-400 mt-1 italic">Only the creator can edit this update</p>
                                                        )}
                                                    </div>
                                                );
                                            })
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

                        <div className="space-y-6">
                            <div className="bg-white/70 backdrop-blur-sm border border-green-100 rounded-xl shadow-lg p-5">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Search</label>
                                        <input
                                            type="text"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            placeholder="Claimant / ID / REG NO..."
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
                                            <option value="claim created">Stage 1 + 2</option>
                                            {Object.entries(STATUS_COLORS)
                                                .filter(([k]) => k !== "default" && k !== "claim created")
                                                .map(([s, d]) => (
                                                    <option key={s} value={s}>
                                                        Stage {d.number} – {d.label}
                                                    </option>
                                                ))}
                                        </select>
                                    </div>
                                    <div className="flex flex-col sm:flex-row sm:items-end gap-2 xl:col-span-2">
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
                                    </div>
                                    <div className="flex items-end">
                                        <button
                                            onClick={clearFilters}
                                            className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition border border-gray-300 w-full"
                                        >
                                            Clear
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mb-6 mt-6 text-sm font-medium text-green-700 px-4 py-3 bg-white border border-green-200 rounded-lg inline-block">
                            Showing <span className="font-bold text-green-800">{claims.length}</span> of{" "}
                            <span className="font-bold text-green-800">
                                {allClaims.filter(c => !isClaimClosed(c) && getStageFromDates(c) !== "invoice sent").length}
                            </span> active hires
                        </div>

                        {renderedTableContent}
                    </>
                )}
            </main>
        </div>
    );
}