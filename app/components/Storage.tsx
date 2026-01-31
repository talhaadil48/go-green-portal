"use client";

import { useState, FormEvent, useRef, useEffect } from "react";
import axios from "axios";
import Signature from "../components/Signature"; // adjust path if needed

interface ClaimProps {
  claimId: string;
}

export function StorageRecoveryAgreement({ claimId }: ClaimProps) {
  const [currentClaimId, setCurrentClaimId] = useState<string>("");

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
  };

  const [formData, setFormData] = useState<Record<string, string>>(initialFormData);
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

  useEffect(() => {
    setCurrentClaimId(claimId);
  }, [claimId]);

  const fetchStorageData = async () => {
    setIsFetching(true);
    setError(null);

    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/storage-forms/${claimId}`
      );

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

    const fullData = {
      ...formData,
      client_signature: signatures.client_signature || null,
      owner_signature: signatures.owner_signature || null,
      claim_id: currentClaimId,
    };

    try {
      const response = await axios.post("/api/submit-storage-recovery", fullData, {
        headers: { "Content-Type": "application/json" },
      });

      if (!response.data.success) {
        throw new Error(response.data.message || "Submission failed");
      }

      setSubmitted(true);
      await fetchStorageData(); // refresh → locks signatures
    } catch (err: any) {
      console.error("Submission error:", err);
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
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
          <h2 className="text-3xl font-bold text-green-800 mb-10 text-center tracking-tight">
            Storage and Recovery Invoice and Agreement
          </h2>

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
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Charges Per Day:
                  </label>
                  <input
                    type="text"
                    name="charges_per_day"
                    placeholder="£____.__"
                    value={formData.charges_per_day}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Storage Charge:
                  </label>
                  <input
                    type="text"
                    name="total_storage_charge"
                    placeholder="£____.__"
                    value={formData.total_storage_charge}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
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
                    placeholder="£____.__"
                    value={formData.recovery_charge}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subtotal:
                  </label>
                  <input
                    type="text"
                    name="subtotal"
                    placeholder="£____.__"
                    value={formData.subtotal}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
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
                    placeholder="£____.__"
                    value={formData.vat_amount}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 font-semibold">
                    Invoice Total:
                  </label>
                  <input
                    type="text"
                    name="invoice_total"
                    placeholder="£____.__"
                    value={formData.invoice_total}
                    onChange={handleChange}
                    className="w-full px-6 py-4 text-xl font-bold border-2 border-green-400 rounded-xl bg-green-50 focus:ring-4 focus:ring-green-300 transition"
                  />
                </div>
              </div>
            </section>

            {/* Terms & Conditions */}
            <section className="space-y-6 bg-green-50 p-6 rounded-2xl border border-green-200">
              <p className="text-gray-800 text-sm leading-relaxed">
                I understand the recovery and storage costs are on a deferred payment basis and will be due and owing from me on completion of storage...
              </p>
              {/* ... rest of terms (same as before) ... */}
            </section>

            {/* Signatures */}
            <section className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* Client Signature */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Client’s Signature:
                  </label>

                  {isClientSigFromApi && signatures.client_signature ? (
                    <div className="border border-green-300 rounded-xl p-6 bg-green-50 max-w-md mx-auto text-center">
                      <img
                        src={signatures.client_signature}
                        alt="Client signature"
                        className="max-h-40 mx-auto object-contain"
                      />
                      <p className="mt-4 text-sm text-green-700 font-medium">
                        Signature saved ✓ (from record)
                      </p>
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
                    Owner’s Signature:
                  </label>

                  {isOwnerSigFromApi && signatures.owner_signature ? (
                    <div className="border border-green-300 rounded-xl p-6 bg-green-50 max-w-md mx-auto text-center">
                      <img
                        src={signatures.owner_signature}
                        alt="Owner signature"
                        className="max-h-40 mx-auto object-contain"
                      />
                      <p className="mt-4 text-sm text-green-700 font-medium">
                        Signature saved ✓ (from record)
                      </p>
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

            {/* Storage Location */}
          
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