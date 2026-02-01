// app/claims/page.tsx
"use client";

import { useState, useEffect, FormEvent, ChangeEvent } from "react";
import Link from "next/link";
import axios from "axios";
import { useRouter } from "next/navigation";

interface Claim {
  claim_id: string;
  claimant_name: string | null;
  claim_type: string | null;
  claim_start_date: string | null; // assumed ISO string e.g. "2025-03-15"
}

export default function ClaimsPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [allClaims, setAllClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create form
  const [formData, setFormData] = useState({
    claimant_name: "",
    claim_type: "",
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Filter + Search
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState(""); // "" = All
  const [startDate, setStartDate] = useState(""); // YYYY-MM-DD
  const [endDate, setEndDate] = useState("");   // YYYY-MM-DD

  const router = useRouter();
  const apiBase = process.env.NEXT_PUBLIC_API_URL;

  const fetchClaims = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${apiBase}/api/claims`);
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

  // Apply all filters
  useEffect(() => {
    let filtered = [...allClaims];

    // 1. Search by claimant name
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter((claim) =>
        claim.claimant_name?.toLowerCase().includes(term)
      );
    }

    // 2. Filter by claim type
    if (selectedType) {
      filtered = filtered.filter((claim) => claim.claim_type === selectedType);
    }

    // 3. Filter by date range
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

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);

    try {
      const payload = {
        claimant_name: formData.claimant_name.trim() || undefined,
        claim_type: formData.claim_type.trim() || undefined,
      };

      await axios.post(`${apiBase}/api/claims`, payload);

      setFormData({ claimant_name: "", claim_type: "" });
      await fetchClaims();
    } catch (err: any) {
      console.error(err);
      setCreateError(
        err.response?.data?.detail || "Failed to create claim. Try again."
      );
    } finally {
      setCreating(false);
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

        {/* Create Claim Form */}
        <div className="mb-12 bg-white/80 backdrop-blur-md shadow-xl rounded-3xl border border-green-100/60 p-8 md:p-10">
          <h2 className="text-2xl font-bold text-green-800 mb-6">
            Create New Claim
          </h2>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Claimant Name
              </label>
              <input
                type="text"
                name="claimant_name"
                value={formData.claimant_name}
                onChange={handleChange}
                placeholder="John Doe"
                className="w-full px-4 py-3 border border-green-200 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-green-400 transition bg-white/70"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Claim Type
              </label>
              <select
                name="claim_type"
                value={formData.claim_type}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-green-200 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-green-400 transition bg-white/70"
              >
                <option value="">Select claim type</option>
                <option value="taxi">Taxi</option>
                <option value="personal">Personal</option>
              </select>
            </div>

            <div className="md:col-span-3 flex justify-end">
              <button
                type="submit"
                disabled={creating}
                className={`
                  bg-gradient-to-r from-green-600 to-emerald-600
                  hover:from-green-700 hover:to-emerald-700
                  text-white font-semibold py-3 px-10 rounded-full
                  shadow-lg transform hover:scale-105 transition-all duration-300
                  disabled:opacity-60 disabled:cursor-not-allowed
                  flex items-center gap-2
                `}
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
              <p className="md:col-span-3 text-red-600 text-center font-medium mt-2">
                {createError}
              </p>
            )}
          </form>
        </div>

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
                ? "No claims match your filters 😔"
                : "No claims found yet. Create your first one above! 🌿"}
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
                    <th className="px-6 py-4 text-right text-sm font-semibold text-green-800">
                      Action
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
                        {claim.claim_type || "Not specified"}
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        {formatDate(claim.claim_start_date)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/claim/${claim.claim_id}`}
                          className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition"
                        >
                          View Details →
                        </Link>
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