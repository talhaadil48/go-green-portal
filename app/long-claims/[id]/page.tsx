"use client";
import { useState, useEffect, FormEvent } from "react";
import { useParams } from "next/navigation";
import Cookies from "js-cookie";
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
    FileText,
    Search,
    Info,
} from "lucide-react";
import Link from "next/link";
import api from "@/lib/axios";
import { generateLongClaimInvoicePDF } from "@/lib/pdf-generator2";

interface LongClaim {
    id: string;
    starting_date: string | null;
    ending_date: string | null;
    invoiced: boolean;
    hirer_name: string | null;
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
    claimant_id: string | null;
    ref_no: string | null;
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

function calculateDays(start: string | null, end: string | null): number {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(end);
    endDate.setHours(0, 0, 0, 0);
    const diff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    return Math.floor(diff) + 1;
}

function Badge({ children, color = "slate" }: { children: React.ReactNode; color?: string }) {
    const colors: Record<string, string> = {
        emerald: "bg-emerald-100 text-emerald-700 border-emerald-200",
        slate: "bg-slate-100 text-slate-600 border-slate-200",
        amber: "bg-amber-100 text-amber-700 border-amber-200",
    };
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colors[color]}`}>
            {children}
        </span>
    );
}

export default function LongClaimDetailPage() {
    const params = useParams();
    const claimId = params.id as string;

    const [claim, setClaim] = useState<LongClaim | null>(null);
    const [claimCars, setClaimCars] = useState<CarItem[]>([]);
    const [allCars, setAllCars] = useState<CarItem[]>([]);
    const [claimantsByCar, setClaimantsByCar] = useState<Record<number, Claimant[]>>({});
    const [dailyRates, setDailyRates] = useState<Record<number, number>>({});
    
    // New state for reference number mapping
    const [refLongClaims, setRefLongClaims] = useState<Record<string, string[]>>({});

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [addingCar, setAddingCar] = useState<number | null>(null);
    const [removingCar, setRemovingCar] = useState<number | null>(null);
    const [showCarSelector, setShowCarSelector] = useState(false);
    const [carSearch, setCarSearch] = useState("");
    
    // Search bar for claimants
    const [claimantSearchQuery, setClaimantSearchQuery] = useState("");

    const [editingClaimantId, setEditingClaimantId] = useState<number | null>(null);
    const [editedClaimant, setEditedClaimant] = useState<Partial<Claimant>>({});
    const [savingClaimantId, setSavingClaimantId] = useState<number | null>(null);
    const [claimantError, setClaimantError] = useState<string | null>(null);

    const [editingDailyRateCarId, setEditingDailyRateCarId] = useState<number | null>(null);
    const [editedDailyRate, setEditedDailyRate] = useState<number>(0);
    const [savingDailyRateCarId, setSavingDailyRateCarId] = useState<number | null>(null);

    const [expandedCarId, setExpandedCarId] = useState<number | null>(null);

    const [showNewClaimantModal, setShowNewClaimantModal] = useState(false);
    const [newClaimantCarId, setNewClaimantCarId] = useState<number | null>(null);
    const [newClaimantForm, setNewClaimantForm] = useState({
        claimant_id: "",
        ref_no: "",
        start_date: "",
        end_date: "",
        miles: "",
        name: "",
        location: "",
        delivery_charges: "",
    });
    const [savingNewClaimant, setSavingNewClaimant] = useState(false);
    const [newClaimantError, setNewClaimantError] = useState<string | null>(null);

    const [deletingClaimantId, setDeletingClaimantId] = useState<number | null>(null);

    const [pdfLoading, setPdfLoading] = useState(false);
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [emailForm, setEmailForm] = useState({ email: "", subject: "Long Term Hire Invoice" });
    const [sendingEmail, setSendingEmail] = useState(false);
    const [username, setUsername] = useState<string | null>(null);

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

    const isCarAvailable = (carId: number): boolean => {
        const claimants = claimantsByCar[carId] || [];
        if (claimants.length === 0) return true;
        return claimants.every((cl) => cl.end_date !== null && cl.end_date !== undefined);
    };

    const fetchRefData = async (claimantsMap: Record<number, Claimant[]>) => {
        const refs = new Set<string>();
        Object.values(claimantsMap).flat().forEach((cl) => {
            if (cl.ref_no) refs.add(cl.ref_no);
        });
        const refArray = Array.from(refs);
        if (refArray.length === 0) return;

        try {
            const searchParams = new URLSearchParams();
            refArray.forEach(ref => searchParams.append("ref_nos", ref));
            
            const res = await api.get(`/api/claimants/refs/long_claims?${searchParams.toString()}`, { headers: { requiresAuth: true } });
            if (res.data.success) {
                setRefLongClaims(res.data.data);
            }
        } catch (error) {
            console.error("Failed to fetch ref long claims", error);
        }
    };

    useEffect(() => {
        const fetchInitialData = async () => {
            setLoading(true);
            try {
                const [claimRes, allCarsRes, claimCarsRes] = await Promise.all([
                    api.get(`/api/long-claims/${claimId}`, { headers: { requiresAuth: true } }),
                    api.get("/api/cars/available", { headers: { requiresAuth: true } }),
                    api.get(`/api/long-claim/${claimId}/cars`, { headers: { requiresAuth: true } }),
                ]);
                if (!claimRes.data.success) throw new Error(claimRes.data.message || "Failed to load claim");
                setClaim(claimRes.data.data);
                setAllCars(allCarsRes.data.data || []);
                const cars = claimCarsRes.data.data || [];
                setClaimCars(cars);
                try {
                    const res = await api.get(`/api/long-hire/${claimId}/claimants`, { headers: { requiresAuth: true } });
                    const claimantsData = res.data.data || {};
                    setClaimantsByCar(claimantsData);
                    
                    // Fetch long claims by reference numbers
                    await fetchRefData(claimantsData);

                    const ratesRes = await api.get(`/api/long-claim/${claimId}/daily-rates`, { headers: { requiresAuth: true } });
                    setDailyRates(ratesRes.data.data || {});
                } catch (error) {
                    console.error("Failed to fetch claimants or rates:", error);
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
            await api.post(`/api/long-claim/${claimId}/add-car`, { car_id: carId }, { headers: { requiresAuth: true } });
            const car = allCars.find((c) => c.id === carId);
            if (car) {
                setClaimCars((prev) => [...prev, car]);
                const res = await api.get(`/api/car/${carId}/claimants/${claimId}`, { headers: { requiresAuth: true } });
                const newClaimantsData = { ...claimantsByCar, [carId]: res.data.data || [] };
                setClaimantsByCar(newClaimantsData);
                await fetchRefData(newClaimantsData);

                const dailyRatesRes = await api.get(`/api/long-claim/${claimId}/daily-rates`, { headers: { requiresAuth: true } });
                setDailyRates(dailyRatesRes.data.data);
            }
        } catch {
            alert("Failed to add car.");
        } finally {
            setAddingCar(null);
        }
    };

    const handleRemoveCar = async (carId: number) => {
        if (!confirm("Remove this car and all its claimants? This cannot be undone.")) return;
        setRemovingCar(carId);
        try {
            await api.delete(`/api/long-claim/${claimId}/remove-car/${carId}`, { headers: { requiresAuth: true } });
            setClaimCars((prev) => prev.filter((c) => c.id !== carId));
            setClaimantsByCar((prev) => { const next = { ...prev }; delete next[carId]; return next; });
            setDailyRates((prev) => { const next = { ...prev }; delete next[carId]; return next; });
        } catch {
            alert("Failed to remove car.");
        } finally {
            setRemovingCar(null);
        }
    };

    const handleDeleteClaimant = async (claimantId: number, carId: number) => {
        if (!confirm("Delete this claimant? This cannot be undone.")) return;
        setDeletingClaimantId(claimantId);
        try {
            const res = await api.delete(`/api/claimant/${claimantId}`, { headers: { requiresAuth: true } });
            if (res.data.success) {
                setClaimantsByCar((prev) => ({ ...prev, [carId]: prev[carId]?.filter((c) => c.id !== claimantId) || [] }));
            } else {
                alert(res.data.message || "Failed to delete claimant");
            }
        } catch {
            alert("Failed to delete claimant.");
        } finally {
            setDeletingClaimantId(null);
        }
    };

    const startEditing = (claimant: Claimant) => {
        setEditingClaimantId(claimant.id);
        setEditedClaimant({ ...claimant });
        setClaimantError(null);
    };
    const cancelEdit = () => {
        setEditingClaimantId(null);
        setEditedClaimant({});
        setClaimantError(null);
    };
    const handleEditChange = (field: keyof Claimant, value: any) => setEditedClaimant((prev) => ({ ...prev, [field]: value }));

    const saveEdit = async (carId: number, claimantId: number) => {
        setSavingClaimantId(claimantId);
        setClaimantError(null);
        
        const claimStart = claim?.starting_date?.split("T")[0];
        const claimEnd = claim?.ending_date?.split("T")[0];
        const editStart = editedClaimant.start_date?.split("T")[0];
        const editEnd = editedClaimant.end_date?.split("T")[0];
        
        if (editStart && claimStart && editStart < claimStart) {
            setClaimantError(`Start date cannot be earlier than claim start date (${formatDate(claimStart)}).`);
            setSavingClaimantId(null);
            return;
        }
        if (editEnd && claimEnd && editEnd > claimEnd) {
            setClaimantError(`End date cannot be later than claim end date (${formatDate(claimEnd)}).`);
            setSavingClaimantId(null);
            return;
        }

        try {
            const payload = {
                claimant_id: editedClaimant.claimant_id || null,
                ref_no: editedClaimant.ref_no || null,
                start_date: editedClaimant.start_date || null,
                end_date: editedClaimant.end_date || null,
                miles: (editedClaimant.miles === "" || editedClaimant.miles === null || editedClaimant.miles === undefined) ? null : Number(editedClaimant.miles),
                name: editedClaimant.name || null,
                location: editedClaimant.location || null,
                delivery_charges: editedClaimant.delivery_charges ? Number(editedClaimant.delivery_charges) : 0,
            };
            await api.put(`/api/claimant/${claimantId}`, payload, { headers: { requiresAuth: true } });
            const res = await api.get(`/api/car/${carId}/claimants/${claimId}`, { headers: { requiresAuth: true } });
            const newClaimantsData = { ...claimantsByCar, [carId]: res.data.data || [] };
            setClaimantsByCar(newClaimantsData);
            await fetchRefData(newClaimantsData);
            cancelEdit();
        } catch (err: any) {
            const errorMessage = err.response?.data?.detail || "Failed to update claimant.";
            setClaimantError(errorMessage);
        } finally {
            setSavingClaimantId(null);
        }
    };

    const startEditingDailyRate = (carId: number) => {
        setEditingDailyRateCarId(carId);
        setEditedDailyRate(dailyRates[carId] || 58);
    };

    const cancelEditingDailyRate = () => {
        setEditingDailyRateCarId(null);
    };

    const handleSaveDailyRate = async (carId: number) => {
        setSavingDailyRateCarId(carId);
        try {
            await api.put(`/api/long-claim/${claimId}/daily-rate`, { car_id: carId, daily_rate: editedDailyRate }, { headers: { requiresAuth: true } });
            setDailyRates((prev) => ({ ...prev, [carId]: editedDailyRate }));
            setEditingDailyRateCarId(null);
        } catch {
            alert("Failed to update daily rate.");
        } finally {
            setSavingDailyRateCarId(null);
        }
    };

    const openNewClaimantModal = (carId: number) => {
        setNewClaimantCarId(carId);
        setNewClaimantForm({ claimant_id: "", ref_no: "", start_date: "", end_date: "", miles: "", name: "", location: "", delivery_charges: "" });
        setNewClaimantError(null);
        setShowNewClaimantModal(true);
    };

    const handleNewClaimantSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!newClaimantCarId) return;

        setNewClaimantError(null);
        
        const claimStart = claim?.starting_date?.split("T")[0];
        const claimEnd = claim?.ending_date?.split("T")[0];

        if (newClaimantForm.start_date && claimStart && newClaimantForm.start_date < claimStart) {
            setNewClaimantError(`Start date cannot be earlier than claim start date (${formatDate(claimStart)}).`);
            return;
        }
        if (newClaimantForm.end_date && claimEnd && newClaimantForm.end_date > claimEnd) {
            setNewClaimantError(`End date cannot be later than claim end date (${formatDate(claimEnd)}).`);
            return;
        }

        const milesNum = newClaimantForm.miles ? Number(newClaimantForm.miles) : null;
        const deliveryNum = newClaimantForm.delivery_charges ? Number(newClaimantForm.delivery_charges) : 0;
        
        if (newClaimantForm.miles && isNaN(milesNum as number)) { alert("Miles must be a valid number."); return; }
        if (newClaimantForm.delivery_charges && isNaN(deliveryNum)) { alert("Delivery charges must be a valid number."); return; }

        setSavingNewClaimant(true);
        try {
            const payload = {
                claimant_id: newClaimantForm.claimant_id || null,
                ref_no: newClaimantForm.ref_no || null,
                start_date: newClaimantForm.start_date || null,
                end_date: newClaimantForm.end_date || null,
                miles: milesNum,
                name: newClaimantForm.name || null,
                location: newClaimantForm.location || null,
                delivery_charges: deliveryNum,
                long_claim_id: claimId,
                car_id: newClaimantCarId
            };
            await api.post("/api/claimant", payload, { headers: { requiresAuth: true } });
            const res = await api.get(`/api/car/${newClaimantCarId}/claimants/${claimId}`, { headers: { requiresAuth: true } });
            const newClaimantsData = { ...claimantsByCar, [newClaimantCarId]: res.data.data || [] };
            setClaimantsByCar(newClaimantsData);
            await fetchRefData(newClaimantsData);
            setShowNewClaimantModal(false);
        } catch (err: any) {
            const errorMessage = err.response?.data?.detail || "Failed to add claimant.";
            setNewClaimantError(errorMessage);
        } finally {
            setSavingNewClaimant(false);
        }
    };

    const generatePdfBuffer = async () => {
        if (!claim) throw new Error("Claim not loaded");
        const period = { starting_date: claim.starting_date, ending_date: claim.ending_date };
        if (!period.starting_date || !period.ending_date) throw new Error("Claim is missing start and/or end date.");
        const totalDelivery = Object.values(claimantsByCar).flat().reduce((sum, cl) => sum + (Number(cl.delivery_charges) || 0), 0);
        return await generateLongClaimInvoicePDF({ claimId, period, claimCars, claimantsByCar, totalDelivery, dailyRates, hirer_name: claim.hirer_name });
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
            alert("Failed to generate PDF. Please try again.");
        } finally {
            setPdfLoading(false);
        }
    };

    const days = calculateDays(claim?.starting_date, claim?.ending_date);
    const totalDeliveryCharges = Object.values(claimantsByCar).flat().reduce((sum, cl) => sum + (cl.delivery_charges || 0), 0);
    const totalHire = claimCars.reduce((sum, car) => sum + (dailyRates[car.id] || 0) * days, 0);
    const bill = totalHire + totalDeliveryCharges;
    const vat = bill * 0.2;
    const total = bill + vat;
    const totalClaimants = Object.values(claimantsByCar).flat().length;

    const handleSendEmail = async (e: FormEvent) => {
        e.preventDefault();
        if (!emailForm.email.trim()) { alert("Please enter a valid email address."); return; }
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
            const res = await fetch("/api/send-pdf-email", { method: "POST", body: formData });
            if (!res.ok) { const errData = await res.json().catch(() => ({})); throw new Error(errData.message || "Failed to send email"); }
            await api.post(`/api/long_hire_invoice`, {
                claim_id: claimId,
                amount: total.toFixed(2),
                user_name: username || "Unknown",
            }, { headers: { requiresAuth: true } });
            setShowEmailModal(false);
            setEmailForm({ email: "", subject: "Long Claim Invoice" });
        } catch (err: any) {
            alert(err.message || "Failed to send email. Please try again.");
        } finally {
            setSendingEmail(false);
        }
    };

    const filteredCarsNotInClaim = allCars
        .filter((c) => !claimCars.some((cc) => cc.id === c.id))
        .filter((c) => {
            const q = carSearch.toLowerCase();
            return !q || (c.name || "").toLowerCase().includes(q) || (c.model || "").toLowerCase().includes(q) || (c.reg_no || "").toLowerCase().includes(q);
        });

    const getFilteredCarsForDisplay = () => {
        if (!claimantSearchQuery) return claimCars;
        const q = claimantSearchQuery.toLowerCase();
        
        return claimCars.filter(car => {
            const carMatches = (car.reg_no || "").toLowerCase().includes(q) || (car.name || "").toLowerCase().includes(q);
            const matchingClaimants = (claimantsByCar[car.id] || []).filter(cl => 
                (cl.claimant_id || "").toLowerCase().includes(q) ||
                (cl.name || "").toLowerCase().includes(q) ||
                (cl.ref_no || "").toLowerCase().includes(q)
            );
            return carMatches || matchingClaimants.length > 0;
        });
    };

    const carsToDisplay = getFilteredCarsForDisplay();

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-slate-50 to-emerald-50">
                <Loader2 className="animate-spin text-emerald-500" size={36} />
                <p className="text-slate-500 text-sm font-medium">Loading claim details…</p>
            </div>
        );
    }

    if (error || !claim) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4">
                <p className="text-red-600 text-sm">{error || "Claim not found"}</p>
                <Link href="/long-claims" className="text-emerald-600 hover:underline text-sm">← Back to Long Claims</Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50/40 font-sans">
            <style jsx global>{`
                * { box-sizing: border-box; }
                input, textarea { text-transform: none !important; }
                .fade-in { animation: fadeIn 0.2s ease; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>

            <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
                    <Link href="/long-claims" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-emerald-700 transition-colors">
                        <ArrowLeft size={15} />
                        <span>Long Term Hires</span>
                    </Link>

                    <div className="flex items-center gap-1.5 text-slate-700 font-semibold text-sm">
                        <FileText size={15} className="text-emerald-600" />
                        <span>{claim.id}</span>
                        {claim.invoiced && <Badge color="emerald">Invoiced</Badge>}
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleDownloadPDF}
                            disabled={pdfLoading || claimCars.length === 0 || !claim.ending_date}
                            title={!claim.ending_date ? "Please provide an end date to download PDF" : ""}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 text-slate-700 hover:border-emerald-400 hover:text-emerald-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {pdfLoading ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
                            {pdfLoading ? "Generating…" : "Download PDF"}
                        </button>

                        {!claim.invoiced && (
                            <button
                                onClick={() => setShowEmailModal(true)}
                                disabled={claimCars.length === 0 || !claim.ending_date}
                                title={!claim.ending_date ? "Please provide an end date to send invoice" : ""}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50"
                            >
                                <Mail size={13} />
                                Send Invoice
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { label: "Period", value: `${formatDate(claim.starting_date)} – ${formatDate(claim.ending_date)}` },
                        { label: "Vehicles", value: claimCars.length.toString(), accent: true },
                        { label: "Claimants", value: totalClaimants.toString(), accent: true },
                        { label: "Total (inc. VAT)", value: !claim.ending_date ? "— Please add end date" : `£${total.toFixed(2)}`, highlight: true },
                    ].map((s) => (
                        <div key={s.label} className={`rounded-xl px-4 py-3 border ${s.highlight ? "bg-emerald-600 border-emerald-600 text-white" : "bg-white border-slate-200"}`} title={!claim.ending_date && s.label === "Total (inc. VAT)" ? "Please provide an end date to calculate total" : ""}>
                            <p className={`text-xs font-medium mb-0.5 ${s.highlight ? "text-emerald-100" : "text-slate-400"}`}>{s.label}</p>
                            <p className={`text-base font-bold leading-tight ${s.highlight ? "text-white" : s.accent ? "text-emerald-700" : "text-slate-800"}`}>{s.value}</p>
                        </div>
                    ))}
                </div>
                
                <div className="relative mb-3">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search directly for any claimant by ID, name, ref no, or car..."
                        value={claimantSearchQuery}
                        onChange={(e) => setClaimantSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 text-sm border border-slate-200 shadow-sm rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-shadow"
                    />
                </div>

                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Car size={16} className="text-emerald-600" />
                            <h2 className="font-semibold text-slate-800 text-sm">Vehicles & Claimants</h2>
                            <Badge color="slate">{carsToDisplay.length}</Badge>
                        </div>
                        <button
                            onClick={() => { setShowCarSelector((v) => !v); setCarSearch(""); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-colors"
                        >
                            <Plus size={13} />
                            Add Vehicle
                        </button>
                    </div>

                    {showCarSelector && (
                        <div className="border-b border-slate-100 px-5 py-4 bg-emerald-50/40 fade-in">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Select a vehicle to add</p>
                                <button onClick={() => setShowCarSelector(false)} className="text-slate-400 hover:text-slate-600 text-lg leading-none">×</button>
                            </div>

                            <div className="relative mb-3">
                                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search by name, model or reg…"
                                    value={carSearch}
                                    onChange={(e) => setCarSearch(e.target.value)}
                                    className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                                />
                            </div>

                            {filteredCarsNotInClaim.length === 0 ? (
                                <p className="text-center text-slate-400 py-4 text-sm">{carSearch ? "No vehicles match your search" : "All vehicles are already in this claim"}</p>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
                                    {filteredCarsNotInClaim.map((car) => (
                                        <button
                                            key={car.id}
                                            onClick={() => handleAddCar(car.id)}
                                            disabled={addingCar === car.id}
                                            className="flex items-center justify-between px-3 py-2.5 bg-white border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 rounded-lg text-left transition-colors group disabled:opacity-60"
                                        >
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-slate-800 truncate">{car.reg_no || "—"}</p>
                                                <p className="text-xs text-slate-400">{car.name || "—"} · {car.model || "—"}</p>
                                            </div>
                                            <span className="ml-2 flex-shrink-0 text-emerald-600 group-hover:text-emerald-700">
                                                {addingCar === car.id ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {carsToDisplay.length === 0 ? (
                        <div className="py-14 text-center">
                            <Car size={32} className="mx-auto text-slate-300 mb-3" />
                            <p className="text-slate-400 text-sm">
                                {claimantSearchQuery ? "No matching cars or claimants found" : "No vehicles in this claim yet"}
                            </p>
                            {!claimantSearchQuery && (
                                <button onClick={() => setShowCarSelector(true)} className="mt-3 text-emerald-600 hover:text-emerald-700 text-sm font-medium">+ Add your first vehicle</button>
                            )}
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {carsToDisplay.map((car) => {
                                let carClaimants = claimantsByCar[car.id] || [];
                                if (claimantSearchQuery) {
                                    const q = claimantSearchQuery.toLowerCase();
                                    carClaimants = carClaimants.filter(cl => 
                                        (cl.claimant_id || "").toLowerCase().includes(q) ||
                                        (cl.name || "").toLowerCase().includes(q) ||
                                        (cl.ref_no || "").toLowerCase().includes(q)
                                    );
                                }

                                const sortedClaimants = [...carClaimants].sort((a, b) => {
                                    if (!a.start_date) return 1;
                                    if (!b.start_date) return -1;
                                    return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
                                });

                                const isExpanded = (claimantSearchQuery && carClaimants.length > 0) ? true : expandedCarId === car.id;
                                
                                const carDelivery = carClaimants.reduce((s, c) => s + (c.delivery_charges || 0), 0);
                                const dailyRate = dailyRates[car.id] || 0;
                                const isEditingRate = editingDailyRateCarId === car.id;
                                const isSavingRate = savingDailyRateCarId === car.id;
                                const available = isCarAvailable(car.id);

                                return (
                                    <div key={car.id}>
                                        <div className={`px-5 py-3.5 flex items-center gap-3 transition-colors ${isExpanded ? "bg-slate-50" : "hover:bg-slate-50/60"}`}>
                                            <button
                                                onClick={() => {
                                                    if (!claimantSearchQuery) {
                                                        setExpandedCarId(isExpanded ? null : car.id);
                                                    }
                                                }}
                                                className="flex items-center gap-3 flex-1 text-left min-w-0"
                                                disabled={!!claimantSearchQuery}
                                            >
                                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${isExpanded ? "bg-emerald-100" : "bg-slate-100"}`}>
                                                    <Car size={15} className={isExpanded ? "text-emerald-600" : "text-slate-500"} />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="font-bold text-slate-800 text-sm">{car.reg_no || "—"}</span>
                                                        <span className="text-xs text-slate-400 font-normal">{car.name || "—"} · {car.model || "—"}</span>

                                                        {available ? (
                                                            <Badge color="emerald">Available</Badge>
                                                        ) : (
                                                            <Badge color="amber">In Use</Badge>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-3 mt-0.5">
                                                        <span className="text-xs text-slate-400">
                                                            {(claimantsByCar[car.id] || []).length} claimant{(claimantsByCar[car.id] || []).length !== 1 ? "s" : ""}
                                                            {claimantSearchQuery && carClaimants.length > 0 && ` (${carClaimants.length} match)`}
                                                        </span>
                                                        {carDelivery > 0 && <span className="text-xs text-emerald-600 font-medium">£{carDelivery.toFixed(2)} delivery</span>}
                                                        {isEditingRate ? (
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-xs text-slate-600">£</span>
                                                                <input
                                                                    type="number"
                                                                    step="0.01"
                                                                    value={editedDailyRate}
                                                                    onChange={(e) => setEditedDailyRate(Number(e.target.value))}
                                                                    className="w-16 px-1.5 py-0.5 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-emerald-400"
                                                                />
                                                                <span className="text-xs text-slate-600">/ day</span>
                                                                <button
                                                                    onClick={() => handleSaveDailyRate(car.id)}
                                                                    disabled={isSavingRate}
                                                                    className="p-0.5 text-emerald-600 hover:text-emerald-800"
                                                                >
                                                                    {isSavingRate ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                                                </button>
                                                                <button
                                                                    onClick={cancelEditingDailyRate}
                                                                    className="p-0.5 text-slate-500 hover:text-slate-700"
                                                                >
                                                                    <X size={12} />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); startEditingDailyRate(car.id); }}
                                                                className="flex items-center gap-1 text-xs text-emerald-600 font-medium hover:underline z-10"
                                                            >
                                                                £{dailyRate.toFixed(2)} / day <Pencil size={10} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex-shrink-0 text-slate-400">
                                                    {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                                                </div>
                                            </button>

                                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                                <button
                                                    onClick={() => openNewClaimantModal(car.id)}
                                                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-colors"
                                                >
                                                    <Users size={12} />
                                                    Add Claimant
                                                </button>
                                                <button
                                                    onClick={() => handleRemoveCar(car.id)}
                                                    disabled={removingCar === car.id}
                                                    className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                                                    title="Remove vehicle"
                                                >
                                                    {removingCar === car.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                                </button>
                                            </div>
                                        </div>

                                        {isExpanded && (
                                            <div className="bg-slate-50 border-t border-slate-100 px-4 py-3 fade-in">
                                                {sortedClaimants.length === 0 ? (
                                                    <div className="text-center py-5">
                                                        <Users size={20} className="mx-auto text-slate-300 mb-1.5" />
                                                        <p className="text-slate-400 text-xs mb-2">
                                                            {claimantSearchQuery ? "No matching claimants in this vehicle" : "No claimants yet"}
                                                        </p>
                                                        {!claimantSearchQuery && (
                                                            <button
                                                                onClick={() => openNewClaimantModal(car.id)}
                                                                className="text-emerald-600 text-xs font-medium hover:text-emerald-700"
                                                            >
                                                                + Add claimant
                                                            </button>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="overflow-x-visible">
                                                        <table className="min-w-full divide-y divide-slate-200 text-xs">
                                                            <thead className="bg-slate-100/70">
                                                                <tr>
                                                                    <th className="px-3 py-1.5 text-left font-medium text-slate-600">Claimant ID</th>
                                                                    <th className="px-3 py-1.5 text-left font-medium text-slate-600">Your Ref No</th>
                                                                    <th className="px-3 py-1.5 text-left font-medium text-slate-600">Name</th>
                                                                    <th className="px-3 py-1.5 text-left font-medium text-slate-600">Location</th>
                                                                    <th className="px-2 py-1.5 text-left font-medium text-slate-600">Period</th>
                                                                    <th className="px-2 py-1.5 text-left font-medium text-slate-600">Miles</th>
                                                                    <th className="px-2 py-1.5 text-left font-medium text-slate-600">Delivery</th>
                                                                    <th className="px-1 py-1.5 text-right font-medium text-slate-600 w-20">Actions</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-100 bg-white">
                                                                {sortedClaimants.map((cl) => {
                                                                    const isEditing = editingClaimantId === cl.id;
                                                                    const isSaving = savingClaimantId === cl.id;
                                                                    const isDeleting = deletingClaimantId === cl.id;
                                                                    
                                                                    // Check if reference number appears in other claims
                                                                    const claimsForRef = cl.ref_no ? refLongClaims[cl.ref_no] || [] : [];
                                                                    const otherClaimsWithRef = claimsForRef.filter(id => id !== claimId);
                                                                    const hasMultipleClaims = otherClaimsWithRef.length > 0;

                                                                    return (
                                                                        <tr
                                                                            key={cl.id}
                                                                            className={`hover:bg-slate-50/70 transition-colors ${isEditing ? "bg-emerald-50/40" : ""}`}
                                                                        >
                                                                            {isEditing ? (
                                                                                <>
                                                                                    <td className="px-3 py-1.5">
                                                                                        <input
                                                                                            type="text"
                                                                                            value={editedClaimant.claimant_id ?? ""}
                                                                                            onChange={(e) =>
                                                                                                handleEditChange("claimant_id", e.target.value.toUpperCase())
                                                                                            }
                                                                                            style={{ textTransform: "uppercase" }}
                                                                                            className="w-full px-1.5 py-0.5 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-emerald-400"
                                                                                        />
                                                                                    </td>
                                                                                    <td className="px-3 py-1.5">
                                                                                        <input
                                                                                            type="text"
                                                                                            value={editedClaimant.ref_no ?? ""}
                                                                                            onChange={(e) => handleEditChange("ref_no", e.target.value === "" ? null : e.target.value)}
                                                                                            className="w-full px-1.5 py-0.5 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-emerald-400"
                                                                                        />
                                                                                    </td>
                                                                                    <td className="px-3 py-1.5">
                                                                                        <input
                                                                                            type="text"
                                                                                            value={editedClaimant.name ?? ""}
                                                                                            onChange={(e) => handleEditChange("name", e.target.value === "" ? null : e.target.value)}
                                                                                            className="w-full px-1.5 py-0.5 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-emerald-400"
                                                                                        />
                                                                                    </td>
                                                                                    <td className="px-3 py-1.5">
                                                                                        <input
                                                                                            type="text"
                                                                                            value={editedClaimant.location ?? ""}
                                                                                            onChange={(e) => handleEditChange("location", e.target.value === "" ? null : e.target.value)}
                                                                                            className="w-full px-1.5 py-0.5 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-emerald-400"
                                                                                        />
                                                                                    </td>
                                                                                    <td className="px-2 py-1.5 whitespace-nowrap">
                                                                                        <div className="flex gap-1 items-center">
                                                                                            <input
                                                                                                type="date"
                                                                                                min={claim?.starting_date?.split("T")[0]}
                                                                                                max={claim?.ending_date?.split("T")[0]}
                                                                                                value={(editedClaimant.start_date as string)?.split("T")[0] ?? ""}
                                                                                                onChange={(e) => handleEditChange("start_date", e.target.value === "" ? null : e.target.value)}
                                                                                                className="w-28 px-1.5 py-0.5 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-emerald-400"
                                                                                            />
                                                                                            <span className="text-slate-400">–</span>
                                                                                            <input
                                                                                                type="date"
                                                                                                min={claim?.starting_date?.split("T")[0]}
                                                                                                max={claim?.ending_date?.split("T")[0]}
                                                                                                value={(editedClaimant.end_date as string)?.split("T")[0] ?? ""}
                                                                                                onChange={(e) => handleEditChange("end_date", e.target.value === "" ? null : e.target.value)}
                                                                                                className="w-28 px-1.5 py-0.5 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-emerald-400"
                                                                                            />
                                                                                        </div>
                                                                                    </td>
                                                                                    <td className="px-2 py-1.5">
                                                                                        <input
                                                                                            type="number"
                                                                                            value={editedClaimant.miles ?? ""}
                                                                                            onChange={(e) => handleEditChange("miles", e.target.value === "" ? null : e.target.value)}
                                                                                            className="w-16 px-1.5 py-0.5 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-emerald-400"
                                                                                        />
                                                                                    </td>
                                                                                    <td className="px-2 py-1.5">
                                                                                        <input
                                                                                            type="number"
                                                                                            step="0.01"
                                                                                            value={editedClaimant.delivery_charges ?? ""}
                                                                                            onChange={(e) => handleEditChange("delivery_charges", e.target.value === "" ? 0 : e.target.value)}
                                                                                            className="w-20 px-1.5 py-0.5 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-emerald-400"
                                                                                        />
                                                                                    </td>
                                                                                    <td className="px-1 py-1.5 text-right">
                                                                                        <div className="flex justify-end gap-1">
                                                                                            <button
                                                                                                onClick={cancelEdit}
                                                                                                className="p-1 text-slate-500 hover:text-slate-700 rounded hover:bg-slate-100"
                                                                                            >
                                                                                                <X size={14} />
                                                                                            </button>
                                                                                            <button
                                                                                                onClick={() => saveEdit(car.id, cl.id)}
                                                                                                disabled={isSaving}
                                                                                                className="p-1 text-emerald-600 hover:text-emerald-800 rounded hover:bg-emerald-50 disabled:opacity-50"
                                                                                            >
                                                                                                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                                                                            </button>
                                                                                        </div>
                                                                                    </td>
                                                                                </>
                                                                            ) : (
                                                                                <>
                                                                                    <td className="px-3 py-1.5 font-medium text-slate-800">
                                                                                        {cl.claimant_id || <span className="text-slate-400 italic">—</span>}
                                                                                    </td>
                                                                                    <td className="px-3 py-1.5 font-medium text-slate-800">
                                                                                        {cl.ref_no ? (
                                                                                            <div className="relative group inline-block">
                                                                                                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md transition-colors ${hasMultipleClaims ? "bg-amber-100/50 text-amber-700 cursor-help" : "text-slate-800"}`}>
                                                                                                    <span>{cl.ref_no}</span>
                                                                                                    {hasMultipleClaims && <Info size={12} className="text-amber-500" />}
                                                                                                </div>
                                                                                                
                                                                                                {/* Tooltip for multiple claims */}
                                                                                                {hasMultipleClaims && (
                                                                                                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block z-50 w-max bg-white border border-slate-200 shadow-xl rounded-lg p-3 text-xs">
                                                                                                        <p className="font-semibold text-slate-800 mb-1.5 border-b border-slate-100 pb-1.5">Also in claims:</p>
                                                                                                        <ul className="space-y-1">
                                                                                                            {otherClaimsWithRef.map(id => (
                                                                                                                <li key={id} className="flex items-center gap-1.5">
                                                                                                                    <FileText size={12} className="text-slate-400" />
                                                                                                                    <Link href={`/long-claims/${id}`} target="_blank" className="text-emerald-600 hover:underline hover:text-emerald-700 font-medium">
                                                                                                                        {id}
                                                                                                                    </Link>
                                                                                                                </li>
                                                                                                            ))}
                                                                                                        </ul>
                                                                                                        <div className="absolute left-1/2 -bottom-1.5 -translate-x-1/2 w-3 h-3 bg-white border-b border-r border-slate-200 transform rotate-45"></div>
                                                                                                    </div>
                                                                                                )}
                                                                                            </div>
                                                                                        ) : (
                                                                                            <span className="text-slate-400 italic">—</span>
                                                                                        )}
                                                                                    </td>
                                                                                    <td className="px-3 py-1.5 font-medium text-slate-800">
                                                                                        {cl.name || <span className="text-slate-400 italic">Unnamed</span>}
                                                                                    </td>
                                                                                    <td className="px-3 py-1.5 text-slate-600">
                                                                                        {cl.location || "—"}
                                                                                    </td>
                                                                                    <td className="px-2 py-1.5 text-slate-600 whitespace-nowrap">
                                                                                        {formatDate(cl.start_date)} – {formatDate(cl.end_date)}
                                                                                    </td>
                                                                                    <td className="px-2 py-1.5 text-slate-600">
                                                                                        {cl.miles != null ? `${cl.miles} mi` : "—"}
                                                                                    </td>
                                                                                    <td className="px-2 py-1.5">
                                                                                        {cl.delivery_charges > 0 ? (
                                                                                            <span className="text-emerald-600 font-medium">
                                                                                                £{cl.delivery_charges.toFixed(2)}
                                                                                            </span>
                                                                                        ) : (
                                                                                            "—"
                                                                                        )}
                                                                                    </td>
                                                                                    <td className="px-1 py-1.5 text-right">
                                                                                        <div className="flex justify-end gap-1">
                                                                                            <a
                                                                                                href={`/hire-checklist?long_claim_id=${cl.long_claim_id}&car_id=${cl.car_id}&claimant_id=${cl.id}`}
                                                                                                target="_blank"
                                                                                                className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-blue-50"
                                                                                                title="Checklist"
                                                                                            >
                                                                                                <LinkIcon size={14} />
                                                                                            </a>
                                                                                            <button
                                                                                                onClick={() => startEditing(cl)}
                                                                                                className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"
                                                                                                title="Edit"
                                                                                            >
                                                                                                <Pencil size={14} />
                                                                                            </button>
                                                                                            <button
                                                                                                onClick={() => handleDeleteClaimant(cl.id, car.id)}
                                                                                                disabled={isDeleting}
                                                                                                className="p-1 text-slate-400 hover:text-red-500 rounded hover:bg-red-50 disabled:opacity-50"
                                                                                                title="Delete"
                                                                                            >
                                                                                                {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
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
                                                )}
                                                {claimantError && (
                                                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
                                                        {claimantError}
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

                {claimCars.length > 0 && (
                    <div className="bg-white border border-slate-200 rounded-xl px-5 py-4">
                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Billing Summary</h3>
                        <div className="space-y-1.5 text-sm">
                            <div className="flex justify-between text-slate-600">
                                <span>Hire charges</span>
                                <span>£{totalHire.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-slate-600">
                                <span>Delivery charges</span>
                                <span>£{totalDeliveryCharges.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-slate-600 border-t border-slate-100 pt-1.5">
                                <span>Subtotal</span>
                                <span>£{bill.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-slate-600">
                                <span>VAT (20%)</span>
                                <span>£{vat.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between font-bold text-slate-900 text-base border-t border-slate-200 pt-2 mt-1">
                                <span>Total</span>
                                <span className="text-emerald-700">£{total.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {showNewClaimantModal && (
                <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
                    <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden fade-in">
                        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h3 className="font-semibold text-slate-800">Add Claimant</h3>
                                <p className="text-xs text-slate-400 mt-0.5">{claimCars.find(c => c.id === newClaimantCarId)?.name || ""}</p>
                            </div>
                            <button onClick={() => setShowNewClaimantModal(false)} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors text-xl leading-none">×</button>
                        </div>

                        <form onSubmit={handleNewClaimantSubmit} className="p-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                                {[
                                    { label: "Claimant ID", key: "claimant_id", type: "text", placeholder: "Claimant ID" },
                                    { label: "Ref No", key: "ref_no", type: "text", placeholder: "Reference number" },
                                    { label: "Name", key: "name", type: "text", placeholder: "Claimant name" },
                                    { label: "Location", key: "location", type: "text", placeholder: "Collection location" },
                                    { label: "Start Date", key: "start_date", type: "date", placeholder: "", min: claim?.starting_date?.split("T")[0], max: claim?.ending_date?.split("T")[0] },
                                    { label: "End Date", key: "end_date", type: "date", placeholder: "", min: claim?.starting_date?.split("T")[0], max: claim?.ending_date?.split("T")[0] },
                                    { label: "Miles", key: "miles", type: "number", placeholder: "Leave empty for null" },
                                    { label: "Delivery (£)", key: "delivery_charges", type: "number", placeholder: "0.00", step: "0.01" },
                                ].map(({ label, key, type, placeholder, step, min, max }) => (
                                    <div key={key}>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
                                        <input
                                            type={type}
                                            placeholder={placeholder}
                                            step={step}
                                            min={min}
                                            max={max}
                                            value={(newClaimantForm as any)[key]}
                                            onChange={(e) =>
                                                setNewClaimantForm((p) => ({
                                                    ...p,
                                                    [key]: key === "claimant_id" ? e.target.value.toUpperCase() : e.target.value
                                                }))
                                            }
                                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-slate-50 focus:bg-white transition-colors"
                                        />
                                    </div>
                                ))}
                            </div>

                            {newClaimantError && (
                                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
                                    {newClaimantError}
                                </div>
                            )}

                            <div className="flex gap-2">
                                <button type="button" onClick={() => setShowNewClaimantModal(false)} className="flex-1 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
                                <button type="submit" disabled={savingNewClaimant} className="flex-1 flex items-center justify-center gap-2 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-60 font-medium transition-colors">
                                    {savingNewClaimant && <Loader2 size={13} className="animate-spin" />}
                                    Add Claimant
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showEmailModal && (
                <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
                    <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden fade-in">
                        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h3 className="font-semibold text-slate-800">Send Invoice by Email</h3>
                                <p className="text-xs text-slate-400 mt-0.5">A PDF will be generated and attached</p>
                            </div>
                            <button onClick={() => setShowEmailModal(false)} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors text-xl leading-none">×</button>
                        </div>

                        <form onSubmit={handleSendEmail} className="p-5 space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Recipient Email *</label>
                                <input
                                    type="email"
                                    required
                                    value={emailForm.email}
                                    onChange={(e) => setEmailForm((p) => ({ ...p, email: e.target.value }))}
                                    placeholder="customer@example.com"
                                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-slate-50 focus:bg-white transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Subject</label>
                                <input
                                    value={emailForm.subject}
                                    onChange={(e) => setEmailForm((p) => ({ ...p, subject: e.target.value }))}
                                    placeholder="Long Term Hire Invoice"
                                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-slate-50 focus:bg-white transition-colors"
                                />
                            </div>

                            <div className="flex gap-2 pt-1">
                                <button type="button" onClick={() => setShowEmailModal(false)} className="flex-1 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
                                <button type="submit" disabled={sendingEmail} className="flex-1 flex items-center justify-center gap-2 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-60 font-medium transition-colors">
                                    {sendingEmail ? <><Loader2 size={13} className="animate-spin" /> Sending…</> : <><Mail size={13} /> Send</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}