"use client";

import React from "react"

import { useState, FormEvent, useRef, useEffect } from "react";
import axios from "axios";
import Signature from "./Signature";
import DrawingCanvas from "./DrawingCanvas";

interface ClaimProps {
  claimId: string;
}

export function AccidentClaimForm({ claimId }: ClaimProps) {
  const [currentClaimId, setCurrentClaimId] = useState<string>("");

  const checklistItems = [
    "V.D",
    "DVLA",
    "BADGE",
    "RECOVERY",
    "HIRE",
    "NI NO",
    "STORAGE",
    "PLATE",
    "LICENCE",
    "LOGBOOK",
  ];

  const initialChecklistState = checklistItems.reduce(
    (acc, item) => {
      const key = `checklist_${item.toLowerCase().replace(/ /g, "_")}`;
      acc[key] = false;
      return acc;
    },
    {} as Record<string, boolean>
  );

  const initialFormData = {
    ...initialChecklistState,
    date_of_claim: "",
    accident_date: "",
    accident_time: "",
    accident_location: "",
    owner_full_name: "",
    owner_email: "",
    owner_telephone: "",
    owner_address: "",
    owner_postcode: "",
    owner_dob: "",
    owner_ni_number: "",
    owner_occupation: "",
    driver_full_name: "",
    driver_email: "",
    driver_telephone: "",
    driver_address: "",
    driver_postcode: "",
    driver_dob: "",
    driver_ni_number: "",
    driver_occupation: "",
    client_vehicle_make: "",
    client_vehicle_model: "",
    client_registration: "",
    client_policy_no: "",
    client_cover_type: "",
    client_policy_holder: "",
    third_party_name: "",
    third_party_email: "",
    third_party_telephone: "",
    third_party_address: "",
    third_party_postcode: "",
    third_party_dob: "",
    third_party_ni_number: "",
    third_party_occupation: "",
    third_party_vehicle_make: "",
    third_party_vehicle_model: "",
    third_party_registration: "",
    third_party_policy_no: "",
    third_party_policy_holder: "",
    fault_opinion: "",
    fault_reason: "",
    road_conditions: "",
    weather_conditions: "",
    witness1_name: "",
    witness1_address: "",
    witness1_postcode: "",
    witness1_telephone: "",
    witness2_name: "",
    witness2_address: "",
    witness2_postcode: "",
    witness2_telephone: "",
    loss_of_earnings: false,
    employer_details: "",
    print_name: "",
    declaration_date: "",
  };

  const [formData, setFormData] = useState(initialFormData);
  const [signatures, setSignatures] = useState<Record<string, string | null>>(
    {}
  );
  const [circumstanceDrawing, setCircumstanceDrawing] = useState<string | null>(
    null
  );
  const [beforeDrawing, setBeforeDrawing] = useState<string | null>(null);
  const [afterDrawing, setAfterDrawing] = useState<string | null>(null);

  const [isCircumstanceFromApi, setIsCircumstanceFromApi] = useState(false);
  const [isBeforeFromApi, setIsBeforeFromApi] = useState(false);
  const [isAfterFromApi, setIsAfterFromApi] = useState(false);
  const [isSignatureFromApi, setIsSignatureFromApi] = useState(false);

  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  const sigRef = useRef<{ clear: () => void } | null>(null);

  useEffect(() => {
    setCurrentClaimId(claimId);
  }, [claimId]);

  const fetchClaim = async () => {
    setIsFetching(true);
    setError(null);

    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/accident-claims/${claimId}`
      );
      const data = response.data;

      const updatedFormData = { ...initialFormData };

      Object.keys(data).forEach((key) => {
        const value = data[key];
        if (value !== null && value !== "" && key in updatedFormData) {
          // @ts-expect-error - keys match
          updatedFormData[key] = value;
        }
      });

      setFormData(updatedFormData);

      if (data.circumstance_drawing) {
        setCircumstanceDrawing(data.circumstance_drawing);
        setIsCircumstanceFromApi(true);
      } else {
        setCircumstanceDrawing(null);
        setIsCircumstanceFromApi(false);
      }

      if (data.direction_before_drawing) {
        setBeforeDrawing(data.direction_before_drawing);
        setIsBeforeFromApi(true);
      } else {
        setBeforeDrawing(null);
        setIsBeforeFromApi(false);
      }

      if (data.direction_after_drawing) {
        setAfterDrawing(data.direction_after_drawing);
        setIsAfterFromApi(true);
      } else {
        setAfterDrawing(null);
        setIsAfterFromApi(false);
      }

      if (data.client_signature) {
        setSignatures((prev) => ({ ...prev, client: data.client_signature }));
        setIsSignatureFromApi(true);
      } else {
        setSignatures((prev) => ({ ...prev, client: null }));
        setIsSignatureFromApi(false);
      }
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        console.log("Claim not found (404) – showing empty form");
      } else {
        console.error("Fetch error:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load claim data"
        );
      }
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    if (claimId) fetchClaim();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    let newValue: string | boolean = value;

    if (type === "checkbox") {
      newValue = (e.target as HTMLInputElement).checked;
    }

    setFormData((prev) => ({ ...prev, [name]: newValue }));
  };

  const handleSignature = (dataUrl: string | null) => {
    setSignatures((prev) => ({ ...prev, client: dataUrl }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const fullData = {
      ...formData,
      client_signature: signatures.client || null,
      circumstance_drawing: circumstanceDrawing || null,
      direction_before_drawing: beforeDrawing || null,
      direction_after_drawing: afterDrawing || null,
      claim_id: currentClaimId,
    };

    try {
      const response = await axios.post("/api/submit-claim", fullData, {
        headers: { "Content-Type": "application/json" },
      });

      if (!response.data.success) {
        throw new Error(response.data.message || "Submission failed");
      }

      setSubmitted(true);
      await fetchClaim();
    } catch (err) {
      console.error("Submission error:", err);
      setError(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
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
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white/95 backdrop-blur-md shadow-2xl rounded-3xl p-6 sm:p-10 border border-green-100/50">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-green-900 mb-2 text-center">
            Go Green Car Hire Ltd
          </h1>

          {/* Checklist */}
          <div className="mb-10">
            <h2 className="text-xl sm:text-2xl font-bold text-green-800 mb-6 text-center">
              Checklist – Tick all that apply
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 max-w-4xl mx-auto">
              {checklistItems.map((item) => {
                const fieldName = `checklist_${item.toLowerCase().replace(/ /g, "_")}`;
                return (
                  <label
                    key={item}
                    className="flex items-center gap-2 text-gray-800 font-medium"
                  >
                    <input
                      type="checkbox"
                      name={fieldName}
                      checked={!!formData[fieldName as keyof typeof formData]}
                      onChange={handleChange}
                      className="h-5 w-5 text-green-600 rounded border-gray-300"
                    />
                    <span>{item}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-10">
            {/* DATE OF CLAIM */}
            <div className="text-center">
              <label className="block text-lg font-semibold text-gray-800 mb-2">
                DATE OF CLAIM
              </label>
              <input
                type="date"
                name="date_of_claim"
                value={formData.date_of_claim || ""}
                onChange={handleChange}
                className="inline-block px-6 py-3 border-2 border-green-400 rounded-xl text-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
              />
            </div>

            {/* VEHICLE OWNER DETAILS */}
            <section className="bg-gradient-to-b from-white to-green-50/20 p-6 rounded-2xl border border-green-200 shadow-md">
              <h3 className="text-xl font-bold text-green-800 mb-4 border-b border-green-300 pb-2">
                VEHICLE OWNER DETAILS
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="owner_full_name"
                    value={formData.owner_full_name || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    name="owner_dob"
                    value={formData.owner_dob || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    name="owner_email"
                    value={formData.owner_email || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Telephone
                  </label>
                  <input
                    type="tel"
                    name="owner_telephone"
                    value={formData.owner_telephone || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Address
                  </label>
                  <textarea
                    name="owner_address"
                    value={formData.owner_address || ""}
                    onChange={handleChange}
                    rows={2}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Postcode
                  </label>
                  <input
                    type="text"
                    name="owner_postcode"
                    value={formData.owner_postcode || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    NI number
                  </label>
                  <input
                    type="text"
                    name="owner_ni_number"
                    value={formData.owner_ni_number || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Occupation
                  </label>
                  <input
                    type="text"
                    name="owner_occupation"
                    value={formData.owner_occupation || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                  />
                </div>
              </div>
            </section>

            {/* DRIVER DETAILS */}
            <section className="bg-gradient-to-b from-white to-green-50/20 p-6 rounded-2xl border border-green-200 shadow-md">
              <h3 className="text-xl font-bold text-green-800 mb-4 border-b border-green-300 pb-2">
                DRIVER DETAILS
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="driver_full_name"
                    value={formData.driver_full_name || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    name="driver_dob"
                    value={formData.driver_dob || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    name="driver_email"
                    value={formData.driver_email || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Telephone
                  </label>
                  <input
                    type="tel"
                    name="driver_telephone"
                    value={formData.driver_telephone || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Address
                  </label>
                  <textarea
                    name="driver_address"
                    value={formData.driver_address || ""}
                    onChange={handleChange}
                    rows={2}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Postcode
                  </label>
                  <input
                    type="text"
                    name="driver_postcode"
                    value={formData.driver_postcode || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    NI number
                  </label>
                  <input
                    type="text"
                    name="driver_ni_number"
                    value={formData.driver_ni_number || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Occupation
                  </label>
                  <input
                    type="text"
                    name="driver_occupation"
                    value={formData.driver_occupation || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                  />
                </div>
              </div>
            </section>

            {/* CLIENT VEHICLE & INSURANCE */}
            <section className="bg-gradient-to-b from-white to-green-50/20 p-6 rounded-2xl border border-green-200 shadow-md">
              <h3 className="text-xl font-bold text-green-800 mb-4 border-b border-green-300 pb-2">
                CLIENT VEHICLE DETAILS
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Make
                  </label>
                  <input
                    type="text"
                    name="client_vehicle_make"
                    value={formData.client_vehicle_make || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Model
                  </label>
                  <input
                    type="text"
                    name="client_vehicle_model"
                    value={formData.client_vehicle_model || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Registration
                  </label>
                  <input
                    type="text"
                    name="client_registration"
                    value={formData.client_registration || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                  />
                </div>
              </div>

              <h4 className="text-lg font-semibold text-green-800 mb-3">
                CLIENT INSURANCE DETAILS
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Insurance Policy No
                  </label>
                  <input
                    type="text"
                    name="client_policy_no"
                    value={formData.client_policy_no || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Policy Holder
                  </label>
                  <input
                    type="text"
                    name="client_policy_holder"
                    value={formData.client_policy_holder || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                  />
                </div>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-6 flex-wrap">
                {["Third party fire & theft", "Comprehensive", "Third party"].map(
                  (type) => (
                    <label key={type} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="client_cover_type"
                        value={type}
                        checked={formData.client_cover_type === type}
                        onChange={handleChange}
                        className="h-5 w-5 text-green-600"
                      />
                      <span>{type}</span>
                    </label>
                  )
                )}
              </div>
            </section>

            {/* THIRD PARTY DETAILS + VEHICLE */}
            <section className="bg-gradient-to-b from-white to-green-50/20 p-6 rounded-2xl border border-green-200 shadow-md">
              <h3 className="text-xl font-bold text-green-800 mb-4 border-b border-green-300 pb-2">
                THIRD PARTY DETAILS
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="third_party_name"
                    value={formData.third_party_name || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    name="third_party_dob"
                    value={formData.third_party_dob || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    name="third_party_email"
                    value={formData.third_party_email || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Telephone
                  </label>
                  <input
                    type="tel"
                    name="third_party_telephone"
                    value={formData.third_party_telephone || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Address
                  </label>
                  <textarea
                    name="third_party_address"
                    value={formData.third_party_address || ""}
                    onChange={handleChange}
                    rows={2}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Postcode
                  </label>
                  <input
                    type="text"
                    name="third_party_postcode"
                    value={formData.third_party_postcode || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    NI number
                  </label>
                  <input
                    type="text"
                    name="third_party_ni_number"
                    value={formData.third_party_ni_number || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Occupation
                  </label>
                  <input
                    type="text"
                    name="third_party_occupation"
                    value={formData.third_party_occupation || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                  />
                </div>
              </div>

              <h4 className="text-lg font-semibold text-green-800 mb-4 border-t border-green-200 pt-4">
                THIRD PARTY VEHICLE & INSURANCE
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Make
                  </label>
                  <input
                    type="text"
                    name="third_party_vehicle_make"
                    value={formData.third_party_vehicle_make || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Model
                  </label>
                  <input
                    type="text"
                    name="third_party_vehicle_model"
                    value={formData.third_party_vehicle_model || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Registration
                  </label>
                  <input
                    type="text"
                    name="third_party_registration"
                    value={formData.third_party_registration || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Insurance Policy No
                  </label>
                  <input
                    type="text"
                    name="third_party_policy_no"
                    value={formData.third_party_policy_no || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Policy Holder
                  </label>
                  <input
                    type="text"
                    name="third_party_policy_holder"
                    value={formData.third_party_policy_holder || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                  />
                </div>
              </div>
            </section>

            {/* DIRECTION OF TRAVEL */}
            <section className="bg-gradient-to-b from-white to-green-50/20 p-6 rounded-2xl border border-green-200 shadow-md">
              <label className="block text-xl font-bold text-gray-900 mb-6 text-center">
                (Please indicate direction of travel – Before vs After)
              </label>

              <div className="flex flex-col lg:flex-row justify-center gap-10 lg:gap-16">
                {/* BEFORE */}
                <div className="text-center">
                  <div className="text-lg font-semibold mb-3 text-gray-800">
                    Before
                  </div>
                  <DrawingCanvas
                    width={400}
                    height={400}
                    onDrawingChange={setBeforeDrawing}
                    initialImage={beforeDrawing}
                    isFromApi={isBeforeFromApi}
                  />
                </div>

                {/* AFTER */}
                <div className="text-center">
                  <div className="text-lg font-semibold mb-3 text-gray-800">
                    After
                  </div>
                  <DrawingCanvas
                    width={400}
                    height={400}
                    onDrawingChange={setAfterDrawing}
                    initialImage={afterDrawing}
                    isFromApi={isAfterFromApi}
                  />
                </div>
              </div>
            </section>

            {/* FAULT & CONDITIONS */}
            <section className="bg-gradient-to-b from-white to-green-50/20 p-6 rounded-2xl border border-green-200 shadow-md">
              <div className="space-y-6">
                <div>
                  <label className="block text-lg font-semibold text-gray-800 mb-2">
                    Who do you think was at fault for the accident?
                  </label>
                  <textarea
                    name="fault_opinion"
                    value={formData.fault_opinion || ""}
                    onChange={handleChange}
                    rows={2}
                    className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-lg font-semibold text-gray-800 mb-2">
                    Why do you think this is so?
                  </label>
                  <textarea
                    name="fault_reason"
                    value={formData.fault_reason || ""}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-lg font-semibold text-gray-800 mb-2">
                      Road conditions
                    </label>
                    <input
                      type="text"
                      name="road_conditions"
                      value={formData.road_conditions || ""}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-lg font-semibold text-gray-800 mb-2">
                      Weather conditions
                    </label>
                    <input
                      type="text"
                      name="weather_conditions"
                      value={formData.weather_conditions || ""}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* ACCIDENT DETAILS */}
            <section className="bg-gradient-to-b from-white to-green-50/20 p-6 rounded-2xl border border-green-200 shadow-md">
              <h3 className="text-xl font-bold text-green-800 mb-4 border-b border-green-300 pb-2">
                ACCIDENT DETAILS
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Date of Accident
                  </label>
                  <input
                    type="date"
                    name="accident_date"
                    value={formData.accident_date || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Time of Accident
                  </label>
                  <input
                    type="time"
                    name="accident_time"
                    value={formData.accident_time || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Location of Accident
                  </label>
                  <textarea
                    name="accident_location"
                    value={formData.accident_location || ""}
                    onChange={handleChange}
                    rows={2}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                  />
                </div>
              </div>
            </section>

            {/* CIRCUMSTANCES OF ACCIDENT */}
            <section className="bg-gradient-to-b from-white to-green-50/20 p-6 rounded-2xl border border-green-200 shadow-md">
              <h3 className="text-xl font-bold text-green-800 mb-4 border-b border-green-300 pb-2">
                CIRCUMSTANCES OF ACCIDENT
              </h3>

              <div className="max-w-4xl mx-auto">
                <DrawingCanvas
                  width={900}
                  height={500}
                  onDrawingChange={setCircumstanceDrawing}
                  initialImage={circumstanceDrawing}
                  isFromApi={isCircumstanceFromApi}
                />
              </div>
            </section>

            {/* WITNESSES */}
            <section className="bg-gradient-to-b from-white to-green-50/20 p-6 rounded-2xl border border-green-200 shadow-md">
              <h3 className="text-xl font-bold text-green-800 mb-4 border-b border-green-300 pb-2">
                WITNESSES
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {[1, 2].map((num) => (
                  <div key={num}>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Full Name
                    </label>
                    <input
                      type="text"
                      name={`witness${num}_name`}
                      value={
                        formData[
                          `witness${num}_name` as keyof typeof formData
                        ] || ""
                      }
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                    />
                    <label className="block text-sm font-medium text-gray-700 mt-4 mb-1.5">
                      Address
                    </label>
                    <textarea
                      name={`witness${num}_address`}
                      value={
                        formData[
                          `witness${num}_address` as keyof typeof formData
                        ] || ""
                      }
                      onChange={handleChange}
                      rows={2}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                    />
                    <label className="block text-sm font-medium text-gray-700 mt-4 mb-1.5">
                      Postcode
                    </label>
                    <input
                      type="text"
                      name={`witness${num}_postcode`}
                      value={
                        formData[
                          `witness${num}_postcode` as keyof typeof formData
                        ] || ""
                      }
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                    />
                    <label className="block text-sm font-medium text-gray-700 mt-4 mb-1.5">
                      Telephone
                    </label>
                    <input
                      type="tel"
                      name={`witness${num}_telephone`}
                      value={
                        formData[
                          `witness${num}_telephone` as keyof typeof formData
                        ] || ""
                      }
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                    />
                  </div>
                ))}
              </div>
            </section>

            {/* EXTRA INFORMATION */}
            <section className="bg-gradient-to-b from-white to-green-50/20 p-6 rounded-2xl border border-green-200 shadow-md">
              <h3 className="text-xl font-bold text-green-800 mb-4 border-b border-green-300 pb-2">
                EXTRA INFORMATION
              </h3>
              <div>
                <label className="flex items-center gap-3 text-lg font-medium text-gray-800">
                  <input
                    type="checkbox"
                    name="loss_of_earnings"
                    checked={!!formData.loss_of_earnings}
                    onChange={handleChange}
                    className="h-5 w-5 text-green-600 rounded"
                  />
                  Will you have any loss of earnings?
                </label>
              </div>
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Name and Address of Employer / Accountant
                </label>
                <textarea
                  name="employer_details"
                  value={formData.employer_details || ""}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-5 py-4 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                />
              </div>
            </section>

            {/* DECLARATION */}
            <section className="bg-gradient-to-b from-white to-green-50/30 p-8 rounded-3xl border border-green-200 shadow-inner text-center">
              <h3 className="text-2xl font-bold text-green-900 mb-6">
                DECLARATION
              </h3>
              <p className="text-gray-700 leading-relaxed mb-10 max-w-3xl mx-auto">
                I confirm that the above information I have given is correct and
                to the best of my knowledge, and request that you act on my
                behalf in pursuing the claim for compensation arising out of the
                above incident, including issuing Court proceedings, should this
                be required.
              </p>

              <div className="max-w-lg mx-auto space-y-10">
                <div>
                  <label className="block text-xl font-bold text-green-900 mb-3">
                    Print Name
                  </label>
                  <input
                    type="text"
                    name="print_name"
                    value={formData.print_name || ""}
                    onChange={handleChange}
                    className="w-full px-5 py-4 border-2 border-green-400 rounded-xl focus:ring-green-500 transition text-lg text-center"
                  />
                </div>

                <div>
                  <label className="block text-xl font-bold text-green-900 mb-3">
                    Date
                  </label>
                  <input
                    type="date"
                    name="declaration_date"
                    value={formData.declaration_date || ""}
                    onChange={handleChange}
                    className="w-full px-5 py-4 border-2 border-green-400 rounded-xl focus:ring-green-500 transition text-lg text-center"
                  />
                </div>

                <div>
                  <label className="block text-xl font-bold text-green-900 mb-3">
                    Signature
                  </label>
                  <div className="flex flex-col items-center gap-4">
                    {isSignatureFromApi && signatures.client ? (
                      <div className="text-center">
                        <img
                          src={signatures.client || "/placeholder.svg"}
                          alt="Client signature"
                          className="max-h-48 border-2 border-gray-400 rounded-xl shadow-md object-contain"
                        />
                        <p className="text-sm text-gray-500 mt-2 italic">
                          (Saved signature – view only)
                        </p>
                      </div>
                    ) : (
                      <div className="w-full max-w-md">
                        <Signature ref={sigRef} onSign={handleSignature} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* SUBMIT BUTTON */}
            <div className="text-center mt-12">
              <button
                type="submit"
                disabled={loading}
                className={`inline-flex items-center px-16 py-6 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-extrabold text-2xl rounded-full shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 ${
                  loading ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {loading ? "Submitting..." : "Submit Claim Form"}
              </button>

              {submitted && (
                <p className="mt-8 text-green-700 font-semibold text-xl animate-pulse">
                  Form submitted successfully – data refreshed
                </p>
              )}
              {error && (
                <p className="mt-8 text-red-700 font-semibold text-xl">
                  {error}
                </p>
              )}
            </div>

           
          </form>
        </div>
      </div>
    </div>
  );
}
