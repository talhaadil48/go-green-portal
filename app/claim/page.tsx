"use client";

import { useState, useEffect, FormEvent, ChangeEvent } from "react";
import Link from "next/link";
import api from "@/lib/axios";
import { useRouter } from "next/navigation";
import { Eye, Trash2 } from "lucide-react";


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
}


type SortColumn =
    | "claim_id"
    | "claimant_name"
    | "claim_type"
    | "claim_start_date"
    | "invoice_sent"
    | "council";

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

export default function ClaimsPage() {
    const [claims, setClaims] = useState<Claim[]>([]);
    const [allClaims, setAllClaims] = useState<Claim[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    // Sorting
    const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
    const [sortDirection, setSortDirection] = useState<SortDirection>(null);

    // Create form
    const [formData, setFormData] = useState({
        claim_id: "",
        claimant_name: "",
        claim_type: "",
        council: "",
    });
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);

    // Filters
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedType, setSelectedType] = useState("");
    const [selectedCouncil, setSelectedCouncil] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

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

    // Filtering + Sorting
    useEffect(() => {
        let filtered = [...allClaims];

        // Search by claimant name
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase().trim();
            filtered = filtered.filter((claim) =>
                claim.claimant_name?.toLowerCase().includes(term)
            );
        }

        // Filter by type
        if (selectedType) {
            filtered = filtered.filter((claim) => claim.claim_type === selectedType);
        }

        // Filter by council (empty string = show all)
        if (selectedCouncil) {
            filtered = filtered.filter((claim) => claim.council === selectedCouncil);
        }

        // Date range filter
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

                // Special handling for dates
                if (sortColumn === "claim_start_date") {
                    aVal = aVal ? new Date(aVal).getTime() : -Infinity;
                    bVal = bVal ? new Date(bVal).getTime() : -Infinity;
                }

                // String comparison (case-insensitive)
                if (typeof aVal === "string" && typeof bVal === "string") {
                    const comparison = aVal.toLowerCase().localeCompare(bVal.toLowerCase());
                    return sortDirection === "asc" ? comparison : -comparison;
                }

                // Numeric fallback
                return sortDirection === "asc"
                    ? (aVal > bVal ? 1 : aVal < bVal ? -1 : 0)
                    : (aVal < bVal ? 1 : aVal > bVal ? -1 : 0);
            });
        }

        setClaims(filtered);
    }, [allClaims, searchTerm, selectedType, selectedCouncil, startDate, endDate, sortColumn, sortDirection]);

    const handleSort = (column: SortColumn) => {
        if (sortColumn === column) {
            if (sortDirection === "asc") {
                setSortDirection("desc");
            } else if (sortDirection === "desc") {
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
        setFormData((prev) => ({ ...prev, [name]: value }));
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

            if (formData.claim_id.trim()) {
                payload.claim_id = formData.claim_id.trim();
            }

            await api.post("/api/claims", payload, {
                headers: { requiresAuth: true },
            });

            setFormData({ claim_id: "", claimant_name: "", claim_type: "", council: "" });
            await fetchClaims();
        } catch (err: any) {
            console.error(err);
            if (err.response?.status === 409) {
                setCreateError("This Claim ID already exists. Please use a different one or leave it blank.");
            } else {
                setCreateError(err.response?.data?.detail || "Failed to create claim. Try again.");
            }
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (claim_id: string) => {
        if (!window.confirm(`Delete claim ${claim_id}? This cannot be undone.`)) return;

        try {
            await api.put(`/api/claims/${claim_id}/soft-delete`, null, {
                headers: { requiresAuth: true },
            });
            await fetchClaims();
        } catch (err: any) {
            console.error(err);
            alert(err.response?.data?.detail || "Failed to delete claim.");
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
        setStartDate("");
        setEndDate("");
        setSortColumn(null);
        setSortDirection(null);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50/40">
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                {/* Header */}
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

                {/* Create Form */}
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

                {/* Filters */}
                <div className="mb-6 bg-white/70 backdrop-blur-sm border border-green-100 rounded-xl shadow-lg p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">

                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                Search by Claimant
                            </label>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Type name..."
                                className="w-full px-3 py-2 text-sm border border-green-200 rounded-lg focus:ring-2 focus:ring-green-400 bg-white/80"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                Claim Type
                            </label>
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
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                Council
                            </label>
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
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                Start Date
                            </label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-green-200 rounded-lg focus:ring-2 focus:ring-green-400 bg-white/80"
                            />
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-end gap-2">
                            <div className="flex-1">
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    End Date
                                </label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-green-200 rounded-lg focus:ring-2 focus:ring-green-400 bg-white/80"
                                />
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

                {/* Claims Counter */}
                <div className="mb-6 text-sm font-medium text-green-700 px-4 py-3 bg-white border border-green-200 rounded-lg inline-block">
                    Showing <span className="font-bold text-green-800">{claims.length}</span> of <span className="font-bold text-green-800">{allClaims.length}</span> claims
                </div>

                {/* Table */}
                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="w-16 h-16 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
                    </div>
                ) : claims.length === 0 ? (
                    <div className="text-center py-16 bg-white/60 rounded-3xl border border-green-100 shadow-lg">
                        <p className="text-xl text-green-700/80">
                            {searchTerm || selectedType || selectedCouncil || startDate || endDate
                                ? "No matching claims found"
                                : "No claims yet — create one above!"}
                        </p>
                    </div>
                ) : (

                <div className="bg-white/85 backdrop-blur-sm border border-green-100 rounded-2xl shadow-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-green-100 text-sm">
                            <thead className="bg-green-50/70">
                                <tr>
                                    <th onClick={() => handleSort("claim_id")} className="px-3 py-2 text-left font-semibold text-green-800 cursor-pointer hover:bg-green-100/50">
                                        Claim ID {getSortArrow("claim_id")}
                                    </th>
                                    <th onClick={() => handleSort("claimant_name")} className="px-3 py-2 text-left font-semibold text-green-800 cursor-pointer hover:bg-green-100/50">
                                        Claimant {getSortArrow("claimant_name")}
                                    </th>
                                    <th onClick={() => handleSort("claim_type")} className="px-3 py-2 text-left font-semibold text-green-800 cursor-pointer hover:bg-green-100/50">
                                        Type {getSortArrow("claim_type")}
                                    </th>
                                    <th onClick={() => handleSort("council")} className="px-3 py-2 text-left font-semibold text-green-800 cursor-pointer hover:bg-green-100/50">
                                        Council {getSortArrow("council")}
                                    </th>
                                    <th onClick={() => handleSort("claim_start_date")} className="px-3 py-2 text-left font-semibold text-green-800 cursor-pointer hover:bg-green-100/50">
                                        Start Date {getSortArrow("claim_start_date")}
                                    </th>
                                    <th onClick={() => handleSort("invoice_sent")} className="px-3 py-2 text-left font-semibold text-green-800 cursor-pointer hover:bg-green-100/50">
                                        Invoice {getSortArrow("invoice_sent")}
                                    </th>
                                    <th className="px-3 py-2 text-right font-semibold text-green-800">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-green-50">
                                {claims.map((claim) => (
                                    <tr key={claim.claim_id} className="hover:bg-green-200/50 transition-colors">
                                        <td className="px-3 py-1 font-medium text-green-800">{claim.claim_id.toUpperCase()}</td>
                                        <td className="px-3 py-1 text-gray-700">{(claim.claimant_name || "—").toUpperCase()}</td>
                                        <td className="px-3 py-1 text-gray-700">
                                            {claim.claim_type ? claim.claim_type.charAt(0).toUpperCase() + claim.claim_type.slice(1) : "—"}
                                        </td>
                                        <td className="px-3 py-1 text-gray-700">{claim.council || "—"}</td>
                                        <td className="px-3 py-1 text-gray-700 whitespace-nowrap">{formatDate(claim.claim_start_date)}</td>
                                        <td className="px-3 py-1 text-gray-700 whitespace-nowrap">
                                            {claim.invoice_datetime
                                                ? `${new Date(claim.invoice_datetime).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} ${claim.info || "No Info"}`
                                                : "Not Sent"}
                                        </td>
                                        <td className="px-3 py-1 text-right flex items-center justify-end gap-2">
                                            <button onClick={() => router.push(`/claim/${claim.claim_id}`)} className="p-1 text-green-600 hover:text-green-800 transition rounded">
                                                <Eye size={16} />
                                            </button>
                                            <button onClick={() => handleDelete(claim.claim_id)} className="p-1 text-red-600 hover:text-red-800 transition rounded">
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                )}
            </main>
        </div>
    );
}
