"use client";

import React, { useContext } from "react"

import { useState, FormEvent, useRef, useEffect } from "react";
import axios from "axios";
import Signature from "./Signature";
import PDFShareButton from "./PDFShareButton";
import { UnsavedChangesContext } from "../claim/[id]/page";
import Cookies from "js-cookie";  
import api from "@/lib/axios";
interface ClaimProps {
  claimId: string;
}

export function StorageRecoveryAgreement({ claimId }: ClaimProps) {
  const [currentClaimId, setCurrentClaimId] = useState<string>("");
  const [username, setUsername] = useState<string | null>(null);
  const unsavedChangesContext = useContext(UnsavedChangesContext);

  // Storage location mapping
  const storageLocations: Record<string, { name: string; city: string; postcode: string }> = {
    addr1: {
      name: "LITTLE BURTON EAST",
      city: "Burton-on-Trent, Staffordshire",
      postcode: "DE14 1PS",
    },
    addr2: {
      name: "Placeholder Location",
      city: "City, County",
      postcode: "XX00 0XX",
    },
  };

  const initialFormData = {
    name: "",
    postcode: "",
    address1: "",
    address2: "",
    vehicle_make: "",
    vehicle_model: "",
    registration_number: "",
    date_of_recovery: "",
    storage_start_date: "",
    storage_end_date: "",
    number_of_days: "",
    charges_per_day: "",
    total_storage_charge: "",
    recovery_charge: "",
    subtotal: "",
    vat_amount: "",
    invoice_total: "",
    client_date: "",
    owner_date: "",
    storage_location_key: "addr1",
  };

  const [formData, setFormData] = useState<Record<string, string | number>>(initialFormData);
  const [signatures, setSignatures] = useState<Record<string, string | null>>({});

  // Flags: true only when signature came from API
  const [isClientSigFromApi, setIsClientSigFromApi] = useState(false);
  const [isOwnerSigFromApi, setIsOwnerSigFromApi] = useState(false);

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(true);

  const clientSigRef = useRef<any>(null);   // for ref.clear() if supported
  const ownerSigRef = useRef<any>(null);
  const calculateDays = (start: string, end: string): string => {
    if (!start || !end) return "";
    try {
      const startDate = new Date(start);
      const endDate = new Date(end);
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return "";

      // Time difference in milliseconds → days
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      // Inclusive → add 1
      return String(diffDays + 1);
    } catch {
      return "";
    }
  };
  
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
  
  useEffect(() => {
    // ──────────────── Number of Days ────────────────
    const days = calculateDays(
      formData.storage_start_date,
      formData.storage_end_date
    );

    setFormData(prev => {
      // Only update if it actually changed → prevents infinite loop
      if (prev.number_of_days === days) return prev;
      return { ...prev, number_of_days: days };
    });

  }, [formData.storage_start_date, formData.storage_end_date]);
  useEffect(() => {
    const daysStr = formData.number_of_days;
    const perDayStr = formData.charges_per_day;
    const recoveryStr = formData.recovery_charge;

    const days = Number(daysStr) || 0;
    const perDay = Number(perDayStr) || 0;
    const recovery = Number(recoveryStr) || 0;

    const totalStorage = days * perDay;
    const subtotal = totalStorage + recovery;
    const vat = subtotal * 0.2;
    const invoiceTotal = subtotal + vat;

    setFormData(prev => {
      const next = { ...prev };

      // Only update if value actually changes
      if (Number(next.total_storage_charge) !== totalStorage) {
        next.total_storage_charge = totalStorage ? totalStorage.toFixed(2) : "";
      }
      if (Number(next.subtotal) !== subtotal) {
        next.subtotal = subtotal ? subtotal.toFixed(2) : "";
      }
      if (Number(next.vat_amount) !== vat) {
        next.vat_amount = vat ? vat.toFixed(2) : "";
      }
      if (Number(next.invoice_total) !== invoiceTotal) {
        next.invoice_total = invoiceTotal ? invoiceTotal.toFixed(2) : "";
      }

      return next;
    });
  }, [
    formData.number_of_days,
    formData.charges_per_day,
    formData.recovery_charge,
  ]);

  useEffect(() => {
    setCurrentClaimId(claimId);
  }, [claimId]);

  const fetchStorageData = async () => {
    setIsFetching(true);
    setError(null);

    try {
 const response = await api.get(`/api/storage-forms/${claimId}`, {
  headers: { requiresAuth: true },
});;

      const data = response.data;

      const updatedFormData = { ...initialFormData };

      Object.keys(data).forEach((key) => {
        const value = data[key];
        if (value !== null && value !== "" && key in updatedFormData) {
          updatedFormData[key] = value;
        }
      });

      setFormData(updatedFormData);

      // Client signature
      if (data.client_signature) {
        setSignatures((prev) => ({ ...prev, client_signature: data.client_signature }));
        setIsClientSigFromApi(true);
      } else {
        setSignatures((prev) => ({ ...prev, client_signature: null }));
        setIsClientSigFromApi(false);
      }

      // Owner signature
      if (data.owner_signature) {
        setSignatures((prev) => ({ ...prev, owner_signature: data.owner_signature }));
        setIsOwnerSigFromApi(true);
      } else {
        setSignatures((prev) => ({ ...prev, owner_signature: null }));
        setIsOwnerSigFromApi(false);
      }
    } catch (err: any) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        console.log("Storage form not found (404) → showing blank form");
      } else {
        console.error("Fetch error:", err);
        setError(err.message || "Failed to load storage & recovery data");
      }
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    if (claimId) {
      fetchStorageData();
    }
  }, [claimId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Mark as changed when user modifies form
    if (unsavedChangesContext) {
      unsavedChangesContext.setHasUnsavedChanges(true);
    }
  };

  const handleSignature = (field: "client_signature" | "owner_signature") => (
    dataUrl: string | null
  ) => {
    setSignatures((prev) => ({ ...prev, [field]: dataUrl }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate numerical fields before sending
    if (!validateNumericFields()) {
      setLoading(false);
      return;
    }

    const fullData = {
      ...formData,
      client_signature: signatures.client_signature || null,
      owner_signature: signatures.owner_signature || null,
      claim_id: currentClaimId,
      user_name: username,
    };

    try {
      const response = await axios.post("/api/submit-storage-recovery", fullData, {
        headers: { "Content-Type": "application/json" },
      });

      if (!response.data.success) {
        throw new Error(response.data.message || "Submission failed");
      }

      setSubmitted(true);
      if (unsavedChangesContext) {
        unsavedChangesContext.setHasUnsavedChanges(false);
      }
      await fetchStorageData(); // refresh → locks signatures
    } catch (err: any) {
      console.error("Submission error:", err);
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatGBP = (value: string) => {
    if (value === "" || value === null) return "";
    return `£${value}`;
  };

  const parseGBP = (value: string) => {
    return value.replace(/[^0-9.]/g, "");
  };
  const handleMoneyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numericValue = parseGBP(value);

    setFormData((prev) => ({
      ...prev,
      [name]: numericValue,
    }));
    
    // Mark as changed when user modifies form
    if (unsavedChangesContext) {
      unsavedChangesContext.setHasUnsavedChanges(true);
    }
  };

  // Validate that numerical fields contain only numeric values
  const validateNumericFields = (): boolean => {
    const numericFields = [
      "number_of_days",
      "charges_per_day",
      "total_storage_charge",
      "recovery_charge",
      "subtotal",
      "vat_amount",
      "invoice_total"
    ];

    for (const field of numericFields) {
      const value = String(formData[field] || "").trim();
      
      // Skip empty fields (optional)
      if (value === "") continue;
      
      // Check if value contains only numeric characters and dots
      if (!/^[0-9.]*$/.test(value)) {
        setError(`${field.replace(/_/g, " ")} contains invalid characters. Only numeric values are allowed.`);
        return false;
      }

      // Check for valid decimal format (max 2 decimal places for money)
      if (field !== "number_of_days") {
        if (!/^[0-9]*(\.[0-9]{1,2})?$/.test(value) && value !== "") {
          setError(`${field.replace(/_/g, " ")} must have valid format (up to 2 decimal places).`);
          return false;
        }
      }
    }

    return true;
  };

  if (isFetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-green-50">
        <div className="w-16 h-16 border-4 border-green-300 border-t-green-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 py-12">
      <div className="max-w-6xl mx-auto px-6">
        <div className="bg-white/95 backdrop-blur-md shadow-2xl rounded-3xl p-10 border border-green-100">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-10">
            <h2 className="text-2xl font-bold text-green-800 text-center sm:text-left tracking-tight">
              Storage and Recovery Invoice and Agreement
            </h2>
            <PDFShareButton
              formData={{
                title: "Storage & Recovery Agreement",
                formType: "storage-recovery",
                claimId: currentClaimId,
                data: formData,
                signatures: signatures,
              }}
            />
          </div>

          <form onSubmit={handleSubmit} className="space-y-10">
            {/* Client Details */}
            <section className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name:
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Postcode:
                  </label>
                  <input
                    type="text"
                    name="postcode"
                    value={formData.postcode}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address 1:
                  </label>
                  <input
                    type="text"
                    name="address1"
                    value={formData.address1}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address 2:
                  </label>
                  <input
                    type="text"
                    name="address2"
                    value={formData.address2}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                  />
                </div>
              </div>
            </section>

            {/* Vehicle Details */}
            <section className="space-y-6">
              <h3 className="text-xl font-semibold text-green-700 pb-2 border-b border-green-200">
                Vehicle Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vehicle Make:
                  </label>
                  <input
                    type="text"
                    name="vehicle_make"
                    value={formData.vehicle_make}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vehicle Model:
                  </label>
                  <input
                    type="text"
                    name="vehicle_model"
                    value={formData.vehicle_model}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Registration Number:
                  </label>
                  <input
                    type="text"
                    name="registration_number"
                    value={formData.registration_number}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                  />
                </div>
              </div>
            </section>

            {/* Dates & Charges */}
            <section className="space-y-6">
              <h3 className="text-xl font-semibold text-green-700 pb-2 border-b border-green-200">
                Recovery & Storage Details
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date of Recovery:
                  </label>
                  <input
                    type="date"
                    name="date_of_recovery"
                    value={formData.date_of_recovery}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Storage Start Date:
                  </label>
                  <input
                    type="date"
                    name="storage_start_date"
                    value={formData.storage_start_date}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Storage End Date:
                  </label>
                  <input
                    type="date"
                    name="storage_end_date"
                    value={formData.storage_end_date}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Number of Days:
                  </label>
                  <input
                    type="number"
                    name="number_of_days"
                    value={formData.number_of_days}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Charges Per Day:
                  </label>
                  <input
                    type="text"
                    name="charges_per_day"
                    value={formatGBP(formData.charges_per_day)}
                    onChange={handleMoneyChange}
                    placeholder="£____.__"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Storage Charge:
                  </label>
                  <input
                    type="text"
                    name="total_storage_charge"
                    value={formatGBP(formData.total_storage_charge)}
                    onChange={handleMoneyChange}
                    placeholder="£____.__"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    1 x Recovery at:
                  </label>
                  <input
                    type="text"
                    name="recovery_charge"
                    value={formatGBP(formData.recovery_charge)}
                    onChange={handleMoneyChange}
                    placeholder="£____.__"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subtotal:
                  </label>
                  <input
                    type="text"
                    name="subtotal"
                    value={formatGBP(formData.subtotal)}
                    onChange={handleMoneyChange}
                    placeholder="£____.__"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    VAT at 20%:
                  </label>
                  <input
                    type="text"
                    name="vat_amount"
                    value={formatGBP(formData.vat_amount)}
                    onChange={handleMoneyChange}
                    placeholder="£____.__"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Invoice Total:
                  </label>
                  <input
                    type="text"
                    name="invoice_total"
                    value={formatGBP(formData.invoice_total)}
                    onChange={handleMoneyChange}
                    placeholder="£____.__"
                    className="w-full px-6 py-4 text-xl font-bold border-2 border-green-400 rounded-xl bg-green-50 focus:ring-4 focus:ring-green-300"
                  />
                </div>
              </div>
            </section>

            {/* Terms & Conditions */}
            <section className="space-y-4 bg-green-50 p-6 rounded-2xl border border-green-200">
              <h3 className="text-lg font-semibold text-green-800">
                Deferred Payment & Cancellation Terms
              </h3>

              <p className="text-gray-800 text-sm leading-relaxed">
                I understand the recovery and storage costs are on a deferred payment
                basis and will be due and owing from me on completion of storage and that
                invoices are payable by me to Go Green Car Hire Ltd in no more than one
                instalment beginning from the date of this agreement within a period of
                no more than 51 weeks beginning from the date of this agreement.
              </p>

              <p className="text-gray-800 text-sm leading-relaxed">
                It is my contractual obligation to pay the outstanding charges as provided
                by the deferred payment provision.
              </p>

              <p className="text-gray-800 text-sm leading-relaxed">
                I further understand that if I fail to co-operate in the pursuit of my
                claim for damages or appoint other solicitors to act on my behalf, then I
                understand and agree that the account for recovery and storage will be
                immediately due and payable by me to Go Green Car Hire Ltd.
              </p>

              <p className="text-gray-800 text-sm leading-relaxed">
                This contract constitutes all terms and conditions under this agreement.
              </p>

              <p className="text-gray-800 text-sm leading-relaxed">
                You have the right to cancel this agreement within 14 days starting from
                the date signed on this agreement. Written cancellation notice must be
                sent within 14 days either by post or email to the address stated above.
                I understand that any charges incurred will be liable to immediate
                payment by me.
              </p>
            </section>


            {/* Signatures */}
            <section className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* Client Signature */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Client's Signature:
                  </label>

                  {isClientSigFromApi && signatures.client_signature ? (
                    <div className="border border-green-300 rounded-xl p-6 bg-green-50 max-w-md mx-auto text-center space-y-3">
                      <img
                        src={signatures.client_signature || "/placeholder.svg"}
                        alt="Client signature"
                        className="max-h-40 mx-auto object-contain"
                      />
                      <p className="text-sm text-green-700 font-medium">
                        Signature saved ✓ (from record)
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsClientSigFromApi(false)}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg text-sm transition"
                      >
                        Update
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-4">
                      <Signature
                        ref={clientSigRef}
                        onSign={handleSignature("client_signature")}
                      />
                      {signatures.client_signature && (
                        <p></p>
                      )}
                    </div>
                  )}

                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date:
                    </label>
                    <input
                      type="date"
                      name="client_date"
                      value={formData.client_date}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                    />
                  </div>
                </div>

                {/* Owner Signature */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Owner's Signature:
                  </label>

                  {isOwnerSigFromApi && signatures.owner_signature ? (
                    <div className="border border-green-300 rounded-xl p-6 bg-green-50 max-w-md mx-auto text-center space-y-3">
                      <img
                        src={signatures.owner_signature || "/placeholder.svg"}
                        alt="Owner signature"
                        className="max-h-40 mx-auto object-contain"
                      />
                      <p className="text-sm text-green-700 font-medium">
                        Signature saved ✓ (from record)
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsOwnerSigFromApi(false)}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg text-sm transition"
                      >
                        Update
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-4">
                      <Signature
                        ref={ownerSigRef}
                        onSign={handleSignature("owner_signature")}
                      />
                      {signatures.owner_signature && (
                        <p></p>
                      )}
                    </div>
                  )}

                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date:
                    </label>
                    <input
                      type="date"
                      name="owner_date"
                      value={formData.owner_date}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Storage Location - Now Dynamic */}
            <section className="max-w-md mx-auto space-y-4 bg-green-50 p-6 rounded-2xl border border-green-200">
              <h3 className="text-lg font-semibold text-green-800 text-center mb-4">
                Storage Location
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Storage Location:
                  </label>
                  <select
                    name="storage_location_key"
                    value={formData.storage_location_key || "addr1"}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition bg-white"
                  >
                    <option value="addr1">LITTLE BURTON EAST</option>
                    <option value="addr2">Placeholder Location</option>
                  </select>
                </div>

                <div className="bg-white rounded-lg p-4 mt-4 border border-green-300">
                  <p className="text-sm text-gray-600 font-medium">
                    {storageLocations[formData.storage_location_key || "addr1"]?.name}
                  </p>
                  <p className="text-sm text-gray-600">
                    {storageLocations[formData.storage_location_key || "addr1"]?.city}
                  </p>
                  <p className="text-sm text-gray-600">
                    {storageLocations[formData.storage_location_key || "addr1"]?.postcode}
                  </p>
                </div>
              </div>
            </section>

            {/* Submit Button */}
            <div className="text-center pt-8">
              <button
                type="submit"
                disabled={loading}
                className={`
                  bg-gradient-to-r from-green-600 to-green-500 
                  hover:from-green-700 hover:to-green-600 
                  text-white font-bold py-4 px-12 
                  rounded-full text-lg shadow-xl 
                  transform hover:scale-105 transition-all duration-300 
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${loading ? "cursor-wait" : ""}
                `}
              >
                {loading ? "Submitting..." : "Submit Agreement"}
              </button>

              {error && (
                <p className="mt-4 text-red-600 font-medium">{error}</p>
              )}

              {submitted && !loading && (
                <p className="mt-6 text-green-700 font-medium">
                  Agreement submitted successfully 🌿
                </p>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
