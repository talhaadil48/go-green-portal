"use client";
import { useState, useEffect, FormEvent, ChangeEvent, useRef } from "react";
import Link from "next/link";
import api from "@/lib/axios";
import { useRouter } from "next/navigation";
import { Eye, Trash2, Pencil, Check, X, Loader2, Lock, Unlock } from "lucide-react";
import Cookies from "js-cookie";

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
    recently_deleted: boolean;
    recently_deleted_date: string | null;
    closed_date: string | null;
    closed_by: string | null;
    deleted_by: string | null;
    status: string;
}

type SortColumn =
    | "claim_id"
    | "claimant_name"
    | "claim_type"
    | "claim_start_date"
    | "invoice_sent"
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

const STATUS_COLORS: Record<string, string> = {
    "claim created": "bg-green-600",
    "hire start": "bg-purple-600",
    "client paid": "bg-blue-600",
    "hire end": "bg-yellow-600",
    "invoice sent": "bg-indigo-600",
    "close claim": "bg-rose-600",
    default: "bg-gray-500",
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
    const [selectedStatus, setSelectedStatus] = useState("");
    const [activeFilter, setActiveFilter] = useState<"all" | "active" | "closed">("all");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    // Form
    const [formData, setFormData] = useState({
        claim_id: "",
        claimant_name: "",
        claim_type: "",
        council: "",
    });
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);

    // Editing
    const [editingClaimId, setEditingClaimId] = useState<string | null>(null);
    const [editNameValue, setEditNameValue] = useState("");
    const [savingClaimId, setSavingClaimId] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

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

        // Text search
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase().trim();
            filtered = filtered.filter(
                (claim) =>
                    claim.claimant_name?.toLowerCase().includes(term) ||
                    claim.claim_id.toLowerCase().includes(term)
            );
        }

        // Type
        if (selectedType) {
            filtered = filtered.filter((claim) => claim.claim_type === selectedType);
        }

        // Council
        if (selectedCouncil) {
            filtered = filtered.filter((claim) => claim.council === selectedCouncil);
        }

        // Status
        if (selectedStatus) {
            filtered = filtered.filter((claim) => claim.status === selectedStatus);
        }

        // Active / Closed filter
        if (activeFilter === "active") {
            filtered = filtered.filter(
                (claim) => !(claim.closed_date && claim.closed_by)
            );
        } else if (activeFilter === "closed") {
            filtered = filtered.filter(
                (claim) => !!(claim.closed_date && claim.closed_by)
            );
        }
        // "all" → no filtering here

        // Date range
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

        // Sorting
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

                if (sortColumn === "claim_start_date" || sortColumn === "invoice_sent") {
                    const field = sortColumn === "claim_start_date" ? "claim_start_date" : "invoice_datetime";
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
        selectedStatus,
        activeFilter,
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
                claimant_name: formData.claimant_name.trim() || undefined,
                claim_type: formData.claim_type.trim() || undefined,
                council: formData.council.trim() || undefined,
            };
            if (formData.claim_id.trim()) payload.claim_id = formData.claim_id.trim();
            await api.post("/api/claims", payload, { headers: { requiresAuth: true } });
            setFormData({ claim_id: "", claimant_name: "", claim_type: "", council: "" });
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
    const performActionWithUsername = async (
        claimId: string,
        apiPath: string,
        bodyKey: string,
        actionName: string
    ) => {
        const username = getCurrentUsername();

        if (!username) {
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
                { [bodyKey]: username },
                { headers: { requiresAuth: true } }
            );

            await fetchClaims();
        } catch (err: any) {
            alert(err.response?.data?.detail || `Failed to ${actionName} claim.`);
        }
    };
    const handleSoftDelete = (claim_id: string) =>
        performActionWithUsername(claim_id, "/soft-delete", "deleted_by", "soft-delete");

    const handleCloseClaim = (claim_id: string) =>
        performActionWithUsername(claim_id, "/close", "closed_by", "close");

    const handleReopenClaim = (claim_id: string) =>
        performActionWithUsername(claim_id, "/reopen", "reopened_by", "reopen");

    const startEditing = (claim: Claim) => {
        if (savingClaimId) return;
        setEditingClaimId(claim.claim_id);
        setEditNameValue(claim.claimant_name || "");
        setTimeout(() => inputRef.current?.focus(), 10);
    };

    const cancelEdit = () => {
        setEditingClaimId(null);
        setEditNameValue("");
        setSavingClaimId(null);
    };

    const saveEdit = async (claim_id: string) => {
        if (!editNameValue.trim()) {
            alert("Claimant name cannot be empty.");
            return;
        }
        if (savingClaimId) return;
        setSavingClaimId(claim_id);
        try {
            await api.put(
                `/api/claims/${claim_id}`,
                { claimant_name: editNameValue.trim() },
                { headers: { requiresAuth: true } }
            );
            setAllClaims((prev) =>
                prev.map((c) =>
                    c.claim_id === claim_id ? { ...c, claimant_name: editNameValue.trim() } : c
                )
            );
            setEditingClaimId(null);
            setEditNameValue("");
        } catch (err: any) {
            alert(err.response?.data?.detail || "Failed to update claimant name.");
        } finally {
            setSavingClaimId(null);
        }
    };

    const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, claim_id: string) => {
        if (e.key === "Enter") {
            e.preventDefault();
            saveEdit(claim_id);
        } else if (e.key === "Escape") {
            cancelEdit();
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
        setSelectedCouncil("");
        setSelectedStatus("");
        setActiveFilter("all");
        setStartDate("");
        setEndDate("");
        setSortColumn(null);
        setSortDirection(null);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50/40">
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-10">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-extrabold text-green-800 tracking-tight">
                            Claims Dashboard
                        </h1>
                        <p className="mt-2 text-lg text-green-700/80">
                            Manage all your claims in one place 🌱
                        </p>
                    </div>
                    <button
                        onClick={fetchClaims}
                        disabled={loading}
                        className="mt-4 md:mt-0 px-5 py-2.5 bg-white border border-green-200 text-green-700 rounded-xl hover:bg-green-50 transition disabled:opacity-50"
                    >
                        {loading ? "Refreshing..." : "Refresh List"}
                    </button>
                </div>

                {error && (
                    <div className="mb-8 p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl">
                        {error}
                    </div>
                )}

                {/* Create New Claim */}
                <div className="mb-12 bg-white/80 backdrop-blur-md shadow-xl rounded-3xl border border-green-100/60 p-8 md:p-10">
                    <h2 className="text-2xl font-bold text-green-800 mb-6">Create New Claim</h2>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                                <option value="">Select type</option>
                                <option value="taxi">Taxi</option>
                                <option value="personal">Personal</option>
                                <option value="sovereign">Sovereign</option>
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
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
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
                        <div className="md:col-span-4 flex justify-end">
                            <button
                                type="submit"
                                disabled={creating}
                                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-3 px-10 rounded-full shadow-lg transform hover:scale-105 transition-all duration-300 disabled:opacity-60 flex items-center gap-2"
                            >
                                {creating ? (
                                    <>
                                        <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    "Create Claim →"
                                )}
                            </button>
                        </div>
                        {createError && (
                            <p className="md:col-span-4 text-red-600 text-center font-medium mt-2">{createError}</p>
                        )}
                    </form>
                </div>

                {/* Filters + Legend */}
                <div className="mb-8 space-y-6">
                    {/* Status Color Legend */}
                    <div className="bg-white/70 backdrop-blur-sm border border-green-100 rounded-xl p-5 shadow-lg">
                        <h3 className="text-lg font-semibold text-green-800 mb-3">Status Color Reference</h3>
                        <div className="flex flex-wrap gap-4">
                            {Object.entries(STATUS_COLORS).map(([status, color]) =>
                                status !== "default" ? (
                                    <div key={status} className="flex items-center gap-2">
                                        <div className={`w-5 h-5 rounded-full ${color}`}></div>
                                        <span className="text-sm capitalize">{status}</span>
                                    </div>
                                ) : null
                            )}
                        </div>
                    </div>

                    {/* Filters */}
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
                                    <option value="taxi">Taxi</option>
                                    <option value="personal">Personal</option>
                                    <option value="sovereign">Sovereign</option>
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
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                                <select
                                    value={selectedStatus}
                                    onChange={(e) => setSelectedStatus(e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-green-200 rounded-lg focus:ring-2 focus:ring-green-400 bg-white/80"
                                >
                                    <option value="">All Statuses</option>
                                    {Object.keys(STATUS_COLORS)
                                        .filter((k) => k !== "default")
                                        .map((s) => (
                                            <option key={s} value={s}>
                                                {s}
                                            </option>
                                        ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Active</label>
                                <select
                                    value={activeFilter}
                                    onChange={(e) => setActiveFilter(e.target.value as "all" | "active" | "closed")}
                                    className="w-full px-3 py-2 text-sm border border-green-200 rounded-lg focus:ring-2 focus:ring-green-400 bg-white/80"
                                >
                                    <option value="all">All</option>
                                    <option value="active">Active only</option>
                                    <option value="closed">Closed only</option>
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

                <div className="mb-6 text-sm font-medium text-green-700 px-4 py-3 bg-white border border-green-200 rounded-lg inline-block">
                    Showing <span className="font-bold text-green-800">{claims.length}</span> of{" "}
                    <span className="font-bold text-green-800">{allClaims.length}</span> claims
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="w-16 h-16 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
                    </div>
                ) : claims.length === 0 ? (
                    <div className="text-center py-16 bg-white/60 rounded-3xl border border-green-100 shadow-lg">
                        <p className="text-xl text-green-700/80">
                            {searchTerm || selectedType || selectedCouncil || selectedStatus || activeFilter !== "all" || startDate || endDate
                                ? "No matching claims found"
                                : "No claims yet — create one above!"}
                        </p>
                    </div>
                ) : (
                    <div className="bg-white/85 backdrop-blur-sm border border-green-100 rounded-2xl shadow-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-400 border border-gray-400 text-sm rounded-md overflow-hidden">
                                <thead className="bg-green-50/70">
                                    <tr className="border-b border-gray-500">
                                        <th
                                            onClick={() => handleSort("closed")}
                                            className="px-3 py-2 text-center font-semibold text-green-800 border-r border-gray-400 cursor-pointer hover:bg-green-100/50"
                                        >
                                            Active {getSortArrow("closed")}
                                        </th>
                                        <th
                                            onClick={() => handleSort("claim_id")}
                                            className="px-3 py-2 text-left font-semibold text-green-800 border-r border-gray-400 cursor-pointer hover:bg-green-100/50"
                                        >
                                            Claim ID {getSortArrow("claim_id")}
                                        </th>
                                        <th
                                            onClick={() => handleSort("claimant_name")}
                                            className="px-3 py-2 text-left font-semibold text-green-800 border-r border-gray-400 cursor-pointer hover:bg-green-100/50"
                                        >
                                            Claimant {getSortArrow("claimant_name")}
                                        </th>
                                        <th
                                            onClick={() => handleSort("claim_type")}
                                            className="px-3 py-2 text-left font-semibold text-green-800 border-r border-gray-400 cursor-pointer hover:bg-green-100/50"
                                        >
                                            Type {getSortArrow("claim_type")}
                                        </th>
                                        <th
                                            onClick={() => handleSort("council")}
                                            className="px-3 py-2 text-left font-semibold text-green-800 border-r border-gray-400 cursor-pointer hover:bg-green-100/50"
                                        >
                                            Council {getSortArrow("council")}
                                        </th>
                                        <th
                                            onClick={() => handleSort("status")}
                                            className="px-3 py-2 text-left font-semibold text-green-800 border-r border-gray-400 cursor-pointer hover:bg-green-100/50"
                                        >
                                            Status {getSortArrow("status")}
                                        </th>
                                        <th
                                            onClick={() => handleSort("claim_start_date")}
                                            className="px-3 py-2 text-left font-semibold text-green-800 border-r border-gray-400 cursor-pointer hover:bg-green-100/50"
                                        >
                                            Start Date {getSortArrow("claim_start_date")}
                                        </th>
                                        <th
                                            onClick={() => handleSort("invoice_sent")}
                                            className="px-3 py-2 text-left font-semibold text-green-800 border-r border-gray-400 cursor-pointer hover:bg-green-100/50"
                                        >
                                            Invoice {getSortArrow("invoice_sent")}
                                        </th>
                                        <th className="px-3 py-2 text-right font-semibold text-green-800">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-300 bg-white">
                                    {claims.map((claim) => {
                                        const isEditing = editingClaimId === claim.claim_id;
                                        const isSaving = savingClaimId === claim.claim_id;
                                        const isClosed = !!(claim.closed_date && claim.closed_by);
                                        const statusClass =
                                            STATUS_COLORS[claim.status?.toLowerCase()] || STATUS_COLORS.default;

                                        return (
                                            <tr key={claim.claim_id} className="hover:bg-green-100/80 transition-colors">
                                                <td className="px-3 py-1 text-center border-r border-gray-300">
                                                    <div className="relative group inline-block">

                                                        <span
                                                            className={`inline-flex cursor-pointer px-2.5 py-0.5 text-xs font-medium rounded-full ${!isClosed ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
                                                                }`}
                                                        >
                                                            {isClosed ? "No" : "Yes"}
                                                        </span>

                                                        {isClosed && (
                                                            <div className="absolute bottom-full mb-2 hidden group-hover:block 
                      bg-black text-white text-xs rounded px-2 py-1 whitespace-nowrap
                      shadow-lg">
                                                                Closed by {claim.closed_by} on {formatDate(claim.closed_date)}
                                                            </div>
                                                        )}

                                                    </div>
                                                </td>
                                                <td className="px-3 py-1 font-medium text-green-800 border-r border-gray-300">
                                                    {claim.claim_id.toUpperCase()}
                                                </td>
                                                <td className="px-3 py-1 text-gray-700 border-r border-gray-300">
                                                    {isEditing ? (
                                                        <div className="flex items-center gap-1.5">
                                                            <input
                                                                ref={inputRef}
                                                                type="text"
                                                                value={editNameValue}
                                                                onChange={(e) => setEditNameValue(e.target.value)}
                                                                onKeyDown={(e) => handleEditKeyDown(e, claim.claim_id)}
                                                                disabled={isSaving}
                                                                autoFocus
                                                                className={`flex-1 px-2 py-1 border rounded text-sm focus:outline-none focus:ring-1 ${isSaving
                                                                    ? "border-gray-300 bg-gray-50 text-gray-500"
                                                                    : "border-green-400 focus:ring-green-500 bg-white"
                                                                    }`}
                                                            />
                                                            {isSaving ? (
                                                                <Loader2 size={16} className="text-green-600 animate-spin" />
                                                            ) : (
                                                                <>
                                                                    <button
                                                                        onClick={() => saveEdit(claim.claim_id)}
                                                                        disabled={isSaving}
                                                                        title="Save"
                                                                        className="p-1 text-green-600 hover:text-green-800 disabled:opacity-50"
                                                                    >
                                                                        <Check size={16} />
                                                                    </button>
                                                                    <button
                                                                        onClick={cancelEdit}
                                                                        disabled={isSaving}
                                                                        title="Cancel"
                                                                        className="p-1 text-red-600 hover:text-red-800 disabled:opacity-50"
                                                                    >
                                                                        <X size={16} />
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="group flex items-center gap-2">
                                                            <span className={isSaving ? "opacity-50" : ""}>
                                                                {(claim.claimant_name || "—").toUpperCase()}
                                                            </span>
                                                            {isSaving ? null : (
                                                                <button
                                                                    onClick={() => startEditing(claim)}
                                                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-500 hover:text-green-700"
                                                                    title="Edit claimant name"
                                                                >
                                                                    <Pencil size={14} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-3 py-1 text-gray-700 border-r border-gray-300">
                                                    {claim.claim_type
                                                        ? claim.claim_type.charAt(0).toUpperCase() + claim.claim_type.slice(1)
                                                        : "—"}
                                                </td>
                                                <td className="px-3 py-1 text-gray-700 border-r border-gray-300">
                                                    {claim.council || "—"}
                                                </td>
                                                <td className="border-r border-gray-300">
                                                    <div className="relative group flex justify-center">

                                                        <div className={`w-8 h-4 rounded-full ${statusClass}`}></div>

                                                        <span
                                                            className="
                                                        absolute bottom-full mb-1
                                                        left-1/2 -translate-x-1/2
                                                        bg-gray-800 text-white text-xs
                                                        px-2 py-1 rounded
                                                        opacity-0 group-hover:opacity-100
                                                        transition-opacity duration-200
                                                        whitespace-nowrap pointer-events-none
                                                        z-10
                                                    "
                                                        >
                                                            {claim.status === "close claim"
                                                                ? "Claim Closed"
                                                                : claim.status
                                                                    .replace("_", " ")
                                                                    .replace(/\b\w/g, (c) => c.toUpperCase())}
                                                        </span>

                                                    </div>
                                                </td>
                                                <td className="px-3 py-1 text-gray-700 whitespace-nowrap border-r border-gray-300">
                                                    {formatDate(claim.claim_start_date)}
                                                </td>
                                                <td className="px-3 py-1 text-gray-700 whitespace-nowrap border-r border-gray-300">
                                                    {claim.invoice_datetime
                                                        ? `${new Date(claim.invoice_datetime).toLocaleDateString("en-GB", {
                                                            day: "2-digit",
                                                            month: "short",
                                                            year: "numeric",
                                                        })} ${claim.info || "No Info"}`
                                                        : "Not Sent"}
                                                </td>
                                                <td className="px-3 py-1 text-right flex items-center justify-end gap-2">
                                                    {!isClosed && (
                                                        <button
                                                            onClick={() => router.push(`/claim/${claim.claim_id}`)}
                                                            className="p-1 text-green-600 hover:text-green-800 transition rounded"
                                                            title="View claim"
                                                        >
                                                            <Eye size={16} />
                                                        </button>
                                                    )}
                                                    {isClosed ? (
                                                        <button
                                                            onClick={() => handleReopenClaim(claim.claim_id)}
                                                            className="p-1 text-teal-600 hover:text-teal-800 transition rounded"
                                                            title="Reopen claim"
                                                        >
                                                            <Unlock size={16} />
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleCloseClaim(claim.claim_id)}
                                                            className="p-1 text-purple-600 hover:text-purple-800 transition rounded"
                                                            title="Close claim"
                                                        >
                                                            <Lock size={16} />
                                                        </button>
                                                    )}
                                                    {!claim.recently_deleted && (
                                                        <button
                                                            onClick={() => handleSoftDelete(claim.claim_id)}
                                                            className="p-1 text-red-600 hover:text-red-800 transition rounded"
                                                            title="Soft delete"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
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