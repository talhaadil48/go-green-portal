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
  Filter,
  ChevronDown,
  Wrench,
  FileText,
  Upload,
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
  service_time?: string | null;
  last_miles_in?: number | null;
  last_service_miles?: number | null;
  mot_date?: string | null;
  mot_doc?: string | null;
  current_miles?: number | null;
  attributes?: string[];
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
  miles_in?: number | null;
  miles_out?: number | null;
}

type SortField =
  | "reg_no"
  | "name"
  | "model"
  | "available"
  | "service_time"
  | "last_miles_in"
  | "last_service_miles"
  | "mot_date"
  | "current_miles";

type HistorySortField = "car_reg" | "claim_id" | "hire_start" | "hire_end" | "miles_out" | "miles_in";
type SortDirection = "asc" | "desc";
type TabType = "all" | "normal" | "long" | "history" | "normal_avail" | "long_avail";
const ATTRIBUTE_MAPPING: Record<
  string,
  {
    label: string;
    symbol: string;
    type: "circle" | "filled-circle" | "star" | "box";
    colorClass?: string;
  }
> = {
  "SMALL CAR": { label: "Small Car", symbol: "SS", type: "circle" },
  "SALOON": { label: "Saloon", symbol: "S", type: "circle" },
  "ESTATE": { label: "Estate", symbol: "E", type: "circle" },
  "6 SEATER": { label: "6 Seater", symbol: "6", type: "circle" },
  "8 SEATER": { label: "8 Seater", symbol: "8", type: "circle" },
  "HACKNEY": { label: "Hackney", symbol: "H", type: "circle" },
  "VAN": { label: "Van", symbol: "V", type: "circle" },
  "LUXURY": { label: "Luxury", symbol: "★", type: "star" },
  "HYBRID": { label: "Hybrid", symbol: "🟢", type: "filled-circle", colorClass: "bg-green-400" },
  "ELECTRIC": { label: "Electric", symbol: "🔵", type: "filled-circle", colorClass: "bg-blue-400" },
  "MANUAL": { label: "Manual", symbol: "✚", type: "circle" },
  "AUTOMATIC": { label: "Automatic", symbol: "━", type: "circle" },

  "CAT S": { label: "Cat S", symbol: "S", type: "box", colorClass: "bg-red-500" },
  "CAT N": { label: "Cat N", symbol: "N", type: "box", colorClass: "bg-orange-500" },
};
const AVAILABLE_ATTRIBUTES = Object.keys(ATTRIBUTE_MAPPING);

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [availableLongHireIds, setAvailableLongHireIds] = useState<Set<number>>(
    new Set(),
  );
  const [fleetHistory, setFleetHistory] = useState<FleetHistory[]>([]);

  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<TabType>("all");

  const [formData, setFormData] = useState({ model: "", name: "", reg_no: "", attributes: [] as string[] });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState({
    model: "",
    name: "",
    service_time: "",
    mot_date: "",
    current_miles: "",
    attributes: [] as string[]
  });
  const [saving, setSaving] = useState(false);

  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [syncingId, setSyncingId] = useState<number | null>(null);

  const [togglingLongHireId, setTogglingLongHireId] = useState<number | null>(null);

  const [uploadingMotId, setUploadingMotId] = useState<number | null>(null);
  const [deletingMotDocId, setDeletingMotDocId] = useState<number | null>(null);

  // Search & Sorting for Vehicles
  const [search, setSearch] = useState("");

  // Multi-select attributes
  const [attributeFilters, setAttributeFilters] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [sortField, setSortField] = useState<SortField>("reg_no");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Search & Sorting for Fleet History
  const [historySearch, setHistorySearch] = useState("");
  const [historySortField, setHistorySortField] = useState<HistorySortField>("hire_start");
  const [historySortDirection, setHistorySortDirection] = useState<SortDirection>("desc");

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

  const handleAttributeToggle = (currentAttrs: string[], attr: string) => {
    if (currentAttrs.includes(attr)) {
      return currentAttrs.filter((a) => a !== attr);
    }
    return [...currentAttrs, attr];
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      const payload = {
        model: formData.model.trim(),
        name: formData.name.trim(),
        reg_no: formData.reg_no.trim().toUpperCase(),
        attributes: formData.attributes.map(a => a.toUpperCase()),
      };
      await api.post("/api/car", payload, { headers: { requiresAuth: true } });
      setFormData({ model: "", name: "", reg_no: "", attributes: [] });
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
    let st = "";
    if (vehicle.service_time) {
      try {
        st = new Date(vehicle.service_time).toISOString().split("T")[0];
      } catch (e) {
        st = "";
      }
    }

    let md = "";
    if (vehicle.mot_date) {
      try {
        md = new Date(vehicle.mot_date).toISOString().split("T")[0];
      } catch (e) {
        md = "";
      }
    }

    setEditData({
      model: vehicle.model || "",
      name: vehicle.name || "",
      service_time: st,
      mot_date: md,
      current_miles: vehicle.current_miles ? String(vehicle.current_miles) : "",
      attributes: (vehicle.attributes || []).map(a => a.toUpperCase()),
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({ model: "", name: "", service_time: "", mot_date: "", current_miles: "", attributes: [] });
  };

  const saveEdit = async (id: number) => {
    setSaving(true);
    try {
      const payload = {
        model: editData.model.trim(),
        name: editData.name.trim(),
        service_time: editData.service_time ? new Date(editData.service_time).toISOString() : null,
        mot_date: editData.mot_date ? new Date(editData.mot_date).toISOString() : null,
        current_miles: editData.current_miles ? parseInt(editData.current_miles, 10) : null,
        attributes: editData.attributes.map(a => a.toUpperCase()),
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

  const confirmServiceDone = (id: number) => {
    if (window.confirm("Mark service as done for this vehicle? This will sync the current service miles.")) {
      syncServiceMiles(id);
    }
  };

  const syncServiceMiles = async (id: number) => {
    setSyncingId(id);
    try {
      const res = await api.put(`/api/cars/${id}/sync-service-miles`, {}, { headers: { requiresAuth: true } });
      if (res.data?.success) {
        if (res.data.data) {
          setVehicles((prev) =>
            prev.map((v) => (v.id === id ? { ...v, ...res.data.data } : v))
          );
        } else {
          await fetchAllData();
        }
      } else {
        alert(res.data?.message || res.data?.error || "Failed to sync service miles.");
      }
    } catch (err: any) {
      alert(err.response?.data?.error || err.response?.data?.message || "Failed to sync service miles.");
    } finally {
      setSyncingId(null);
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

  const handleUploadMotDoc = async (carId: number, file: File) => {
    setUploadingMotId(carId);
    try {
      const presignRes = await fetch("/api/presign-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimId: `car_mot_${carId}`,
          files: [{ name: file.name, type: file.type }],
        }),
      });

      if (!presignRes.ok) throw new Error("Failed to get upload URLs");

      const { results } = await presignRes.json() as {
        results: { presignedUrl: string; fileUrl: string; key: string }[];
      };

      const { presignedUrl, fileUrl } = results[0];

      const s3Res = await fetch(presignedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!s3Res.ok) throw new Error(`S3 upload failed for ${file.name}`);

      await api.post("/api/car/upload_mot_doc", {
        car_id: carId,
        mot_doc: fileUrl
      }, { headers: { requiresAuth: true } });

      setVehicles((prev) =>
        prev.map((v) => (v.id === carId ? { ...v, mot_doc: fileUrl } : v))
      );

    } catch (error) {
      console.error(error);
      alert("Failed to upload MOT document.");
    } finally {
      setUploadingMotId(null);
    }
  };

  const confirmDeleteMotDoc = (carId: number) => {
    if (window.confirm("Delete the MOT document for this vehicle? This cannot be undone.")) {
      handleDeleteMotDoc(carId);
    }
  };

  const handleDeleteMotDoc = async (carId: number) => {
    setDeletingMotDocId(carId);
    try {
      await api.post("/api/car/upload_mot_doc", {
        car_id: carId,
        mot_doc: null,
      }, { headers: { requiresAuth: true } });

      setVehicles((prev) =>
        prev.map((v) => (v.id === carId ? { ...v, mot_doc: null } : v))
      );
    } catch (error) {
      console.error(error);
      alert("Failed to delete MOT document.");
    } finally {
      setDeletingMotDocId(null);
    }
  };

  const triggerFileInput = (carId: number) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,.jpg,.jpeg,.png,.doc,.docx";
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        handleUploadMotDoc(carId, file);
      }
    };
    input.click();
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleHistorySort = (field: HistorySortField) => {
    if (historySortField === field) {
      setHistorySortDirection(historySortDirection === "asc" ? "desc" : "asc");
    } else {
      setHistorySortField(field);
      setHistorySortDirection("asc");
    }
  };

  const checkIsAvail = (v: Vehicle) => v.is_long_hire ? availableLongHireIds.has(v.id) : (v.is_available ?? false);

  const allVehicles = vehicles;
  const normalHire = vehicles.filter((v) => !v.is_long_hire);
  const longHire = vehicles.filter((v) => v.is_long_hire);

  let displayed = allVehicles;
  if (activeTab === "normal") displayed = normalHire;
  else if (activeTab === "long") displayed = longHire;
  else if (activeTab === "normal_avail") displayed = normalHire.filter(v => checkIsAvail(v));
  else if (activeTab === "long_avail") displayed = longHire.filter(v => checkIsAvail(v));

  displayed = displayed.filter((v) =>
    v.name?.toLowerCase().includes(search.toLowerCase()) ||
    v.reg_no?.toLowerCase().includes(search.toLowerCase()) ||
    v.model?.toLowerCase().includes(search.toLowerCase())
  );

  if (attributeFilters.length > 0) {
    displayed = displayed.filter(v =>
      attributeFilters.every(attr => v.attributes?.includes(attr))
    );
  }

  displayed.sort((a, b) => {
    let valA: any, valB: any;

    if (sortField === "reg_no") { valA = a.reg_no || ""; valB = b.reg_no || ""; }
    else if (sortField === "name") { valA = a.name || ""; valB = b.name || ""; }
    else if (sortField === "model") { valA = a.model || ""; valB = b.model || ""; }
    else if (sortField === "service_time") {
      valA = a.service_time ? new Date(a.service_time).getTime() : 0;
      valB = b.service_time ? new Date(b.service_time).getTime() : 0;
    }
    else if (sortField === "last_miles_in") { valA = a.last_miles_in || 0; valB = b.last_miles_in || 0; }
    else if (sortField === "last_service_miles") { valA = a.last_service_miles || 0; valB = b.last_service_miles || 0; }
    else if (sortField === "current_miles") { valA = a.current_miles || 0; valB = b.current_miles || 0; }
    else if (sortField === "mot_date") {
      valA = a.mot_date ? new Date(a.mot_date).getTime() : 0;
      valB = b.mot_date ? new Date(b.mot_date).getTime() : 0;
    }
    else if (sortField === "available") {
      valA = checkIsAvail(a) ? 1 : 0;
      valB = checkIsAvail(b) ? 1 : 0;
    }

    if (valA < valB) return sortDirection === "asc" ? -1 : 1;
    if (valA > valB) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  let displayedHistory = fleetHistory.filter((h) =>
    h.car_reg?.toLowerCase().includes(historySearch.toLowerCase()) ||
    h.claim_id?.toLowerCase().includes(historySearch.toLowerCase())
  );

  displayedHistory.sort((a, b) => {
    let valA: any, valB: any;

    if (historySortField === "car_reg") { valA = a.car_reg || ""; valB = b.car_reg || ""; }
    else if (historySortField === "claim_id") { valA = a.claim_id || ""; valB = b.claim_id || ""; }
    else if (historySortField === "hire_start") { valA = new Date(a.hire_start).getTime(); valB = new Date(b.hire_start).getTime(); }
    else if (historySortField === "hire_end") { valA = a.hire_end ? new Date(a.hire_end).getTime() : 0; valB = b.hire_end ? new Date(b.hire_end).getTime() : 0; }
    else if (historySortField === "miles_out") { valA = a.miles_out || 0; valB = b.miles_out || 0; }
    else if (historySortField === "miles_in") { valA = a.miles_in || 0; valB = b.miles_in || 0; }

    if (valA < valB) return historySortDirection === "asc" ? -1 : 1;
    if (valA > valB) return historySortDirection === "asc" ? 1 : -1;
    return 0;
  });

  const total = vehicles.length;
  const totalNormal = normalHire.length;
  const totalLong = longHire.length;
  const availNormal = normalHire.filter((v) => checkIsAvail(v)).length;
  const availLong = longHire.filter((v) => checkIsAvail(v)).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50/30">
      <main className="max-w-[1400px] mx-auto px-2 sm:px-4 lg:px-6 py-6">
        {/* Header + Summary Cards */}
        <div className="mb-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                Vehicle Fleet
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Manage hire and long hire fleet
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={activeTab === "history" ? fetchFleetHistory : fetchAllData}
                disabled={loading || historyLoading}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium shadow-sm disabled:opacity-60"
              >
                <RefreshCw size={14} className={(loading || historyLoading) ? "animate-spin" : ""} />
                Refresh
              </button>
              {activeTab !== "history" && (
                <button
                  onClick={() => setShowForm((v) => !v)}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg transition shadow-md font-semibold"
                >
                  <Plus size={16} />
                  Add Vehicle
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div
              onClick={() => setActiveTab("all")}
              className={`bg-white rounded-xl border ${activeTab === "all" ? "border-gray-400 ring-1 ring-gray-200" : "border-gray-100"} shadow-sm hover:shadow transition-all duration-300 p-4 cursor-pointer`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Total</p>
                  <p className="text-2xl font-bold text-gray-900 mt-0.5">{total}</p>
                </div>
                <Car size={20} className="text-emerald-600 opacity-80" />
              </div>
            </div>
            <div
              onClick={() => setActiveTab("normal")}
              className={`bg-white rounded-xl border ${activeTab === "normal" ? "border-blue-400 ring-1 ring-blue-200" : "border-gray-100"} shadow-sm hover:shadow transition-all duration-300 p-4 cursor-pointer`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Daily Hire</p>
                  <p className="text-2xl font-bold text-gray-900 mt-0.5">{totalNormal}</p>
                </div>
                <Clock size={20} className="text-blue-600 opacity-80" />
              </div>
            </div>
            <div
              onClick={() => setActiveTab("long")}
              className={`bg-white rounded-xl border ${activeTab === "long" ? "border-purple-400 ring-1 ring-purple-200" : "border-gray-100"} shadow-sm hover:shadow transition-all duration-300 p-4 cursor-pointer`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Long Hire</p>
                  <p className="text-2xl font-bold text-gray-900 mt-0.5">{totalLong}</p>
                </div>
                <Calendar size={20} className="text-purple-600 opacity-80" />
              </div>
            </div>
            <div
              onClick={() => setActiveTab("normal_avail")}
              className={`bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border ${activeTab === "normal_avail" ? "border-emerald-400 ring-1 ring-emerald-200" : "border-emerald-100"} shadow-sm hover:shadow transition-all duration-300 p-4 cursor-pointer`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wide">Daily Hire Avail</p>
                  <p className="text-2xl font-bold text-emerald-700 mt-0.5">{availNormal}</p>
                </div>
                <div className="bg-emerald-100 p-1.5 rounded-full">
                  <Check size={16} className="text-emerald-600" />
                </div>
              </div>
            </div>
            <div
              onClick={() => setActiveTab("long_avail")}
              className={`bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl border ${activeTab === "long_avail" ? "border-teal-400 ring-1 ring-teal-200" : "border-teal-100"} shadow-sm hover:shadow transition-all duration-300 p-4 cursor-pointer`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-teal-700 uppercase tracking-wide">Long Hire Avail</p>
                  <p className="text-2xl font-bold text-teal-700 mt-0.5">{availLong}</p>
                </div>
                <div className="bg-teal-100 p-1.5 rounded-full">
                  <Check size={16} className="text-teal-600" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-5 border-b border-gray-200">
          <div className="flex space-x-1">
            {(["all", "normal", "long", "history"] as const).map((tab) => {
              const isActive = activeTab === tab ||
                (tab === "normal" && activeTab === "normal_avail") ||
                (tab === "long" && activeTab === "long_avail");
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2.5 text-xs font-medium rounded-t-lg transition-all ${isActive
                    ? "bg-white border border-b-0 border-gray-200 text-emerald-700 font-semibold shadow-sm"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50/80"
                    }`}
                >
                  {tab === "all" && "All Vehicles"}
                  {tab === "normal" && "Daily Hire"}
                  {tab === "long" && "Long Hire"}
                  {tab === "history" && (
                    <span className="flex items-center gap-1.5">
                      <History size={14} /> History
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {showForm && activeTab !== "history" && (
          <div className="mb-6 bg-white border border-emerald-100 rounded-xl shadow-md p-5">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Add New Vehicle</h2>
            <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1 uppercase tracking-wide">Reg No.</label>
                <input
                  required
                  value={formData.reg_no}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, reg_no: e.target.value.toUpperCase() }))
                  }
                  placeholder="e.g. AB12CDE"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-gray-50/40 uppercase transition"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1 uppercase tracking-wide">Make</label>
                <input
                  required
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. TOYOTA"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-gray-50/40 transition"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1 uppercase tracking-wide">Model</label>
                <input
                  required
                  value={formData.model}
                  onChange={(e) => setFormData((p) => ({ ...p, model: e.target.value }))}
                  placeholder="e.g. Prius"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-gray-50/40 transition"
                />
              </div>

              <div className="sm:col-span-3 mt-1">
                <label className="block text-[11px] font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Vehicle Attributes</label>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {AVAILABLE_ATTRIBUTES.map((attr) => (
                    <label
                      key={attr}
                      className="flex items-center space-x-1.5 text-xs text-gray-700 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData.attributes.includes(attr)}
                        onChange={() =>
                          setFormData((prev) => ({
                            ...prev,
                            attributes: handleAttributeToggle(prev.attributes, attr),
                          }))
                        }
                        className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                      />

                      {ATTRIBUTE_MAPPING[attr].type === "box" ? (
                        <div
                          className={`w-3.5 h-3.5 ${ATTRIBUTE_MAPPING[attr].colorClass} text-white text-[8px] font-bold flex items-center justify-center rounded-sm`}
                        >
                          {ATTRIBUTE_MAPPING[attr].symbol}
                        </div>
                      ) : ATTRIBUTE_MAPPING[attr].type === "filled-circle" ? (
                        <div
                          className={`w-3.5 h-3.5 rounded-full ${ATTRIBUTE_MAPPING[attr].colorClass}`}
                        />
                      ) : ATTRIBUTE_MAPPING[attr].type === "circle" ? (
                        <div className="w-3.5 h-3.5 rounded-full border border-gray-500 flex items-center justify-center text-[8px] font-bold">
                          {ATTRIBUTE_MAPPING[attr].symbol}
                        </div>
                      ) : (
                        <span className="text-yellow-500 text-xs">{ATTRIBUTE_MAPPING[attr].symbol}</span>
                      )}

                      <span>{ATTRIBUTE_MAPPING[attr].label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 sm:col-span-3 mt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-5 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg text-sm font-semibold transition disabled:opacity-60 shadow-sm"
                >
                  {creating ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Vehicle"
                  )}
                </button>
              </div>
              {createError && (
                <p className="sm:col-span-3 text-red-600 text-xs text-center mt-2 font-medium">
                  {createError}
                </p>
              )}
            </form>
          </div>
        )}

        <div className="mb-4 flex flex-col sm:flex-row gap-3 relative">
          <input
            type="text"
            value={activeTab === "history" ? historySearch : search}
            onChange={(e) => activeTab === "history" ? setHistorySearch(e.target.value) : setSearch(e.target.value)}
            placeholder={activeTab === "history" ? "Search history by Reg No. or Claim ID..." : "Search by name, model or reg no..."}
            className="w-full max-w-md px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white shadow-sm transition"
          />

          {activeTab !== "history" && (
            <div className="relative w-full max-w-[200px]">
              <button
                type="button"
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="w-full flex items-center justify-between px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white shadow-sm transition"
              >
                <div className="flex items-center gap-2 text-gray-700">
                  <Filter size={14} className="text-emerald-600" />
                  <span className="font-medium text-xs">
                    {attributeFilters.length === 0
                      ? "Filter Attributes"
                      : `Filters (${attributeFilters.length})`}
                  </span>
                </div>
                <ChevronDown size={14} className={`text-gray-400 transition-transform ${isFilterOpen ? "rotate-180" : ""}`} />
              </button>

              {isFilterOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsFilterOpen(false)}
                  />
                  <div className="absolute top-full left-0 mt-1.5 w-56 bg-white border border-gray-100 rounded-lg shadow-xl z-20 overflow-hidden">
                    <div className="max-h-56 overflow-y-auto p-1.5 space-y-0.5">
                      {AVAILABLE_ATTRIBUTES.map((attr) => (
                        <label
                          key={attr}
                          className="flex items-center space-x-2.5 px-2.5 py-1.5 hover:bg-gray-50 rounded-md cursor-pointer transition"
                        >
                          <input
                            type="checkbox"
                            checked={attributeFilters.includes(attr)}
                            onChange={() => {
                              setAttributeFilters((prev) =>
                                prev.includes(attr)
                                  ? prev.filter((a) => a !== attr)
                                  : [...prev, attr]
                              );
                            }}
                            className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                          />

                          {ATTRIBUTE_MAPPING[attr].type === "box" ? (
                            <div
                              className={`w-4 h-4 ${ATTRIBUTE_MAPPING[attr].colorClass} text-white text-[9px] font-bold flex items-center justify-center rounded-sm`}
                            >
                              {ATTRIBUTE_MAPPING[attr].symbol}
                            </div>
                          ) : ATTRIBUTE_MAPPING[attr].type === "filled-circle" ? (
                            <div
                              className={`w-4 h-4 rounded-full ${ATTRIBUTE_MAPPING[attr].colorClass}`}
                            />
                          ) : ATTRIBUTE_MAPPING[attr].type === "circle" ? (
                            <div className="w-4 h-4 rounded-full border border-gray-500 flex items-center justify-center text-[9px] font-bold">
                              {ATTRIBUTE_MAPPING[attr].symbol}
                            </div>
                          ) : (
                            <span className="text-yellow-500 text-sm">
                              {ATTRIBUTE_MAPPING[attr].symbol}
                            </span>
                          )}

                          <span className="text-xs text-gray-700 font-medium">
                            {ATTRIBUTE_MAPPING[attr].label}
                          </span>
                        </label>
                      ))}
                    </div>
                    {attributeFilters.length > 0 && (
                      <div className="p-1.5 border-t border-gray-100 bg-gray-50">
                        <button
                          onClick={() => setAttributeFilters([])}
                          className="w-full py-1 text-xs text-gray-600 hover:text-emerald-700 font-semibold transition"
                        >
                          Clear Filters
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="mb-5 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-medium">
            {error}
          </div>
        )}

        {activeTab !== "history" ? (
          loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="animate-spin text-emerald-600" size={32} />
            </div>
          ) : displayed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-gray-400">
              <Car size={48} strokeWidth={1.1} />
              <p className="text-lg font-medium">
                {search || attributeFilters.length > 0
                  ? "No vehicles match your search and filter criteria"
                  : "No vehicles found in this category"}
              </p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-auto max-h-[70vh]">
              <table className="w-full text-[13px]">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th
                      onClick={() => handleSort("reg_no")}
                      className="text-left px-3 py-2 font-semibold text-gray-600 uppercase tracking-wide text-[10px] cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap"
                    >
                      <div className="flex items-center gap-1">
                        Reg No.
                        <ArrowUpDown size={12} className="text-gray-400" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("name")}
                      className="text-left px-3 py-2 font-semibold text-gray-600 uppercase tracking-wide text-[10px] cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap"
                    >
                      <div className="flex items-center gap-1">
                        Make
                        <ArrowUpDown size={12} className="text-gray-400" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("model")}
                      className="text-left px-3 py-2 font-semibold text-gray-600 uppercase tracking-wide text-[10px] cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap"
                    >
                      <div className="flex items-center gap-1">
                        Model
                        <ArrowUpDown size={12} className="text-gray-400" />
                      </div>
                    </th>
                    <th
                      className="text-left px-3 py-2 font-semibold text-gray-600 uppercase tracking-wide text-[10px] select-none"
                    >
                      Attributes
                    </th>
                    <th
                      onClick={() => handleSort("service_time")}
                      className="text-left px-3 py-2 font-semibold text-gray-600 uppercase tracking-wide text-[10px] cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap"
                    >
                      <div className="flex items-center gap-1">
                        Service Time
                        <ArrowUpDown size={12} className="text-gray-400" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("last_service_miles")}
                      className="text-left px-3 py-2 font-semibold text-gray-600 uppercase tracking-wide text-[10px] cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap"
                    >
                      <div className="flex items-center gap-1">
                        Last Service
                        <ArrowUpDown size={12} className="text-gray-400" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("mot_date")}
                      className="text-left px-3 py-2 font-semibold text-gray-600 uppercase tracking-wide text-[10px] cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap"
                    >
                      <div className="flex items-center gap-1">
                        MOT Date
                        <ArrowUpDown size={12} className="text-gray-400" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("current_miles")}
                      className="text-left px-3 py-2 font-semibold text-gray-600 uppercase tracking-wide text-[10px] cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap"
                    >
                      <div className="flex items-center gap-1">
                        Curr Miles
                        <ArrowUpDown size={12} className="text-gray-400" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("last_miles_in")}
                      className="text-left px-3 py-2 font-semibold text-gray-600 uppercase tracking-wide text-[10px] cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap"
                    >
                      <div className="flex items-center gap-1">
                        Last Miles In
                        <ArrowUpDown size={12} className="text-gray-400" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("available")}
                      className="text-center px-3 py-2 font-semibold text-gray-600 uppercase tracking-wide text-[10px] cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap"
                    >
                      <div className="flex items-center justify-center gap-1">
                        Available
                        <ArrowUpDown size={12} className="text-gray-400" />
                      </div>
                    </th>
                    <th className="text-right px-3 py-2 font-semibold text-gray-600 uppercase tracking-wide text-[10px] whitespace-nowrap">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {displayed.map((v) => {
                    const isLong = v.is_long_hire;
                    const isAvail = checkIsAvail(v);
                    const isToggling = togglingLongHireId === v.id;
                    const hasClaim = !!v.current_holder_claim_id;
                    const claimLinkHref = isLong ? `/long-claims/${v.current_holder_claim_id}` : `/claim/${v.current_holder_claim_id}`;

                    return (
                      <tr key={v.id} className="hover:bg-gray-50/60 transition text-xs">
                        {editingId === v.id ? (
                          <>
                            <td className="px-3 py-1.5 align-middle">
                              <span className="inline-flex px-2 py-1 bg-gray-100 text-gray-500 font-mono text-[11px] font-semibold tracking-wider rounded cursor-not-allowed">
                                {v.reg_no || "—"}
                              </span>
                            </td>
                            <td className="px-3 py-1.5 align-middle">
                              <input
                                value={editData.name}
                                onChange={(e) => setEditData((p) => ({ ...p, name: e.target.value }))}
                                className="w-full px-2 py-1 border border-emerald-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
                              />
                            </td>
                            <td className="px-3 py-1.5 align-middle">
                              <input
                                value={editData.model}
                                onChange={(e) => setEditData((p) => ({ ...p, model: e.target.value }))}
                                className="w-full px-2 py-1 border border-emerald-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
                              />
                            </td>
                            <td className="px-3 py-1.5 align-middle">
                              <div className="flex flex-wrap gap-1 max-w-[150px]">
                                {AVAILABLE_ATTRIBUTES.map((attr) => (
                                  <label key={attr} className="flex items-center space-x-1 text-[10px] text-gray-700 cursor-pointer whitespace-nowrap">
                                    <input
                                      type="checkbox"
                                      checked={editData.attributes.includes(attr)}
                                      onChange={() => setEditData((prev) => ({
                                        ...prev,
                                        attributes: handleAttributeToggle(prev.attributes, attr)
                                      }))}
                                      className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 h-2.5 w-2.5"
                                    />
                                    <span>{ATTRIBUTE_MAPPING[attr].label}</span>
                                  </label>
                                ))}
                              </div>
                            </td>
                            <td className="px-3 py-1.5 align-middle">
                              <input
                                type="date"
                                value={editData.service_time}
                                onChange={(e) => setEditData((p) => ({ ...p, service_time: e.target.value }))}
                                className="w-[110px] px-2 py-1 border border-emerald-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
                              />
                            </td>
                            <td className="px-3 py-1.5 text-gray-500 align-middle">
                              {v.last_service_miles ?? "—"}
                            </td>
                            <td className="px-3 py-1.5 align-middle">
                              <input
                                type="date"
                                value={editData.mot_date}
                                onChange={(e) => setEditData((p) => ({ ...p, mot_date: e.target.value }))}
                                className="w-[110px] px-2 py-1 border border-emerald-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
                              />
                            </td>
                            <td className="px-3 py-1.5 align-middle">
                              <input
                                type="number"
                                placeholder="Miles"
                                value={editData.current_miles}
                                onChange={(e) => setEditData((p) => ({ ...p, current_miles: e.target.value }))}
                                className="w-[80px] px-2 py-1 border border-emerald-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
                              />
                            </td>
                            <td className="px-3 py-1.5 text-gray-500 align-middle">
                              {v.last_miles_in ?? "—"}
                            </td>
                            <td className="px-3 py-1.5 text-center align-middle">-</td>
                            <td className="px-3 py-1.5 text-right align-middle">
                              <div className="flex justify-end gap-1">
                                <button
                                  onClick={() => saveEdit(v.id)}
                                  disabled={saving}
                                  className="p-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded transition"
                                  title="Save Changes"
                                >
                                  {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  className="p-1 bg-red-50 hover:bg-red-100 text-red-600 rounded transition"
                                  title="Cancel"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-3 py-2 align-middle">
                              <span className="inline-flex px-2 py-1 bg-gray-100 text-gray-900 font-mono text-[11px] font-semibold tracking-wider rounded">
                                {v.reg_no || "—"}
                              </span>
                            </td>
                            <td className="px-3 py-2 font-medium text-gray-900 align-middle">{v.name || "—"}</td>
                            <td className="px-3 py-2 text-gray-700 align-middle">{v.model || "—"}</td>
                            <td className="px-3 py-2 text-gray-700 align-middle cursor-default">
                              {v.attributes && v.attributes.length > 0 ? (
                                <div className="relative group flex flex-wrap gap-1 items-center">
                                  {v.attributes.map((attr) => {
                                    const mapped = ATTRIBUTE_MAPPING[attr];
                                    const sharedClasses =
                                      "inline-flex items-center justify-center w-5 h-5 shrink-0 leading-none";

                                    if (mapped?.type === "circle") {
                                      return (
                                        <span
                                          key={attr}
                                          className={`${sharedClasses} rounded-full border border-black text-black bg-white text-[9px] font-bold`}
                                          title={mapped.label}
                                        >
                                          {mapped.symbol}
                                        </span>
                                      );
                                    }

                                    if (mapped?.type === "filled-circle") {
                                      return (
                                        <span
                                          key={attr}
                                          className={`${sharedClasses} rounded-full ${mapped.colorClass}`}
                                          title={mapped.label}
                                        />
                                      );
                                    }

                                    if (mapped?.type === "box") {
                                      return (
                                        <span
                                          key={attr}
                                          className={`${sharedClasses} rounded-sm ${mapped.colorClass} text-white text-[9px] font-bold`}
                                          title={mapped.label}
                                        >
                                          {mapped.symbol}
                                        </span>
                                      );
                                    }

                                    if (mapped?.type === "star") {
                                      return (
                                        <span
                                          key={attr}
                                          className={`${sharedClasses} text-yellow-500 text-[16px] leading-none pb-0.5`}
                                          title={mapped.label}
                                        >
                                          ★
                                        </span>
                                      );
                                    }

                                    return (
                                      <span
                                        key={attr}
                                        className={`${sharedClasses} text-black text-[10px]`}
                                      >
                                        {attr}
                                      </span>
                                    );
                                  })}

                                  {/* Custom Tooltip */}
                                  <div className="absolute left-0 bottom-full mb-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 w-max max-w-xs pointer-events-none">
                                    <div className="bg-gray-800 text-white text-[10px] rounded-lg shadow-xl p-2 border border-gray-700">
                                      <p className="text-gray-400 font-semibold mb-1 uppercase text-[8px] tracking-wider">Attributes</p>
                                      <div className="flex flex-col gap-1">
                                        {v.attributes.map((a) => {
                                          const mapped = ATTRIBUTE_MAPPING[a];
                                          return (
                                            <div
                                              key={a}
                                              className="flex items-center gap-1.5 text-gray-100 font-medium"
                                            >
                                              {mapped?.type === "circle" ? (
                                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-gray-400 text-gray-200 bg-gray-800 text-[9px] font-bold shrink-0 leading-none">
                                                  {mapped.symbol}
                                                </span>
                                              ) : mapped?.type === "filled-circle" ? (
                                                <span
                                                  className={`inline-flex w-5 h-5 rounded-full ${mapped.colorClass} shrink-0`}
                                                />
                                              ) : mapped?.type === "box" ? (
                                                <span
                                                  className={`inline-flex items-center justify-center w-5 h-5 rounded-sm ${mapped.colorClass} text-white text-[9px] font-bold shrink-0 leading-none`}
                                                >
                                                  {mapped.symbol}
                                                </span>
                                              ) : mapped?.type === "star" ? (
                                                <span className="inline-flex items-center justify-center w-5 h-5 text-yellow-500 text-[16px] leading-none shrink-0 pb-0.5">
                                                  ★
                                                </span>
                                              ) : (
                                                <span>{a}</span>
                                              )}

                                              <span>{mapped?.label || a}</span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                    <div className="absolute -bottom-1 left-3 w-2 h-2 bg-gray-800 border-b border-r border-gray-700 transform rotate-45"></div>
                                  </div>
                                </div>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="px-3 py-2 text-gray-700 align-middle">
                              {v.service_time
                                ? new Date(v.service_time).toLocaleDateString("en-GB")
                                : "—"}
                            </td>
                            <td className="px-3 py-2 text-gray-700 align-middle">{v.last_service_miles ?? "—"}</td>

                            {/* MOT Date + Doc Actions */}
                            <td className="px-3 py-2 text-gray-700 align-middle">
                              <div className="flex items-center gap-2 whitespace-nowrap">
                                <span>
                                  {v.mot_date
                                    ? new Date(v.mot_date).toLocaleDateString("en-GB")
                                    : "—"}
                                </span>
                                <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded px-1 py-0.5">
                                  {v.mot_doc && (
                                    <>
                                      <a
                                        href={v.mot_doc}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1 hover:bg-blue-100 text-blue-600 rounded transition"
                                        title="View MOT Document"
                                      >
                                        <FileText size={14} />
                                      </a>
                                      <button
                                        onClick={() => confirmDeleteMotDoc(v.id)}
                                        disabled={deletingMotDocId === v.id}
                                        className="p-1 hover:bg-red-100 text-red-500 rounded transition disabled:opacity-50"
                                        title="Delete MOT Document"
                                      >
                                        {deletingMotDocId === v.id ? (
                                          <Loader2 size={14} className="animate-spin text-red-500" />
                                        ) : (
                                          <Trash2 size={14} />
                                        )}
                                      </button>
                                    </>
                                  )}
                                  <button
                                    onClick={() => triggerFileInput(v.id)}
                                    disabled={uploadingMotId === v.id}
                                    className="p-1 hover:bg-emerald-100 text-emerald-600 rounded transition disabled:opacity-50"
                                    title={v.mot_doc ? "Replace MOT Document" : "Upload MOT Document"}
                                  >
                                    {uploadingMotId === v.id ? (
                                      <Loader2 size={14} className="animate-spin text-emerald-600" />
                                    ) : (
                                      <Upload size={14} />
                                    )}
                                  </button>
                                </div>
                              </div>
                            </td>

                            <td className="px-3 py-2 text-gray-700 align-middle">{v.current_miles ?? "—"}</td>
                            <td className="px-3 py-2 text-gray-700 align-middle">{v.last_miles_in ?? "—"}</td>

                            <td className="px-3 py-2 text-center align-middle">
                              <span
                                className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${isAvail
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-rose-100 text-rose-700"
                                  }`}
                              >
                                {isAvail ? "Yes" : "No"}
                              </span>
                            </td>

                            <td className="px-3 py-2 text-right align-middle">
                              <div className="flex justify-end items-center gap-1">
                                <button
                                  onClick={() => confirmServiceDone(v.id)}
                                  disabled={syncingId === v.id}
                                  className="p-1 hover:bg-orange-50 text-gray-500 hover:text-orange-600 rounded transition"
                                  title="Mark Service Done"
                                >
                                  {syncingId === v.id ? (
                                    <Loader2 size={12} className="animate-spin text-orange-600" />
                                  ) : (
                                    <Wrench size={12} />
                                  )}
                                </button>

                                <button
                                  onClick={() => startEdit(v)}
                                  className="p-1 hover:bg-emerald-50 text-gray-500 hover:text-emerald-700 rounded transition"
                                  title="Edit vehicle"
                                >
                                  <Pencil size={12} />
                                </button>

                                {isAvail && (
                                  <button
                                    onClick={() => toggleLongHire(v.id, isLong)}
                                    disabled={isToggling}
                                    className="p-1 hover:bg-purple-50 text-gray-500 hover:text-purple-700 rounded transition"
                                    title={isLong ? "Remove from Long Hire" : "Add to Long Hire"}
                                  >
                                    {isToggling ? (
                                      <Loader2 size={14} className="animate-spin text-purple-600" />
                                    ) : isLong ? (
                                      <ToggleRight size={16} className="text-emerald-600" />
                                    ) : (
                                      <ToggleLeft size={16} className="text-gray-400" />
                                    )}
                                  </button>
                                )}

                                {hasClaim && (
                                  <Link
                                    target="_blank"
                                    href={claimLinkHref}
                                    className="p-1 hover:bg-blue-50 text-gray-500 hover:text-blue-600 rounded transition"
                                    title="View hire holder"
                                  >
                                    <ExternalLink size={14} />
                                  </Link>
                                )}

                                <button
                                  onClick={() => confirmDelete(v.id)}
                                  disabled={deleteLoading && deletingId === v.id}
                                  className="p-1 hover:bg-red-50 text-gray-500 hover:text-red-600 rounded transition"
                                  title="Delete vehicle"
                                >
                                  {deleteLoading && deletingId === v.id ? (
                                    <Loader2 size={12} className="animate-spin text-red-600" />
                                  ) : (
                                    <Trash2 size={12} />
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
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-auto max-h-[70vh]">
            {historyLoading ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="animate-spin text-emerald-600" size={32} />
              </div>
            ) : displayedHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4 text-gray-400">
                <History size={48} strokeWidth={1.1} />
                <p className="text-lg font-medium">
                  {historySearch ? "No fleet history records match your search" : "No fleet history records found"}
                </p>
              </div>
            ) : (
              <table className="w-full text-[13px]">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th
                      onClick={() => handleHistorySort("car_reg")}
                      className="text-left px-4 py-2.5 font-semibold text-gray-600 uppercase tracking-wide text-[10px] cursor-pointer hover:bg-gray-100 select-none"
                    >
                      <div className="flex items-center gap-1">
                        Car Reg No.
                        <ArrowUpDown size={12} className="text-gray-400" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleHistorySort("claim_id")}
                      className="text-left px-4 py-2.5 font-semibold text-gray-600 uppercase tracking-wide text-[10px] cursor-pointer hover:bg-gray-100 select-none"
                    >
                      <div className="flex items-center gap-1">
                        Claim ID
                        <ArrowUpDown size={12} className="text-gray-400" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleHistorySort("hire_start")}
                      className="text-left px-4 py-2.5 font-semibold text-gray-600 uppercase tracking-wide text-[10px] cursor-pointer hover:bg-gray-100 select-none"
                    >
                      <div className="flex items-center gap-1">
                        Hire Start
                        <ArrowUpDown size={12} className="text-gray-400" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleHistorySort("hire_end")}
                      className="text-left px-4 py-2.5 font-semibold text-gray-600 uppercase tracking-wide text-[10px] cursor-pointer hover:bg-gray-100 select-none"
                    >
                      <div className="flex items-center gap-1">
                        Hire End
                        <ArrowUpDown size={12} className="text-gray-400" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleHistorySort("miles_out")}
                      className="text-left px-4 py-2.5 font-semibold text-gray-600 uppercase tracking-wide text-[10px] cursor-pointer hover:bg-gray-100 select-none"
                    >
                      <div className="flex items-center gap-1">
                        Miles Out
                        <ArrowUpDown size={12} className="text-gray-400" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleHistorySort("miles_in")}
                      className="text-left px-4 py-2.5 font-semibold text-gray-600 uppercase tracking-wide text-[10px] cursor-pointer hover:bg-gray-100 select-none"
                    >
                      <div className="flex items-center gap-1">
                        Miles In
                        <ArrowUpDown size={12} className="text-gray-400" />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {displayedHistory.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50/60 transition text-xs">
                      <td className="px-4 py-2">
                        <span className="inline-flex px-2.5 py-1 bg-gray-100 text-gray-900 font-mono text-[11px] font-semibold tracking-wider rounded">
                          {record.car_reg}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <Link
                          href={`/claim/${record.claim_id}`}
                          className="text-blue-600 hover:text-blue-700 hover:underline font-medium flex items-center gap-1 group"
                        >
                          {record.claim_id}
                          <ExternalLink size={12} className="opacity-70 group-hover:opacity-100" />
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-gray-600">
                        {new Date(record.hire_start).toLocaleDateString("en-GB")}
                      </td>
                      <td className="px-4 py-2 text-gray-600">
                        {record.hire_end
                          ? new Date(record.hire_end).toLocaleDateString("en-GB")
                          : "-"
                        }
                      </td>
                      <td className="px-4 py-2 text-gray-600">
                        {record.miles_out ?? "-"}
                      </td>
                      <td className="px-4 py-2 text-gray-600">
                        {record.miles_in ?? "-"}
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