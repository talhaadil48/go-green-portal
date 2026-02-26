"use client";
import { useState, useEffect, FormEvent } from "react";
import { useParams } from "next/navigation";
import {
    ArrowLeft,
    Car,
    Users,
    Plus,
    Trash2,
    Pencil,
    Check,
    X,
    Loader2,
    ChevronDown,
    ChevronUp,
    Mail,
    LinkIcon,
    CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import api from "@/lib/axios";
import { generateLongClaimInvoicePDF } from "@/lib/pdf-generator2";

interface LongClaim {
    id: string;
    starting_date: string | null;
    ending_date: string | null;
    invoiced: boolean;          // ← added
}

interface CarItem {
    id: number;
    model: string | null;
    name: string | null;
    reg_no: string | null;
}

interface Claimant {
    id: number;
    long_claim_id: string;
    car_id: number;
    start_date: string | null;
    end_date: string | null;
    miles: number | null;
    name: string | null;
    location: string | null;
    delivery_charges: number;
}

function formatDate(d: string | null) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

export default function LongClaimDetailPage() {
    const params = useParams();
    const claimId = params.id as string;

    const [claim, setClaim] = useState<LongClaim | null>(null);
    const [claimCars, setClaimCars] = useState<CarItem[]>([]);
    const [allCars, setAllCars] = useState<CarItem[]>([]);
    const [claimantsByCar, setClaimantsByCar] = useState<Record<number, Claimant[]>>({});

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [addingCar, setAddingCar] = useState<number | null>(null);
    const [removingCar, setRemovingCar] = useState<number | null>(null);
    const [showCarSelector, setShowCarSelector] = useState(false);

    // Inline editing
    const [editingClaimantId, setEditingClaimantId] = useState<number | null>(null);
    const [editedClaimant, setEditedClaimant] = useState<Partial<Claimant>>({});
    const [savingClaimantId, setSavingClaimantId] = useState<number | null>(null);

    const [expandedCarId, setExpandedCarId] = useState<number | null>(null);

    // New claimant modal
    const [showNewClaimantModal, setShowNewClaimantModal] = useState(false);
    const [newClaimantCarId, setNewClaimantCarId] = useState<number | null>(null);
    const [newClaimantForm, setNewClaimantForm] = useState({
        start_date: "",
        end_date: "",
        miles: "",
        name: "",
        location: "",
        delivery_charges: "0",
    });
    const [savingNewClaimant, setSavingNewClaimant] = useState(false);

    // Delete claimant
    const [deletingClaimantId, setDeletingClaimantId] = useState<number | null>(null);

    // PDF & Email & Invoice marking
    const [pdfLoading, setPdfLoading] = useState(false);
    const [markingInvoiced, setMarkingInvoiced] = useState(false);
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [emailForm, setEmailForm] = useState({
        email: "",
        subject: "Claim Invoice",
    });
    const [sendingEmail, setSendingEmail] = useState(false);

    useEffect(() => {
        const fetchInitialData = async () => {
            setLoading(true);
            try {
                const [claimRes, allCarsRes, claimCarsRes] = await Promise.all([
                    api.get(`/api/long-claims/${claimId}`, { headers: { requiresAuth: true } }),
                    api.get("/api/cars", { headers: { requiresAuth: true } }),
                    api.get(`/api/long-claim/${claimId}/cars`, { headers: { requiresAuth: true } }),
                ]);

                if (!claimRes.data.success) throw new Error(claimRes.data.message || "Failed to load claim");

                setClaim(claimRes.data.data);
                setAllCars(allCarsRes.data.data || []);

                const cars = claimCarsRes.data.data || [];
                setClaimCars(cars);

                // Pre-fetch claimants
                if (cars.length > 0) {
                    await Promise.all(
                        cars.map(async (car: CarItem) => {
                            try {
                                const res = await api.get(`/api/car/${car.id}/claimants`, {
                                    headers: { requiresAuth: true },
                                });
                                setClaimantsByCar((prev) => ({
                                    ...prev,
                                    [car.id]: res.data.data || [],
                                }));
                            } catch (err) {
                                console.error(`Failed to preload claimants for car ${car.id}`, err);
                            }
                        })
                    );
                }
            } catch (err: any) {
                setError(err.message || "Failed to load claim details.");
            } finally {
                setLoading(false);
            }
        };

        fetchInitialData();
    }, [claimId]);

    const handleAddCar = async (carId: number) => {
        setAddingCar(carId);
        try {
            await api.post(`/api/long-claim/${claimId}/add-car`, { car_id: carId }, {
                headers: { requiresAuth: true },
            });
            const car = allCars.find((c) => c.id === carId);
            if (car) {
                setClaimCars((prev) => [...prev, car]);
                const res = await api.get(`/api/car/${carId}/claimants`, {
                    headers: { requiresAuth: true },
                });
                setClaimantsByCar((prev) => ({
                    ...prev,
                    [carId]: res.data.data || [],
                }));
            }
        } catch {
            alert("Failed to add car.");
        } finally {
            setAddingCar(null);
        }
    };

    const handleRemoveCar = async (carId: number) => {
        if (!confirm("Remove this car and all its claimants? This action cannot be undone.")) return;
        setRemovingCar(carId);
        try {
            await api.delete(`/api/long-claim/${claimId}/remove-car/${carId}`, {
                headers: { requiresAuth: true },
            });
            setClaimCars((prev) => prev.filter((c) => c.id !== carId));
            setClaimantsByCar((prev) => {
                const next = { ...prev };
                delete next[carId];
                return next;
            });
        } catch {
            alert("Failed to remove car.");
        } finally {
            setRemovingCar(null);
        }
    };

    // ─── Delete Claimant ─────────────────────────────────────────────────────
    const handleDeleteClaimant = async (claimantId: number, carId: number) => {
        if (!confirm("Delete this claimant? This cannot be undone.")) return;

        setDeletingClaimantId(claimantId);
        try {
            const res = await api.delete(`/api/claimant/${claimantId}`, {
                headers: { requiresAuth: true },
            });

            if (res.data.success) {
                setClaimantsByCar((prev) => ({
                    ...prev,
                    [carId]: prev[carId]?.filter((c) => c.id !== claimantId) || [],
                }));
            } else {
                alert(res.data.message || "Failed to delete claimant");
            }
        } catch {
            alert("Failed to delete claimant.");
        } finally {
            setDeletingClaimantId(null);
        }
    };

    // ─── Inline Edit ─────────────────────────────────────────────────────────
    const startEditing = (claimant: Claimant) => {
        setEditingClaimantId(claimant.id);
        setEditedClaimant({ ...claimant });
    };

    const cancelEdit = () => {
        setEditingClaimantId(null);
        setEditedClaimant({});
    };

    const handleEditChange = (field: keyof Claimant, value: any) => {
        setEditedClaimant((prev) => ({ ...prev, [field]: value }));
    };

    const saveEdit = async (carId: number, claimantId: number) => {
        setSavingClaimantId(claimantId);
        try {
            const payload = {
                start_date: editedClaimant.start_date || null,
                end_date: editedClaimant.end_date || null,
                miles: editedClaimant.miles ? Number(editedClaimant.miles) : null,
                name: editedClaimant.name || null,
                location: editedClaimant.location || null,
                delivery_charges: Number(editedClaimant.delivery_charges) || 0,
            };

            await api.put(`/api/claimant/${claimantId}`, payload, {
                headers: { requiresAuth: true },
            });

            const res = await api.get(`/api/car/${carId}/claimants`, {
                headers: { requiresAuth: true },
            });

            setClaimantsByCar((prev) => ({ ...prev, [carId]: res.data.data || [] }));
            cancelEdit();
        } catch {
            alert("Failed to update claimant.");
        } finally {
            setSavingClaimantId(null);
        }
    };

    // ─── New Claimant ────────────────────────────────────────────────────────
    const openNewClaimantModal = (carId: number) => {
        setNewClaimantCarId(carId);
        setNewClaimantForm({
            start_date: "",
            end_date: "",
            miles: "",
            name: "",
            location: "",
            delivery_charges: "0",
        });
        setShowNewClaimantModal(true);
    };
    const handleNewClaimantSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!newClaimantCarId) return;

        // Validate numeric fields before submitting
        const milesNum = Number(newClaimantForm.miles);
        const deliveryNum = Number(newClaimantForm.delivery_charges);

        if (newClaimantForm.miles && isNaN(milesNum)) {
            alert("Miles must be a number.");
            return;
        }

        if (newClaimantForm.delivery_charges && isNaN(deliveryNum)) {
            alert("Delivery charges must be a number.");
            return;
        }
      

        setSavingNewClaimant(true);
        try {
            const payload = {
                ...newClaimantForm,
                miles: newClaimantForm.miles ? milesNum : null,
                delivery_charges: newClaimantForm.delivery_charges ? deliveryNum : 0,
                long_claim_id: claimId,
                car_id: newClaimantCarId,
            };

            await api.post("/api/claimant", payload, { headers: { requiresAuth: true } });

            const res = await api.get(`/api/car/${newClaimantCarId}/claimants`, {
                headers: { requiresAuth: true },
            });

            setClaimantsByCar((prev) => ({
                ...prev,
                [newClaimantCarId]: res.data.data || [],
            }));

            setShowNewClaimantModal(false);
        } catch {
            alert("Failed to add claimant.");
        } finally {
            setSavingNewClaimant(false);
        }
    };


    // ─── PDF + Email ─────────────────────────────────────────────────────────
    const generatePdfBuffer = async () => {
        if (!claim) throw new Error("Claim not loaded");
        const period = {
            starting_date: claim.starting_date,
            ending_date: claim.ending_date,
        };
        if (!period.starting_date || !period.ending_date) {
            throw new Error("Claim is missing start and/or end date.");
        }

        const totalDelivery = Object.values(claimantsByCar)
            .flat()
            .reduce((sum, cl) => sum + (Number(cl.delivery_charges) || 0), 0);

        const bill = totalDelivery + 58 * claimCars.length;

        return await generateLongClaimInvoicePDF({
            claimId,
            period,
            claimCars,
            claimantsByCar,
            totalDelivery,
            bill,
        });
    };

    const handleDownloadPDF = async () => {
        setPdfLoading(true);
        try {
            const pdfBuffer = await generatePdfBuffer();
            const blob = new Blob([pdfBuffer], { type: "application/pdf" });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `Invoice-LongClaim-${claimId}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (err: any) {
            console.error("PDF generation failed:", err);
            alert("Failed to generate PDF. Please try again.");
        } finally {
            setPdfLoading(false);
        }
    };

    const handleSendEmail = async (e: FormEvent) => {
        e.preventDefault();
        if (!emailForm.email.trim()) {
            alert("Please enter a valid email address.");
            return;
        }

        setSendingEmail(true);
        try {
            const pdfBuffer = await generatePdfBuffer();
            const blob = new Blob([pdfBuffer], { type: "application/pdf" });
            const formData = new FormData();
            formData.append("file", blob, `Claim-Invoice-${claimId}.pdf`);
            formData.append("email", emailForm.email.trim());
            formData.append("subject", emailForm.subject.trim() || "Claim Invoice");
            formData.append("formType", "claim-invoice");
            formData.append("claimId", claimId);

            const res = await fetch("/api/send-pdf-email", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || "Failed to send email");
            }

            // Auto-mark as invoiced after successful email
            await api.put(`/api/long-claim/${claimId}/mark-invoice`, {}, {
                headers: { requiresAuth: true },
            });


            setShowEmailModal(false);
            setEmailForm({ email: "", subject: "Long Claim Invoice" });
        } catch (err: any) {
            console.error("Email send failed:", err);
            alert(err.message || "Failed to send email. Please try again.");
        } finally {
            setSendingEmail(false);
        }
    };

    // ─── Totals ──────────────────────────────────────────────────────────────
    const totalDeliveryCharges = Object.values(claimantsByCar)
        .flat()
        .reduce((sum, cl) => sum + (cl.delivery_charges || 0), 0);

    const bill = totalDeliveryCharges + 58 * claimCars.length;
    const total = bill + bill * 0.2; // add 20%

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="animate-spin text-emerald-500" size={40} />
            </div>
        );
    }

    if (error || !claim) {
        return (
            <div className="min-h-screen flex items-center justify-center text-center">
                <p className="text-red-600 mb-4">{error || "Claim not found"}</p>
                <Link href="/long-claims" className="text-emerald-600 hover:underline">
                    ← Back
                </Link>
            </div>
        );
    }

    const carsNotInClaim = allCars.filter((c) => !claimCars.some((cc) => cc.id === c.id));

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50/20 pb-10">
            <style jsx>{`
                input,
                textarea,
                [contenteditable="true"] {
                    text-transform: none;
                }
            `}</style>

            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Link
                    href="/long-claims"
                    className="inline-flex items-center gap-2 text-slate-500 hover:text-emerald-600 mb-6"
                >
                    <ArrowLeft size={16} /> Back to Sovereign Long term
                </Link>

                {/* Header */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm px-5 py-3 mb-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-lg font-bold text-slate-900">{claim.id}</h1>
                            <p className="text-sm text-slate-500">
                                {formatDate(claim.starting_date)} — {formatDate(claim.ending_date)}
                            </p>
                        </div>

                        <div className="flex items-center gap-3 flex-wrap">
                            <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2 text-center min-w-[140px]">
                                <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
                                    Total Bill
                                </p>
                                <p className="text-lg font-extrabold text-emerald-700">£{total.toFixed(2)}</p>
                            </div>

                            <button
                                onClick={handleDownloadPDF}
                                disabled={pdfLoading || claimCars.length === 0}
                                className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm"
                            >
                                {pdfLoading ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    "Download Invoice"
                                )}
                            </button>

                            {!claim.invoiced && (
                                <button
                                    onClick={() => setShowEmailModal(true)}
                                    disabled={claimCars.length === 0 || sendingEmail}
                                    className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium disabled:opacity-60 transition-colors shadow-sm"
                                >
                                    <Mail size={16} />
                                    Send by Email
                                </button>
                            )}


                        </div>
                    </div>
                </div>

                {/* Cars section */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <Car size={20} className="text-emerald-600" />
                            Vehicles ({claimCars.length})
                        </h2>
                        <button
                            onClick={() => setShowCarSelector((v) => !v)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium"
                        >
                            <Plus size={14} /> Add Vehicle
                        </button>
                    </div>

                    {showCarSelector && (
                        <div className="mb-6 bg-white border border-emerald-100 rounded-xl shadow-sm p-4 relative">
                            <button
                                onClick={() => setShowCarSelector(false)}
                                className="absolute top-2 right-3 text-slate-400 hover:text-slate-700"
                            >
                                ✕
                            </button>
                            <h3 className="text-sm font-semibold text-slate-600 mb-3">Add vehicle to claim</h3>

                            {carsNotInClaim.length === 0 ? (
                                <p className="text-slate-400 text-center py-3 text-sm">No more vehicles available</p>
                            ) : (
                                <div className="max-h-60 overflow-y-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b">
                                                <th className="py-1.5 text-left text-slate-500 font-medium">Name</th>
                                                <th className="py-1.5 text-left text-slate-500 font-medium">Model</th>
                                                <th className="py-1.5 text-left text-slate-500 font-medium">Reg</th>
                                                <th className="py-1.5 w-10"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {carsNotInClaim.map((car) => (
                                                <tr key={car.id} className="border-b last:border-0 hover:bg-slate-50">
                                                    <td className="py-2">{car.name || "—"}</td>
                                                    <td className="py-2">{car.model || "—"}</td>
                                                    <td className="py-2">{car.reg_no || "—"}</td>
                                                    <td className="py-2 text-center">
                                                        <button
                                                            onClick={() => handleAddCar(car.id)}
                                                            disabled={addingCar === car.id}
                                                            className="text-emerald-600 hover:text-emerald-800 disabled:opacity-50"
                                                        >
                                                            {addingCar === car.id ? (
                                                                <Loader2 size={16} className="animate-spin" />
                                                            ) : (
                                                                <Plus size={16} />
                                                            )}
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {claimCars.length === 0 ? (
                        <div className="bg-white border border-dashed border-slate-300 rounded-xl p-8 text-center text-slate-400 text-sm">
                            No vehicles in this claim yet
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {claimCars.map((car) => {
                                const carClaimants = claimantsByCar[car.id] || [];
                                const isExpanded = expandedCarId === car.id;

                                return (
                                    <div
                                        key={car.id}
                                        className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm"
                                    >
                                        <div className="flex items-center justify-between px-4 py-3">
                                            <button
                                                onClick={() => setExpandedCarId(isExpanded ? null : car.id)}
                                                className="flex items-center gap-3 flex-1 text-left"
                                            >
                                                <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                                                    <Car size={16} className="text-slate-500" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-800 text-sm">{car.name || "—"}</p>
                                                    <p className="text-xs text-slate-500">
                                                        {car.model || "—"} · {car.reg_no || "—"}
                                                    </p>
                                                </div>
                                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                            </button>

                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => openNewClaimantModal(car.id)}
                                                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded text-xs font-medium"
                                                >
                                                    <Users size={13} /> Add
                                                </button>
                                                <button
                                                    onClick={() => handleRemoveCar(car.id)}
                                                    disabled={removingCar === car.id}
                                                    className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded"
                                                >
                                                    {removingCar === car.id ? (
                                                        <Loader2 size={14} className="animate-spin" />
                                                    ) : (
                                                        <Trash2 size={14} />
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        {isExpanded && (
                                            <div className="border-t border-slate-100 px-4 py-4 bg-slate-50/50">
                                                {carClaimants.length === 0 ? (
                                                    <p className="text-center text-slate-400 text-sm py-4">No claimants yet</p>
                                                ) : (
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-sm">
                                                            <thead>
                                                                <tr className="border-b bg-slate-100/60">
                                                                    <th className="px-2 py-2 text-left text-slate-600 font-medium">Name</th>
                                                                    <th className="px-2 py-2 text-left text-slate-600 font-medium">Dates</th>
                                                                    <th className="px-2 py-2 text-left text-slate-600 font-medium">Location</th>
                                                                    <th className="px-2 py-2 text-left text-slate-600 font-medium">Miles</th>
                                                                    <th className="px-2 py-2 text-left text-slate-600 font-medium">Delivery</th>
                                                                    <th className="px-2 py-2 text-left text-slate-600 font-medium">Checklist</th>
                                                                    <th className="px-2 py-2 w-20"></th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {carClaimants.map((cl) => {
                                                                    const isEditing = editingClaimantId === cl.id;
                                                                    const isSaving = savingClaimantId === cl.id;
                                                                    const isDeleting = deletingClaimantId === cl.id;

                                                                    return (
                                                                        <tr
                                                                            key={cl.id}
                                                                            className="border-b last:border-0 hover:bg-slate-50/70"
                                                                        >
                                                                            <td className="px-2 py-2">
                                                                                {isEditing ? (
                                                                                    <input
                                                                                        value={editedClaimant.name ?? ""}
                                                                                        onChange={(e) => handleEditChange("name", e.target.value)}
                                                                                        className="w-full px-2 py-1 text-sm border rounded"
                                                                                    />
                                                                                ) : (
                                                                                    <span className="font-medium">{cl.name || "—"}</span>
                                                                                )}
                                                                            </td>

                                                                            <td className="px-2 py-2 whitespace-nowrap">
                                                                                {isEditing ? (
                                                                                    <div className="flex gap-1.5">
                                                                                        <input
                                                                                            type="date"
                                                                                            value={editedClaimant.start_date?.split("T")[0] ?? ""}
                                                                                            onChange={(e) =>
                                                                                                handleEditChange("start_date", e.target.value)
                                                                                            }
                                                                                            className="w-full px-1.5 py-1 text-sm border rounded"
                                                                                        />
                                                                                        <input
                                                                                            type="date"
                                                                                            value={editedClaimant.end_date?.split("T")[0] ?? ""}
                                                                                            onChange={(e) =>
                                                                                                handleEditChange("end_date", e.target.value)
                                                                                            }
                                                                                            className="w-full px-1.5 py-1 text-sm border rounded"
                                                                                        />
                                                                                    </div>
                                                                                ) : (
                                                                                    <span className="text-slate-600 text-xs">
                                                                                        {formatDate(cl.start_date)} – {formatDate(cl.end_date)}
                                                                                    </span>
                                                                                )}
                                                                            </td>

                                                                            <td className="px-2 py-2">
                                                                                {isEditing ? (
                                                                                    <input
                                                                                        value={editedClaimant.location ?? ""}
                                                                                        onChange={(e) =>
                                                                                            handleEditChange("location", e.target.value)
                                                                                        }
                                                                                        className="w-full px-2 py-1 text-sm border rounded"
                                                                                    />
                                                                                ) : (
                                                                                    <span className="text-slate-600 text-xs">
                                                                                        {cl.location || "—"}
                                                                                    </span>
                                                                                )}
                                                                            </td>

                                                                            <td className="px-2 py-2">
                                                                                {isEditing ? (
                                                                                    <input
                                                                                        type="number"
                                                                                        value={editedClaimant.miles ?? ""}
                                                                                        onChange={(e) =>
                                                                                            handleEditChange(
                                                                                                "miles",
                                                                                                e.target.value ? Number(e.target.value) : null
                                                                                            )
                                                                                        }
                                                                                        className="w-20 px-2 py-1 text-sm border rounded"
                                                                                    />
                                                                                ) : cl.miles != null ? (
                                                                                    <span className="text-xs">{cl.miles} mi</span>
                                                                                ) : (
                                                                                    "—"
                                                                                )}
                                                                            </td>

                                                                            <td className="px-2 py-2 font-medium text-emerald-600">
                                                                                {isEditing ? (
                                                                                    <input
                                                                                        type="number"
                                                                                        step="0.01"
                                                                                        value={editedClaimant.delivery_charges ?? "0"}
                                                                                        onChange={(e) =>
                                                                                            handleEditChange("delivery_charges", e.target.value)
                                                                                        }
                                                                                        className="w-20 px-2 py-1 text-sm border rounded"
                                                                                    />
                                                                                ) : (
                                                                                    `£${(cl.delivery_charges || 0).toFixed(2)}`
                                                                                )}
                                                                            </td>

                                                                            <td className="px-2 py-2 text-center">
                                                                                <a
                                                                                    href={`/hire-checklist?long_claim_id=${cl.long_claim_id}&car_id=${cl.car_id}&claimant_id=${cl.id}`}
                                                                                    target="_blank"
                                                                                    className="text-blue-600 hover:text-blue-800"
                                                                                >
                                                                                    <LinkIcon size={16} />
                                                                                </a>
                                                                            </td>

                                                                            <td className="px-2 py-2 text-center">
                                                                                {isEditing ? (
                                                                                    <div className="flex justify-center gap-2">
                                                                                        <button
                                                                                            onClick={() => saveEdit(car.id, cl.id)}
                                                                                            disabled={isSaving}
                                                                                            className="text-green-600 hover:text-green-800 disabled:opacity-50"
                                                                                        >
                                                                                            {isSaving ? (
                                                                                                <Loader2 size={14} className="animate-spin" />
                                                                                            ) : (
                                                                                                <Check size={16} />
                                                                                            )}
                                                                                        </button>
                                                                                        <button
                                                                                            onClick={cancelEdit}
                                                                                            className="text-red-600 hover:text-red-800"
                                                                                        >
                                                                                            <X size={16} />
                                                                                        </button>
                                                                                    </div>
                                                                                ) : (
                                                                                    <div className="flex justify-center gap-2">
                                                                                        <button
                                                                                            onClick={() => startEditing(cl)}
                                                                                            className="text-slate-500 hover:text-slate-700"
                                                                                        >
                                                                                            <Pencil size={14} />
                                                                                        </button>

                                                                                        <button
                                                                                            onClick={() => handleDeleteClaimant(cl.id, car.id)}
                                                                                            disabled={isDeleting}
                                                                                            className="text-red-500 hover:text-red-700"
                                                                                        >
                                                                                            {isDeleting ? (
                                                                                                <Loader2 size={14} className="animate-spin" />
                                                                                            ) : (
                                                                                                <Trash2 size={14} />
                                                                                            )}
                                                                                        </button>
                                                                                    </div>
                                                                                )}
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>

            {/* New Claimant Modal */}
            {showNewClaimantModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
                        <div className="px-5 py-4 border-b flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-slate-800">Add New Claimant</h3>
                            <button
                                onClick={() => setShowNewClaimantModal(false)}
                                className="text-slate-400 hover:text-slate-700"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleNewClaimantSubmit} className="p-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                                <div>
                                    <label className="block text-xs text-slate-600 mb-1">Name</label>
                                    <input
                                        value={newClaimantForm.name}
                                        onChange={(e) => setNewClaimantForm((p) => ({ ...p, name: e.target.value }))}
                                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-600 mb-1">Location</label>
                                    <input
                                        value={newClaimantForm.location}
                                        onChange={(e) => setNewClaimantForm((p) => ({ ...p, location: e.target.value }))}
                                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-600 mb-1">Start Date</label>
                                    <input
                                        type="date"
                                        value={newClaimantForm.start_date}
                                        onChange={(e) => setNewClaimantForm((p) => ({ ...p, start_date: e.target.value }))}
                                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-600 mb-1">End Date</label>
                                    <input
                                        type="date"
                                        value={newClaimantForm.end_date}
                                        onChange={(e) => setNewClaimantForm((p) => ({ ...p, end_date: e.target.value }))}
                                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-600 mb-1">Miles</label>
                                    <input
                                        type="number"
                                        value={newClaimantForm.miles}
                                        onChange={(e) => setNewClaimantForm((p) => ({ ...p, miles: e.target.value }))}
                                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-600 mb-1">Delivery (£)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={newClaimantForm.delivery_charges}
                                        onChange={(e) =>
                                            setNewClaimantForm((p) => ({ ...p, delivery_charges: e.target.value }))
                                        }
                                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowNewClaimantModal(false)}
                                    className="px-4 py-2 text-sm border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingNewClaimant}
                                    className="flex items-center gap-2 px-5 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-60"
                                >
                                    {savingNewClaimant && <Loader2 size={14} className="animate-spin" />}
                                    Add Claimant
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Email Modal */}
            {showEmailModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
                        <div className="px-6 py-4 border-b flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-slate-800">Send Invoice by Email</h3>
                            <button
                                onClick={() => setShowEmailModal(false)}
                                className="text-slate-500 hover:text-slate-800 text-xl"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSendEmail} className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Recipient Email *
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={emailForm.email}
                                    onChange={(e) => setEmailForm((p) => ({ ...p, email: e.target.value }))}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    placeholder="customer@example.com"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                                <input
                                    value={emailForm.subject}
                                    onChange={(e) => setEmailForm((p) => ({ ...p, subject: e.target.value }))}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    placeholder="Long Claim Invoice"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowEmailModal(false)}
                                    className="px-5 py-2 text-sm border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={sendingEmail}
                                    className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-60 font-medium"
                                >
                                    {sendingEmail && <Loader2 size={16} className="animate-spin" />}
                                    Send
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}