"use client";

import { useState, useEffect, FormEvent, ChangeEvent } from "react";
import Link from "next/link";
import axios from "axios";
import { useRouter } from "next/navigation";

interface Claim {
    claim_id: string;
    claimant_name: string | null;
    claim_type: string | null;
    claim_start_date: string | null;
    recently_deleted_date: string | null;
}

export default function RecentlyDeletedClaimsPage() {
    const [claims, setClaims] = useState<Claim[]>([]);
    const [allClaims, setAllClaims] = useState<Claim[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filter + Search
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedType, setSelectedType] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const router = useRouter();
    const apiBase = process.env.NEXT_PUBLIC_API_URL;

    const fetchClaims = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await axios.get(`${apiBase}/api/recently`);
            setAllClaims(res.data.claims);
            setClaims(res.data.claims);
        } catch (err: any) {
            console.error(err);
            setError("Failed to load recently deleted claims. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchClaims();
    }, []);

    // Apply filters
    useEffect(() => {
        let filtered = [...allClaims];

        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase().trim();
            filtered = filtered.filter((claim) =>
                claim.claimant_name?.toLowerCase().includes(term)
            );
        }

        if (selectedType) {
            filtered = filtered.filter((claim) => claim.claim_type === selectedType);
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

        setClaims(filtered);
    }, [searchTerm, selectedType, startDate, endDate, allClaims]);

    const handleRestore = async (claim_id: string) => {
       

    

        try {
            await axios.put(`${apiBase}/api/claims/${claim_id}/restore`);
            await fetchClaims(); // refresh list
        } catch (err: any) {
            console.error(err);
            alert(
                err.response?.data?.detail ||
                "Failed to restore claim. Please try again."
            );
        }
    };

    const handlePermanentDelete = async (claim_id: string) => {
       

        try {
            await axios.delete(`${apiBase}/api/claims/${claim_id}`);
            await fetchClaims(); // refresh list
        } catch (err: any) {
            console.error(err);
            alert(
                err.response?.data?.detail ||
                "Failed to permanently delete claim. Please try again."
            );
        }
    };

    const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
    };

    const handleTypeFilterChange = (e: ChangeEvent<HTMLSelectElement>) => {
        setSelectedType(e.target.value);
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
        setStartDate("");
        setEndDate("");
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50/40">
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-10">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-extrabold text-green-800 tracking-tight">
                            Recently Deleted Claims
                        </h1>
                        <p className="mt-2 text-lg text-green-700/80">
                            View and restore deleted claims • These will be permanently removed after 3 days.
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

                {/* Search + Filter Bar */}
                <div className="mb-8 bg-white/70 backdrop-blur-sm border border-green-100 rounded-2xl shadow-lg p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Search by Claimant
                            </label>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={handleSearchChange}
                                placeholder="Type name here..."
                                className="w-full px-4 py-3 border border-green-200 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-green-400 transition bg-white/80"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Filter by Type
                            </label>
                            <select
                                value={selectedType}
                                onChange={handleTypeFilterChange}
                                className="w-full px-4 py-3 border border-green-200 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-green-400 transition bg-white/80"
                            >
                                <option value="">All Types</option>
                                <option value="taxi">Taxi</option>
                                <option value="personal">Personal</option>
                                <option value="sovereign">Sovereign</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Start Date
                            </label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full px-4 py-3 border border-green-200 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-green-400 transition bg-white/80"
                            />
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    End Date
                                </label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full px-4 py-3 border border-green-200 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-green-400 transition bg-white/80"
                                />
                            </div>

                            <button
                                onClick={clearFilters}
                                className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition border border-gray-300 w-full sm:w-auto"
                            >
                                Clear Filters
                            </button>
                        </div>
                    </div>
                </div>

                {/* Claims Table */}
                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="w-16 h-16 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
                    </div>
                ) : claims.length === 0 ? (
                    <div className="text-center py-16 bg-white/60 rounded-3xl border border-green-100 shadow-lg">
                        <p className="text-xl text-green-700/80">
                            {searchTerm || selectedType || startDate || endDate
                                ? "No deleted claims match your filters 😔"
                                : "No recently deleted claims found 🌿"}
                        </p>
                    </div>
                ) : (
                    <div className="bg-white/85 backdrop-blur-sm border border-green-100 rounded-2xl shadow-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-green-100">
                                <thead className="bg-green-50/70">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-sm font-semibold text-green-800">
                                            Claim ID
                                        </th>
                                        <th className="px-6 py-4 text-left text-sm font-semibold text-green-800">
                                            Claimant
                                        </th>
                                        <th className="px-6 py-4 text-left text-sm font-semibold text-green-800">
                                            Type
                                        </th>
                                        <th className="px-6 py-4 text-left text-sm font-semibold text-green-800">
                                            Start Date
                                        </th>
                                        <th className="px-6 py-4 text-left text-sm font-semibold text-green-800">
                                            Deleted Date
                                        </th>
                                        <th className="px-6 py-4 text-right text-sm font-semibold text-green-800">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-green-50">
                                    {claims.map((claim) => (
                                        <tr
                                            key={claim.claim_id}
                                            className="hover:bg-green-50/40 transition-colors"
                                        >
                                            <td className="px-6 py-4 font-medium text-green-800">
                                                {claim.claim_id}
                                            </td>
                                            <td className="px-6 py-4 text-gray-700">
                                                {claim.claimant_name || "—"}
                                            </td>
                                            <td className="px-6 py-4 text-gray-700">
                                                {claim.claim_type
                                                    ? claim.claim_type.charAt(0).toUpperCase() + claim.claim_type.slice(1)
                                                    : "Not specified"}
                                            </td>
                                            <td className="px-6 py-4 text-gray-700">
                                                {formatDate(claim.claim_start_date)}
                                            </td>
                                            <td className="px-6 py-4 text-gray-700">
                                                {formatDate(claim.recently_deleted_date)}
                                            </td>
                                            <td className="px-6 py-4 text-right flex items-center justify-end gap-3">
                                                <Link
                                                    href={`/claim/${claim.claim_id}`}
                                                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition"
                                                >
                                                    View Details
                                                </Link>

                                                <button
                                                    onClick={() => handleRestore(claim.claim_id)}
                                                    className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition"
                                                >
                                                    Restore
                                                </button>

                                                <button
                                                    onClick={() => handlePermanentDelete(claim.claim_id)}
                                                    className="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition"
                                                >
                                                    Delete Permanently
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