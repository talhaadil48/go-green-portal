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
}

export default function ClaimsPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [allClaims, setAllClaims] = useState<Claim[]>([]); // ← store unfiltered list
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create form
  const [formData, setFormData] = useState({
    claimant_name: "",
    claim_type: "",
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Filter + Search state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState(""); // "" = All

  const router = useRouter();
  const apiBase = process.env.NEXT_PUBLIC_API_URL;

  const fetchClaims = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${apiBase}/api/claims`);
      setAllClaims(res.data);
      setClaims(res.data); // initial display = all
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

  // Apply filters whenever searchTerm or selectedType changes
  useEffect(() => {
    let filtered = [...allClaims];

    // Search by claimant name
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter((claim) =>
        claim.claimant_name?.toLowerCase().includes(term)
      );
    }

    // Filter by claim type
    if (selectedType) {
      filtered = filtered.filter((claim) => claim.claim_type === selectedType);
    }

    setClaims(filtered);
  }, [searchTerm, selectedType, allClaims]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
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
      await fetchClaims(); // refreshes both allClaims + filtered list
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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

            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm("");
                  setSelectedType("");
                }}
                className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition border border-gray-300 w-full sm:w-auto"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Claims List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-16 h-16 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
          </div>
        ) : claims.length === 0 ? (
          <div className="text-center py-16 bg-white/60 rounded-3xl border border-green-100 shadow-lg">
            <p className="text-xl text-green-700/80">
              {searchTerm || selectedType
                ? "No claims match your filters 😔"
                : "No claims found yet. Create your first one above! 🌿"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {claims.map((claim) => (
              <Link
                key={claim.claim_id}
                href={`/claim/${claim.claim_id}`}
                className="group block bg-white/85 backdrop-blur-sm border border-green-100 rounded-2xl shadow-lg hover:shadow-2xl hover:border-green-300 transition-all duration-300 overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-green-800 group-hover:text-green-700 transition-colors">
                      {claim.claim_id}
                    </h3>
                    <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                      View →
                    </span>
                  </div>

                  <div className="space-y-2 text-gray-700">
                    <p>
                      <span className="font-medium text-gray-800">Claimant:</span>{" "}
                      {claim.claimant_name || "—"}
                    </p>
                    <p>
                      <span className="font-medium text-gray-800">Type:</span>{" "}
                      {claim.claim_type || "Not specified"}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}