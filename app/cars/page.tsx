"use client";
import { useState, useEffect, FormEvent } from "react";
import {
  Pencil,
  Check,
  X,
  Plus,
  Car,
  Loader2,
  RefreshCw,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Clock,
  Calendar,
  ExternalLink,
  ArrowUpDown,
  History,
} from "lucide-react";
import Link from "next/link";
import api from "@/lib/axios";

interface Vehicle {
  id: number;
  model: string;
  name: string;
  reg_no: string;
  is_long_hire: boolean;
  is_available?: boolean;
  current_holder_claim_id?: string | null;
}

interface AvailableVehicle {
  id: number;
}

interface FleetHistory {
  id: number;
  hire_start: string;
  hire_end: string;
  claim_id: string;
  car_reg: string;
}

type SortField = "reg_no" | "name" | "model" | "available";
type SortDirection = "asc" | "desc";

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [availableLongHireIds, setAvailableLongHireIds] = useState<Set<number>>(
    new Set(),
  );
  const [fleetHistory, setFleetHistory] = useState<FleetHistory[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<"all" | "normal" | "long" | "history">("all");

  const [formData, setFormData] = useState({ model: "", name: "", reg_no: "" });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState({ model: "", name: "", reg_no: "" });
  const [saving, setSaving] = useState(false);

  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [togglingLongHireId, setTogglingLongHireId] = useState<number | null>(null);

  const [search, setSearch] = useState("");

  // Sorting
  const [sortField, setSortField] = useState<SortField>("reg_no");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [carsRes, availRes] = await Promise.all([
        api.get("/api/cars", { headers: { requiresAuth: true } }),
        api.get("/api/cars/available", { headers: { requiresAuth: true } }),
      ]);

      setVehicles(carsRes.data.data || carsRes.data || []);

      const ids = new Set(
        (availRes.data.data || availRes.data || []).map((v: AvailableVehicle) => v.id)
      );
      setAvailableLongHireIds(ids);
    } catch (err) {
      setError("Failed to load vehicles. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchFleetHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await api.get("/api/fleet-history", {
        headers: { requiresAuth: true },
      });
      setFleetHistory(res.data.data || []);
    } catch (err) {
      console.error("Failed to fetch fleet history:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    if (activeTab === "history") {
      fetchFleetHistory();
    }
  }, [activeTab]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      const payload = {
        model: formData.model.trim(),
        name: formData.name.trim(),
        reg_no: formData.reg_no.trim().toUpperCase(),
      };
      await api.post("/api/car", payload, { headers: { requiresAuth: true } });
      setFormData({ model: "", name: "", reg_no: "" });
      setShowForm(false);
      await fetchAllData();
    } catch (err: any) {
      setCreateError(err.response?.data?.detail || "Failed to create vehicle.");
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (vehicle: Vehicle) => {
    setEditingId(vehicle.id);
    setEditData({
      model: vehicle.model,
      name: vehicle.name,
      reg_no: vehicle.reg_no,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({ model: "", name: "", reg_no: "" });
  };

  const saveEdit = async (id: number) => {
    setSaving(true);
    try {
      const payload = {
        model: editData.model.trim(),
        name: editData.name.trim(),
        reg_no: editData.reg_no.trim().toUpperCase(),
      };
      await api.put(`/api/car/${id}`, payload, { headers: { requiresAuth: true } });
      setVehicles((prev) =>
        prev.map((v) => (v.id === id ? { ...v, ...payload } : v))
      );
      setEditingId(null);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to update vehicle.");
    } finally {
      setSaving(false);
    }
  };

  const toggleLongHire = async (id: number, current: boolean) => {
    const newValue = !current;
    setTogglingLongHireId(id);
    try {
      await api.put(`/api/cars/${id}/long`, { value: newValue }, { headers: { requiresAuth: true } });
      setVehicles((prev) =>
        prev.map((v) => (v.id === id ? { ...v, is_long_hire: newValue } : v))
      );
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to update long hire status.");
    } finally {
      setTogglingLongHireId(null);
    }
  };

  const confirmDelete = (id: number) => {
    if (window.confirm(`Delete vehicle (ID: ${id}) permanently?`)) {
      handleDelete(id);
    }
  };

  const handleDelete = async (id: number) => {
    setDeleteLoading(true);
    setDeletingId(id);
    try {
      await api.delete(`/api/car/${id}`, { headers: { requiresAuth: true } });
      setVehicles((prev) => prev.filter((v) => v.id !== id));
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to delete vehicle.");
    } finally {
      setDeleteLoading(false);
      setDeletingId(null);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Vehicle Filters
  const allVehicles = vehicles;
  const normalHire = vehicles.filter((v) => !v.is_long_hire);
  const longHire = vehicles.filter((v) => v.is_long_hire);

  let displayed =
    activeTab === "all" ? allVehicles
    : activeTab === "normal" ? normalHire
    : longHire;

  // Search
  displayed = displayed.filter((v) =>
    v.name?.toLowerCase().includes(search.toLowerCase()) ||
    v.reg_no?.toLowerCase().includes(search.toLowerCase()) ||
    v.model?.toLowerCase().includes(search.toLowerCase())
  );

  // Sorting
  displayed.sort((a, b) => {
    let valA: any, valB: any;

    if (sortField === "reg_no") { valA = a.reg_no || ""; valB = b.reg_no || ""; }
    else if (sortField === "name") { valA = a.name || ""; valB = b.name || ""; }
    else if (sortField === "model") { valA = a.model || ""; valB = b.model || ""; }
    else if (sortField === "available") {
      const isAvailA = activeTab === "long" ? availableLongHireIds.has(a.id) : (a.is_available ?? false);
      const isAvailB = activeTab === "long" ? availableLongHireIds.has(b.id) : (b.is_available ?? false);
      valA = isAvailA ? 1 : 0;
      valB = isAvailB ? 1 : 0;
    }

    if (valA < valB) return sortDirection === "asc" ? -1 : 1;
    if (valA > valB) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  // Stats
  const total = vehicles.length;
  const totalNormal = normalHire.length;
  const totalLong = longHire.length;
  const availNormal = vehicles.filter((v) => !v.is_long_hire && v.is_available).length;
  const availLong = longHire.filter((v) => availableLongHireIds.has(v.id)).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50/30">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header + Summary Cards */}
        <div className="mb-10 space-y-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
                Vehicle Fleet
              </h1>
              <p className="mt-2 text-gray-600">
                Manage claim vehicles and long-hire fleet
              </p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={fetchAllData}
                disabled={loading}
                className="flex items-center gap-2 px-5 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium shadow-sm disabled:opacity-60"
              >
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                Refresh
              </button>
              {activeTab !== "history" && (
                <button
                  onClick={() => setShowForm((v) => !v)}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl transition shadow-lg font-semibold"
                >
                  <Plus size={18} />
                  Add Vehicle
                </button>
              )}
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-md hover:shadow-lg transition-all duration-300 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Total</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{total}</p>
                </div>
                <Car size={28} className="text-emerald-600 opacity-80" />
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-md hover:shadow-lg transition-all duration-300 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Daily Hire</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{totalNormal}</p>
                </div>
                <Clock size={28} className="text-blue-600 opacity-80" />
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-md hover:shadow-lg transition-all duration-300 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Long Hire</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{totalLong}</p>
                </div>
                <Calendar size={28} className="text-purple-600 opacity-80" />
              </div>
            </div>
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100 shadow-md hover:shadow-lg transition-all duration-300 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-emerald-700 uppercase tracking-wide">Daily Hire Avail</p>
                  <p className="text-3xl font-bold text-emerald-700 mt-1">{availNormal}</p>
                </div>
                <div className="bg-emerald-100 p-2 rounded-full">
                  <Check size={24} className="text-emerald-600" />
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl border border-teal-100 shadow-md hover:shadow-lg transition-all duration-300 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-teal-700 uppercase tracking-wide">Long Hire Avail</p>
                  <p className="text-3xl font-bold text-teal-700 mt-1">{availLong}</p>
                </div>
                <div className="bg-teal-100 p-2 rounded-full">
                  <Check size={24} className="text-teal-600" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <div className="flex space-x-2">
            {(["all", "normal", "long", "history"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 text-sm font-medium rounded-t-xl transition-all ${activeTab === tab
                    ? "bg-white border border-b-0 border-gray-200 text-emerald-700 font-semibold shadow-sm"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50/80"
                  }`}
              >
                {tab === "all" && "All Vehicles"}
                {tab === "normal" && "Claim Vehicles"}
                {tab === "long" && "Long Hire Vehicles"}
                {tab === "history" && (
                  <span className="flex items-center gap-2">
                    <History size={16} /> Fleet History
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Add New Vehicle Form */}
        {showForm && activeTab !== "history" && (
          <div className="mb-8 bg-white border border-emerald-100 rounded-2xl shadow-xl p-7">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Add New Vehicle</h2>
            <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Name</label>
                <input
                  required
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Go Green Car 1"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-gray-50/40 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Model</label>
                <input
                  required
                  value={formData.model}
                  onChange={(e) => setFormData((p) => ({ ...p, model: e.target.value }))}
                  placeholder="e.g. Toyota Prius"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-gray-50/40 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Reg No.</label>
                <input
                  required
                  value={formData.reg_no}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, reg_no: e.target.value.toUpperCase() }))
                  }
                  placeholder="e.g. AB12CDE"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-gray-50/40 uppercase transition"
                />
              </div>
              <div className="flex gap-4 sm:col-span-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-6 py-3 border border-gray-200 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex items-center gap-2 px-7 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-sm font-semibold transition disabled:opacity-60 shadow-md"
                >
                  {creating ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Vehicle"
                  )}
                </button>
              </div>
              {createError && (
                <p className="sm:col-span-3 text-red-600 text-sm text-center mt-3 font-medium">
                  {createError}
                </p>
              )}
            </form>
          </div>
        )}

        {/* Search Bar */}
        {activeTab !== "history" && (
          <div className="mb-6">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, model or reg no..."
              className="w-full max-w-md px-5 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white shadow-sm transition"
            />
          </div>
        )}

        {error && (
          <div className="mb-8 p-5 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-sm font-medium">
            {error}
          </div>
        )}

        {/* Main Content */}
        {activeTab !== "history" ? (
          // Vehicles Table
          loading ? (
            <div className="flex items-center justify-center py-32">
              <Loader2 className="animate-spin text-emerald-600" size={40} />
            </div>
          ) : displayed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 gap-5 text-gray-400">
              <Car size={64} strokeWidth={1.1} />
              <p className="text-xl font-medium">
                {search
                  ? "No vehicles match your search"
                  : "No vehicles found in this category"}
              </p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-2xl shadow overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200">
                    <th
                      onClick={() => handleSort("reg_no")}
                      className="text-left px-5 py-3 font-semibold text-gray-600 uppercase tracking-wide text-xs cursor-pointer hover:bg-gray-100 select-none"
                    >
                      <div className="flex items-center gap-1">
                        Reg No.
                        <ArrowUpDown size={14} className="text-gray-400" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("name")}
                      className="text-left px-5 py-3 font-semibold text-gray-600 uppercase tracking-wide text-xs cursor-pointer hover:bg-gray-100 select-none"
                    >
                      <div className="flex items-center gap-1">
                        Name
                        <ArrowUpDown size={14} className="text-gray-400" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("model")}
                      className="text-left px-5 py-3 font-semibold text-gray-600 uppercase tracking-wide text-xs cursor-pointer hover:bg-gray-100 select-none"
                    >
                      <div className="flex items-center gap-1">
                        Model
                        <ArrowUpDown size={14} className="text-gray-400" />
                      </div>
                    </th>

                    {activeTab !== "all" && (
                      <th
                        onClick={() => handleSort("available")}
                        className="text-center px-5 py-3 font-semibold text-gray-600 uppercase tracking-wide text-xs cursor-pointer hover:bg-gray-100 select-none"
                      >
                        <div className="flex items-center justify-center gap-1">
                          Available
                          <ArrowUpDown size={14} className="text-gray-400" />
                        </div>
                      </th>
                    )}

                    <th className="text-right px-5 py-3 font-semibold text-gray-600 uppercase tracking-wide text-xs">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {displayed.map((v) => {
                    const isLong = v.is_long_hire;
                    const isAvail =
                      activeTab === "long"
                        ? availableLongHireIds.has(v.id)
                        : (v.is_available ?? false);
                    const isToggling = togglingLongHireId === v.id;
                    const hasClaim = !!v.current_holder_claim_id;
                    const showClaimLink = hasClaim && !isLong;

                    return (
                      <tr key={v.id} className="hover:bg-gray-50/60 transition">
                        {editingId === v.id ? (
                          <>
                            <td className="px-5 py-2">
                              <input
                                value={editData.reg_no}
                                onChange={(e) => setEditData((p) => ({ ...p, reg_no: e.target.value.toUpperCase() }))}
                                className="w-full px-2.5 py-1.5 border border-emerald-300 rounded text-sm uppercase focus:outline-none focus:ring-2 focus:ring-emerald-400"
                              />
                            </td>
                            <td className="px-5 py-2">
                              <input
                                value={editData.name}
                                onChange={(e) => setEditData((p) => ({ ...p, name: e.target.value }))}
                                className="w-full px-2.5 py-1.5 border border-emerald-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                              />
                            </td>
                            <td className="px-5 py-2">
                              <input
                                value={editData.model}
                                onChange={(e) => setEditData((p) => ({ ...p, model: e.target.value }))}
                                className="w-full px-2.5 py-1.5 border border-emerald-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                              />
                            </td>
                            {activeTab !== "all" && <td className="px-5 py-2 text-center">-</td>}
                            <td className="px-5 py-2 text-right">
                              <div className="flex justify-end gap-1.5">
                                <button
                                  onClick={() => saveEdit(v.id)}
                                  disabled={saving}
                                  className="p-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded transition"
                                >
                                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded transition"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-5 py-2.5">
                              <span className="inline-flex px-4 py-1.5 bg-gray-100 text-gray-900 font-mono text-base font-semibold tracking-wider rounded">
                                {v.reg_no || "—"}
                              </span>
                            </td>
                            <td className="px-5 py-2.5 font-medium text-gray-900">{v.name || "—"}</td>
                            <td className="px-5 py-2.5 text-gray-700">{v.model || "—"}</td>

                            {activeTab !== "all" && (
                              <td className="px-5 py-2.5 text-center">
                                <span
                                  className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${isAvail
                                      ? "bg-emerald-100 text-emerald-700"
                                      : "bg-rose-100 text-rose-700"
                                    }`}
                                >
                                  {isAvail ? "Yes" : "No"}
                                </span>
                              </td>
                            )}

                            <td className="px-5 py-2.5 text-right">
                              <div className="flex justify-end items-center gap-1.5">
                                <button
                                  onClick={() => startEdit(v)}
                                  className="p-1.5 hover:bg-emerald-50 text-gray-500 hover:text-emerald-700 rounded transition"
                                  title="Edit vehicle"
                                >
                                  <Pencil size={14} />
                                </button>

                                {isAvail && (
                                  <button
                                    onClick={() => toggleLongHire(v.id, isLong)}
                                    disabled={isToggling}
                                    className="p-1.5 hover:bg-purple-50 text-gray-500 hover:text-purple-700 rounded transition"
                                    title={isLong ? "Remove from Long Hire" : "Add to Long Hire"}
                                  >
                                    {isToggling ? (
                                      <Loader2 size={16} className="animate-spin text-purple-600" />
                                    ) : isLong ? (
                                      <ToggleRight size={20} className="text-emerald-600" />
                                    ) : (
                                      <ToggleLeft size={20} className="text-gray-400" />
                                    )}
                                  </button>
                                )}

                                {showClaimLink && (
                                  <Link
                                    target="_blank"
                                    href={`/claim/${v.current_holder_claim_id}`}
                                    className="p-1.5 hover:bg-blue-50 text-gray-500 hover:text-blue-600 rounded transition"
                                    title="View Claim Holder"
                                  >
                                    <ExternalLink size={16} />
                                  </Link>
                                )}

                                <button
                                  onClick={() => confirmDelete(v.id)}
                                  disabled={deleteLoading && deletingId === v.id}
                                  className="p-1.5 hover:bg-red-50 text-gray-500 hover:text-red-600 rounded transition"
                                  title="Delete vehicle"
                                >
                                  {deleteLoading && deletingId === v.id ? (
                                    <Loader2 size={14} className="animate-spin text-red-600" />
                                  ) : (
                                    <Trash2 size={14} />
                                  )}
                                </button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : (
          // Fleet History Table
          <div className="bg-white border border-gray-200 rounded-2xl shadow overflow-hidden">
            {historyLoading ? (
              <div className="flex items-center justify-center py-32">
                <Loader2 className="animate-spin text-emerald-600" size={40} />
              </div>
            ) : fleetHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 gap-5 text-gray-400">
                <History size={64} strokeWidth={1.1} />
                <p className="text-xl font-medium">No fleet history records found</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200">
                    <th className="text-left px-5 py-3 font-semibold text-gray-600 uppercase tracking-wide text-xs">Hire ID</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-600 uppercase tracking-wide text-xs">Car Reg No.</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-600 uppercase tracking-wide text-xs">Claim ID</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-600 uppercase tracking-wide text-xs">Hire Start</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-600 uppercase tracking-wide text-xs">Hire End</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {fleetHistory.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50/60 transition">
                      <td className="px-5 py-3 font-mono text-gray-700">#{record.id}</td>
                      <td className="px-5 py-3">
                        <span className="inline-flex px-4 py-1.5 bg-gray-100 text-gray-900 font-mono text-base font-semibold tracking-wider rounded">
                          {record.car_reg}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <Link
                          href={`/claim/${record.claim_id}`}
                          className="text-blue-600 hover:text-blue-700 hover:underline font-medium flex items-center gap-1 group"
                        >
                          {record.claim_id}
                          <ExternalLink size={14} className="opacity-70 group-hover:opacity-100" />
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-gray-600">
                        {new Date(record.hire_start).toLocaleDateString("en-GB")}
                      </td>
                      <td className="px-5 py-3 text-gray-600">
                        {new Date(record.hire_end).toLocaleDateString("en-GB")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </main>
    </div>
  );
}