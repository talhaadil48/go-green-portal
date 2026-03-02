"use client";

import { useState, useEffect, FormEvent } from "react";
import { Pencil, Check, X, Plus, Car, Loader2, RefreshCw, Trash2 } from "lucide-react";
import api from "@/lib/axios";

interface Car {
  id: number;
  model: string;
  name: string;
  reg_no: string;
}

export default function CarsPage() {
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create form
  const [formData, setFormData] = useState({ model: "", name: "", reg_no: "" });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState({ model: "", name: "", reg_no: "" });
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Search
  const [search, setSearch] = useState("");

  const fetchCars = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/api/cars", {
        headers: { requiresAuth: true },
      });
      setCars(res.data.data || res.data || []);
    } catch {
      setError("Failed to load cars. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCars();
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);

    try {
      const payload = {
        model: formData.model.trim(),
        name: formData.name.trim(),
        reg_no: formData.reg_no.trim(),
      };

      await api.post("/api/car", payload, {
        headers: { requiresAuth: true },
      });

      setFormData({ model: "", name: "", reg_no: "" });
      setShowForm(false);
      await fetchCars();
    } catch (err: any) {
      setCreateError(err.response?.data?.message || "Failed to create car.");
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (car: Car) => {
    setEditingId(car.id);
    setEditData({ model: car.model, name: car.name, reg_no: car.reg_no });
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
        reg_no: editData.reg_no.trim(),
      };

      await api.put(`/api/car/${id}`, payload, {
        headers: { requiresAuth: true },
      });

      setCars((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...payload } : c))
      );
      setEditingId(null);
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to update car.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (id: number) => {
    if (window.confirm(`Are you sure you want to delete this car (ID: ${id})?`)) {
      handleDelete(id);
    }
  };

  const handleDelete = async (id: number) => {
    setDeleteLoading(true);
    setDeletingId(id);

    try {
      await api.delete(`/api/car/${id}`, {
        headers: { requiresAuth: true },
      });

      setCars((prev) => prev.filter((c) => c.id !== id));
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to delete car.");
    } finally {
      setDeleteLoading(false);
      setDeletingId(null);
    }
  };

  const filtered = cars.filter(
    (c) =>
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.reg_no?.toLowerCase().includes(search.toLowerCase()) ||
      c.model?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50/20">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-10 gap-4">
          <div>
            <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight">
               Vehicle Management
            </h1>
            <p className="mt-1 text-slate-500 text-base">
              {cars.length} {cars.length !== 1 ? "vehicles" : "vehicle"} in the fleet
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={fetchCars}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition text-sm font-medium disabled:opacity-50"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
            <button
              onClick={() => setShowForm((v) => !v)}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition text-sm font-semibold shadow"
            >
              <Plus size={16} />
              Add Vehicles
            </button>
          </div>
        </div>

        {/* Add Car Form */}
        {showForm && (
          <div className="mb-8 bg-white border border-emerald-100 rounded-2xl shadow-lg p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-5">Add New Vehicle</h2>
            <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                  Name
                </label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Go Green Car 1"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-slate-50"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                  Model
                </label>
                <input
                  required
                  type="text"
                  value={formData.model}
                  onChange={(e) => setFormData((p) => ({ ...p, model: e.target.value }))}
                  placeholder="e.g. Toyota Prius"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-slate-50"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                  Reg No.
                </label>
                <input
                  required
                  type="text"
                  value={formData.reg_no}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, reg_no: e.target.value.toUpperCase() }))
                  }
                  placeholder="e.g. AB12CDE"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-slate-50 uppercase"
                />
              </div>
              <div className="flex text-left gap-3 sm:col-span-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition disabled:opacity-60"
                >
                  {creating ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Vehicle"
                  )}
                </button>
              </div>
              {createError && (
                <p className="sm:col-span-3 text-red-600 text-sm text-center mt-2">{createError}</p>
              )}
            </form>
          </div>
        )}

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, model or reg..."
            className="w-full sm:w-80 px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Cars Table */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="animate-spin text-emerald-500" size={36} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-slate-400">
            <Car size={48} strokeWidth={1.2} />
            <p className="text-lg font-medium">
              {search ? "No cars match your search" : "No cars yet. Add your first car above."}
            </p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl shadow overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-2 font-semibold text-slate-500 uppercase tracking-wide">
                    ID
                  </th>
                  <th className="text-left px-4 py-2 font-semibold text-slate-500 uppercase tracking-wide">
                    Make
                  </th>
                  <th className="text-left px-4 py-2 font-semibold text-slate-500 uppercase tracking-wide">
                    Model
                  </th>
                  <th className="text-left px-4 py-2 font-semibold text-slate-500 uppercase tracking-wide">
                    Reg No.
                  </th>
                  <th className="text-right px-4 py-2 font-semibold text-slate-500 uppercase tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filtered.map((car) => (
                  <tr key={car.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-1.5 text-slate-400 font-mono">{car.id}</td>

                    {editingId === car.id ? (
                      <>
                        <td className="px-4 py-1">
                          <input
                            value={editData.name}
                            onChange={(e) => setEditData((p) => ({ ...p, name: e.target.value }))}
                            className="w-full px-2 py-1 border border-emerald-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
                          />
                        </td>
                        <td className="px-4 py-1">
                          <input
                            value={editData.model}
                            onChange={(e) => setEditData((p) => ({ ...p, model: e.target.value }))}
                            className="w-full px-2 py-1 border border-emerald-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
                          />
                        </td>
                        <td className="px-4 py-1">
                          <input
                            value={editData.reg_no}
                            onChange={(e) =>
                              setEditData((p) => ({
                                ...p,
                                reg_no: e.target.value.toUpperCase(),
                              }))
                            }
                            className="w-full px-2 py-1 border border-emerald-300 rounded text-xs uppercase focus:outline-none focus:ring-1 focus:ring-emerald-400"
                          />
                        </td>
                        <td className="px-4 py-1 text-right">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => saveEdit(car.id)}
                              disabled={saving}
                              className="p-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded"
                            >
                              {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-1.5 font-medium text-slate-800">{car.name || "—"}</td>
                        <td className="px-4 py-1.5 text-slate-600">{car.model || "—"}</td>
                        <td className="px-4 py-1.5">
                          <span className="inline-flex px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-mono text-xs">
                            {car.reg_no || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-1.5 text-right">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => startEdit(car)}
                              className="p-1.5 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 rounded"
                              title="Edit"
                            >
                              <Pencil size={14} />
                            </button>

                            <button
                              onClick={() => confirmDelete(car.id)}
                              disabled={deleteLoading && deletingId === car.id}
                              className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded"
                              title="Delete"
                            >
                              {deleteLoading && deletingId === car.id ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <Trash2 size={14} />
                              )}
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}