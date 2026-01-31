"use client";

import { useState, FormEvent, useRef, useEffect } from "react";
import axios from "axios";
import Signature from "../components/Signature"; // adjust path if needed

interface ClaimProps {
  claimId: string;
}

export function RentalAgreement({ claimId }: ClaimProps) {
  const [currentClaimId, setCurrentClaimId] = useState<string>("");

  const initialFormData = {
    // Hirer’s Details
    hirer_name: "",
    title: "",
    permanent_address: "",
    // Additional Driver
    additional_driver_name: "",
    licence_no: "",
    date_issued: "",
    expiry_date: "",
    dob: "",
    date_test_passed: "",
    occupation: "",
    // Hire Agreement Terms
    daily_rate: "",
    policy_excess: "",
    deposit: "",
    refuelling_charge: "",
    // Hirer’s Own Insurance
    insurance_company: "",
    policy_no: "",
    insurance_dates: "",
    own_insurance_confirm: "No",
    insurance_date: "",
    insurance_time: "",
    // Insurance Proposal
    motoring_offence_3yrs: "",
    disqualified_5yrs: "",
    accident_3yrs: "",
    insurance_declined_5yrs: "",
    dishonesty_conviction: "",
    // Medical Declaration
    medical_condition1: "",
    medical_condition2: "",
    medical_details: "",
    // Additional Driver Authorization
    additional_driver_auth: "",
    // Hire Vehicle
    hire_vehicle_reg: "",
    hire_vehicle_make: "",
    hire_vehicle_model: "",
    hire_vehicle_group: "",
    hire_vehicle_date_out: "",
    hire_vehicle_date_in: "",
    hire_vehicle_fuel_out: "",
    hire_vehicle_fuel_in: "",
    // Change of Hire Vehicle
    change_vehicle_reg: "",
    change_vehicle_make: "",
    change_vehicle_model: "",
    change_vehicle_group: "",
    change_vehicle_date_out: "",
    change_vehicle_date_in: "",
    change_vehicle_fuel_out: "",
    change_vehicle_fuel_in: "",
    // Charges Summary
    admin_fee: "",
    delivery_charge: "",
    cdw_per_day: "",
    days_out: "",
    days_in: "",
    total_days: "",
    rate_per_day: "",
    refuelling_total: "",
    subtotal: "",
    vat: "",
    total_cost: "",
    // Declaration & Liability
    declaration_date: "",
    liability_date: "",
  };

  const [formData, setFormData] = useState<Record<string, string>>(initialFormData);
  const [signatures, setSignatures] = useState<Record<string, string | null>>({});

  // Flags to determine if signature came from API (locked) or is editable
  const [isHirerTermsFromApi, setIsHirerTermsFromApi] = useState(false);
  const [isCompanyFromApi, setIsCompanyFromApi] = useState(false);
  const [isHirerInsuranceFromApi, setIsHirerInsuranceFromApi] = useState(false);
  const [isDeclarationFromApi, setIsDeclarationFromApi] = useState(false);
  const [isLiabilityFromApi, setIsLiabilityFromApi] = useState(false);

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(true);

  // Refs for clearing signature pads (if component supports .clear())
  const hirerTermsRef = useRef<any>(null);
  const companyRef = useRef<any>(null);
  const hirerInsuranceRef = useRef<any>(null);
  const declarationRef = useRef<any>(null);
  const liabilityRef = useRef<any>(null);

  useEffect(() => {
    setCurrentClaimId(claimId);
  }, [claimId]);

  const fetchRentalData = async () => {
    setIsFetching(true);
    setError(null);

    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/rental-agreements/${claimId}`
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

      // Load signatures + set locked flags
      if (data.hirer_signature_terms) {
        setSignatures((prev) => ({ ...prev, hirer_signature_terms: data.hirer_signature_terms }));
        setIsHirerTermsFromApi(true);
      } else {
        setSignatures((prev) => ({ ...prev, hirer_signature_terms: null }));
        setIsHirerTermsFromApi(false);
      }

      if (data.company_signature) {
        setSignatures((prev) => ({ ...prev, company_signature: data.company_signature }));
        setIsCompanyFromApi(true);
      } else {
        setSignatures((prev) => ({ ...prev, company_signature: null }));
        setIsCompanyFromApi(false);
      }

      if (data.hirer_signature_insurance) {
        setSignatures((prev) => ({ ...prev, hirer_signature_insurance: data.hirer_signature_insurance }));
        setIsHirerInsuranceFromApi(true);
      } else {
        setSignatures((prev) => ({ ...prev, hirer_signature_insurance: null }));
        setIsHirerInsuranceFromApi(false);
      }

      if (data.declaration_signature) {
        setSignatures((prev) => ({ ...prev, declaration_signature: data.declaration_signature }));
        setIsDeclarationFromApi(true);
      } else {
        setSignatures((prev) => ({ ...prev, declaration_signature: null }));
        setIsDeclarationFromApi(false);
      }

      if (data.liability_signature) {
        setSignatures((prev) => ({ ...prev, liability_signature: data.liability_signature }));
        setIsLiabilityFromApi(true);
      } else {
        setSignatures((prev) => ({ ...prev, liability_signature: null }));
        setIsLiabilityFromApi(false);
      }
    } catch (err: any) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        console.log("Rental agreement not found (404) → showing blank form");
      } else {
        console.error("Fetch error:", err);
        setError(err.message || "Failed to load rental agreement data");
      }
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    if (claimId) {
      fetchRentalData();
    }
  }, [claimId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRadio = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckbox = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: checked ? "Yes" : "No" }));
  };

  const handleSignature = (field: string) => (dataUrl: string | null) => {
    setSignatures((prev) => ({ ...prev, [field]: dataUrl }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const fullData = {
      ...formData,
      hirer_signature_terms: signatures.hirer_signature_terms || null,
      company_signature: signatures.company_signature || null,
      hirer_signature_insurance: signatures.hirer_signature_insurance || null,
      declaration_signature: signatures.declaration_signature || null,
      liability_signature: signatures.liability_signature || null,
      claim_id: currentClaimId,
    };

    try {
      const response = await axios.post("/api/submit-rental-agreement", fullData, {
        headers: { "Content-Type": "application/json" },
      });

      if (!response.data.success) {
        throw new Error(response.data.message || "Submission failed");
      }

      setSubmitted(true);
      await fetchRentalData(); // refresh → locks signatures
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
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 flex flex-col">
      <main className="flex-1 max-w-6xl mx-auto px-6 py-12 w-full">
        <div className="bg-white/95 backdrop-blur-md shadow-2xl rounded-3xl p-10 border border-green-100">
          <h2 className="text-4xl font-bold text-green-800 mb-10 text-center tracking-tight">
            Rental Agreement
          </h2>

          <form onSubmit={handleSubmit} className="space-y-12">
            {/* Hirer’s Details */}
            <section className="space-y-6">
              <h3 className="text-2xl font-semibold text-green-700 pb-3 border-b border-green-200">
                Hirer’s Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hirer’s Name (in full):
                  </label>
                  <input
                    type="text"
                    name="hirer_name"
                    value={formData.hirer_name}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title (Mr / Mrs / Miss / Other):
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Permanent Address:
                </label>
                <textarea
                  name="permanent_address"
                  value={formData.permanent_address}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                />
              </div>
            </section>

            {/* Additional Driver’s Details */}
            <section className="space-y-6">
              <h3 className="text-2xl font-semibold text-green-700 pb-3 border-b border-green-200">
                Additional Driver’s Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name (in full):
                  </label>
                  <input
                    type="text"
                    name="additional_driver_name"
                    value={formData.additional_driver_name}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Driving Licence No:
                  </label>
                  <input
                    type="text"
                    name="licence_no"
                    value={formData.licence_no}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date Issued:
                  </label>
                  <input
                    type="date"
                    name="date_issued"
                    value={formData.date_issued}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expiry Date:
                  </label>
                  <input
                    type="date"
                    name="expiry_date"
                    value={formData.expiry_date}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date of Birth:
                  </label>
                  <input
                    type="date"
                    name="dob"
                    value={formData.dob}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date Test Passed:
                  </label>
                  <input
                    type="date"
                    name="date_test_passed"
                    value={formData.date_test_passed}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Occupation:
                  </label>
                  <input
                    type="text"
                    name="occupation"
                    value={formData.occupation}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                  />
                </div>
              </div>
            </section>

            {/* Hire Agreement Terms */}
            <section className="space-y-6">
              <h3 className="text-2xl font-semibold text-green-700 pb-3 border-b border-green-200">
                Hire Agreement Terms
              </h3>
              <p className="text-gray-700">
                The Hirer agrees to hire the vehicle referred to above from Go Green Car Hire Ltd. in accordance with the terms set out in this Agreement.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Daily Rate of Charges:
                  </label>
                  <input
                    type="text"
                    name="daily_rate"
                    placeholder="£______ per day"
                    value={formData.daily_rate}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Policy Excess:
                  </label>
                  <input
                    type="text"
                    name="policy_excess"
                    placeholder="£______ per day"
                    value={formData.policy_excess}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Signature of Hirer:
                  </label>

                  {isHirerTermsFromApi && signatures.hirer_signature_terms ? (
                    <div className="border border-green-300 rounded-xl p-6 bg-green-50 max-w-md mx-auto text-center">
                      <img
                        src={signatures.hirer_signature_terms}
                        alt="Hirer signature (terms)"
                        className="max-h-40 mx-auto object-contain"
                      />
                      <p className="mt-4 text-sm text-green-700 font-medium">
                        Signature saved ✓ (from record)
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-4">
                      <Signature
                        ref={hirerTermsRef}
                        onSign={handleSignature("hirer_signature_terms")}
                      />
                      {signatures.hirer_signature_terms && (
                        <p></p>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Signed by (for and on behalf of Go Green Car Hire Ltd.):
                  </label>

                  {isCompanyFromApi && signatures.company_signature ? (
                    <div className="border border-green-300 rounded-xl p-6 bg-green-50 max-w-md mx-auto text-center">
                      <img
                        src={signatures.company_signature}
                        alt="Company signature"
                        className="max-h-40 mx-auto object-contain"
                      />
                      <p className="mt-4 text-sm text-green-700 font-medium">
                        Signature saved ✓ (from record)
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-4">
                      <Signature
                        ref={companyRef}
                        onSign={handleSignature("company_signature")}
                      />
                      {signatures.company_signature && (
                        <p></p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Deposit Payment:
                  </label>
                  <input
                    type="text"
                    name="deposit"
                    placeholder="£______"
                    value={formData.deposit}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                  />
                  <p className="text-sm text-gray-600 mt-1 text-xs">
                    (Required against loss or misuse of any fire extinguisher, first aid kit, or other sundry items relating to the vehicle.)
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Refuelling Charge:
                  </label>
                  <input
                    type="text"
                    name="refuelling_charge"
                    placeholder="£______"
                    value={formData.refuelling_charge}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                  />
                  <p className="text-sm text-gray-600 mt-1 text-xs">
                    (Will apply if the vehicle is returned with less fuel than at the start of the hire.)
                  </p>
                </div>
              </div>
            </section>

            {/* Hirer’s Own Insurance */}
            <section className="space-y-6">
              <h3 className="text-2xl font-semibold text-green-700 pb-3 border-b border-green-200">
                Hirer’s Own Insurance (if applicable)
              </h3>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Insurance Company:
                  </label>
                  <input
                    type="text"
                    name="insurance_company"
                    value={formData.insurance_company}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Policy / Certificate No:
                  </label>
                  <input
                    type="text"
                    name="policy_no"
                    value={formData.policy_no}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start and Expiry Date:
                  </label>
                  <input
                    type="text"
                    name="insurance_dates"
                    value={formData.insurance_dates}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="own_insurance_confirm"
                    checked={formData.own_insurance_confirm === "Yes"}
                    onChange={handleCheckbox}
                    className="h-5 w-5 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <label className="ml-3 text-sm text-gray-700">
                    I confirm that the hire will be covered by my own insurance for comprehensive risks.
                  </label>
                </div>

                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hirer’s Signature:
                  </label>

                  {isHirerInsuranceFromApi && signatures.hirer_signature_insurance ? (
                    <div className="border border-green-300 rounded-xl p-6 bg-green-50 max-w-md mx-auto text-center">
                      <img
                        src={signatures.hirer_signature_insurance}
                        alt="Hirer insurance signature"
                        className="max-h-40 mx-auto object-contain"
                      />
                      <p className="mt-4 text-sm text-green-700 font-medium">
                        Signature saved ✓ (from record)
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-4">
                      <Signature
                        ref={hirerInsuranceRef}
                        onSign={handleSignature("hirer_signature_insurance")}
                      />
                      {signatures.hirer_signature_insurance && (
                       <p></p>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date:
                    </label>
                    <input
                      type="date"
                      name="insurance_date"
                      value={formData.insurance_date}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Time:
                    </label>
                    <input
                      type="text"
                      name="insurance_time"
                      value={formData.insurance_time}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Insurance Proposal */}
            <section className="space-y-6">
              <h3 className="text-2xl font-semibold text-green-700 pb-3 border-b border-green-200">
                Insurance Proposal (if not using own insurance / intended use other than social, domestic, and pleasure)
              </h3>
              <p className="text-gray-700">Please answer the following:</p>
              <div className="space-y-4">
                {[
                  {
                    question:
                      "Have you been convicted or received notice of intended prosecution for any motoring offence (including endorsable fixed penalty offences) in the last 3 years?",
                    name: "motoring_offence_3yrs",
                  },
                  {
                    question: "Have you been disqualified from driving in the last 5 years?",
                    name: "disqualified_5yrs",
                  },
                  {
                    question:
                      "Have you been involved in any motoring accident or loss in the last 3 years?",
                    name: "accident_3yrs",
                  },
                  {
                    question:
                      "Has any motoring insurance proposal been declined, non-renewed, cancelled, or had special conditions applied in the last 5 years?",
                    name: "insurance_declined_5yrs",
                  },
                  {
                    question:
                      "Have you ever been convicted or received notice of intended prosecution involving dishonesty of any kind?",
                    name: "dishonesty_conviction",
                  },
                ].map((item) => (
                  <div
                    key={item.name}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <label className="text-sm text-gray-700 flex-1">
                      {item.question}
                    </label>
                    <div className="flex gap-8">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name={item.name}
                          value="Yes"
                          checked={formData[item.name] === "Yes"}
                          onChange={handleRadio}
                          className="h-4 w-4 text-green-600 focus:ring-green-500"
                        />
                        <span className="ml-2">Yes</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name={item.name}
                          value="No"
                          checked={formData[item.name] === "No"}
                          onChange={handleRadio}
                          className="h-4 w-4 text-green-600 focus:ring-green-500"
                        />
                        <span className="ml-2">No</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Medical Declaration */}
            <section className="space-y-6">
              <h3 className="text-2xl font-semibold text-green-700 pb-3 border-b border-green-200">
                Medical Declaration
              </h3>
              <p className="text-gray-700">Do you suffer from:</p>
              <div className="space-y-4">
                {[
                  {
                    q: "Diabetes, fits, heart condition, or take regular prescribed medication?",
                    name: "medical_condition1",
                  },
                  {
                    q: "Any other disease or physical infirmity which could impair your ability to drive?",
                    name: "medical_condition2",
                  },
                ].map((item) => (
                  <div
                    key={item.name}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <label className="text-sm text-gray-700 flex-1">
                      {item.q}
                    </label>
                    <div className="flex gap-8">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name={item.name}
                          value="Yes"
                          checked={formData[item.name] === "Yes"}
                          onChange={handleRadio}
                          className="h-4 w-4 text-green-600 focus:ring-green-500"
                        />
                        <span className="ml-2">Yes</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name={item.name}
                          value="No"
                          checked={formData[item.name] === "No"}
                          onChange={handleRadio}
                          className="h-4 w-4 text-green-600 focus:ring-green-500"
                        />
                        <span className="ml-2">No</span>
                      </label>
                    </div>
                  </div>
                ))}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    If “Yes” to any above, please give details:
                  </label>
                  <textarea
                    name="medical_details"
                    value={formData.medical_details}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                  />
                </div>
              </div>
            </section>

            {/* Additional Driver Authorization */}
            <section className="space-y-6">
              <h3 className="text-2xl font-semibold text-green-700 pb-3 border-b border-green-200">
                Additional Driver Authorization
              </h3>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <label className="text-sm text-gray-700">
                  Will any other person drive the vehicle during the hire period?
                </label>
                <div className="flex gap-8">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="additional_driver_auth"
                      value="Yes"
                      checked={formData.additional_driver_auth === "Yes"}
                      onChange={handleRadio}
                      className="h-4 w-4 text-green-600 focus:ring-green-500"
                    />
                    <span className="ml-2">Yes</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="additional_driver_auth"
                      value="No"
                      checked={formData.additional_driver_auth === "No"}
                      onChange={handleRadio}
                      className="h-4 w-4 text-green-600 focus:ring-green-500"
                    />
                    <span className="ml-2">No</span>
                  </label>
                </div>
              </div>
              <p className="text-sm text-gray-600 italic mt-2">
                (If yes, a separate additional driver form must be completed by each additional driver.)
              </p>
            </section>

            {/* VERY IMPORTANT */}
            <div className="bg-green-50 p-6 rounded-2xl border border-green-200">
              <h3 className="text-xl font-bold text-green-800 mb-3">VERY IMPORTANT:</h3>
              <p className="text-gray-700 text-sm leading-relaxed">
                You are reminded of the need to disclose any fact which the insurers would take into account in the assessment and acceptance of the proposal...
              </p>
            </div>

            {/* 1984 Data Protection Act */}
            <div className="bg-green-50 p-6 rounded-2xl border border-green-200">
              <h3 className="text-xl font-bold text-green-800 mb-3">
                1984 Data Protection Act
              </h3>
              <p className="text-gray-700 text-sm leading-relaxed">
                Insurers maintain a motor insurance anti-fraud and theft register...
              </p>
            </div>

            {/* Declaration */}
            <section className="space-y-6">
              <h3 className="text-2xl font-semibold text-green-700 pb-3 border-b border-green-200">
                Declaration
              </h3>
              <p className="text-gray-700 italic text-sm leading-relaxed">
                I declare that all statements and particulars given by me in this proposal...
              </p>
              <p className="text-gray-700 italic text-sm leading-relaxed">
                I understand that I shall not allow the vehicle to be driven by any person not authorised...
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hirer’s Signature:
                  </label>

                  {isDeclarationFromApi && signatures.declaration_signature ? (
                    <div className="border border-green-300 rounded-xl p-6 bg-green-50 max-w-md mx-auto text-center">
                      <img
                        src={signatures.declaration_signature}
                        alt="Declaration signature"
                        className="max-h-40 mx-auto object-contain"
                      />
                      <p className="mt-4 text-sm text-green-700 font-medium">
                        Signature saved ✓ (from record)
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-4">
                      <Signature
                        ref={declarationRef}
                        onSign={handleSignature("declaration_signature")}
                      />
                      {signatures.declaration_signature && (
                        <p></p>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date:
                  </label>
                  <input
                    type="date"
                    name="declaration_date"
                    value={formData.declaration_date}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                  />
                </div>
              </div>
            </section>

            {/* Hire Vehicle */}
            <section className="space-y-6">
              <h3 className="text-2xl font-semibold text-green-700 pb-3 border-b border-green-200">
                Hire Vehicle
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reg:
                  </label>
                  <input
                    type="text"
                    name="hire_vehicle_reg"
                    value={formData.hire_vehicle_reg}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Make:
                  </label>
                  <input
                    type="text"
                    name="hire_vehicle_make"
                    value={formData.hire_vehicle_make}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Model:
                  </label>
                  <input
                    type="text"
                    name="hire_vehicle_model"
                    value={formData.hire_vehicle_model}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Group:
                  </label>
                  <input
                    type="text"
                    name="hire_vehicle_group"
                    value={formData.hire_vehicle_group}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date out:
                  </label>
                  <input
                    type="date"
                    name="hire_vehicle_date_out"
                    value={formData.hire_vehicle_date_out}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date in:
                  </label>
                  <input
                    type="date"
                    name="hire_vehicle_date_in"
                    value={formData.hire_vehicle_date_in}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fuel out:
                  </label>
                  <input
                    type="text"
                    name="hire_vehicle_fuel_out"
                    placeholder="e.g. Full / 3/4 / 1/2"
                    value={formData.hire_vehicle_fuel_out}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fuel in:
                  </label>
                  <input
                    type="text"
                    name="hire_vehicle_fuel_in"
                    placeholder="e.g. Full / 3/4 / 1/2"
                    value={formData.hire_vehicle_fuel_in}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                  />
                </div>
              </div>
            </section>

            {/* Change of Hire Vehicle */}
            <section className="space-y-6">
              <h3 className="text-2xl font-semibold text-green-700 pb-3 border-b border-green-200">
                Change of Hire Vehicle
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reg:
                  </label>
                  <input
                    type="text"
                    name="change_vehicle_reg"
                    value={formData.change_vehicle_reg}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Make:
                  </label>
                  <input
                    type="text"
                    name="change_vehicle_make"
                    value={formData.change_vehicle_make}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Model:
                  </label>
                  <input
                    type="text"
                    name="change_vehicle_model"
                    value={formData.change_vehicle_model}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Group:
                  </label>
                  <input
                    type="text"
                    name="change_vehicle_group"
                    value={formData.change_vehicle_group}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date out:
                  </label>
                  <input
                    type="date"
                    name="change_vehicle_date_out"
                    value={formData.change_vehicle_date_out}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date in:
                  </label>
                  <input
                    type="date"
                    name="change_vehicle_date_in"
                    value={formData.change_vehicle_date_in}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fuel out:
                  </label>
                  <input
                    type="text"
                    name="change_vehicle_fuel_out"
                    placeholder="e.g. Full / 3/4 / 1/2"
                    value={formData.change_vehicle_fuel_out}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fuel in:
                  </label>
                  <input
                    type="text"
                    name="change_vehicle_fuel_in"
                    placeholder="e.g. Full / 3/4 / 1/2"
                    value={formData.change_vehicle_fuel_in}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                  />
                </div>
              </div>
              <p className="text-sm text-gray-500 italic mt-4">
                (Leave blank if no vehicle change occurred during the hire period)
              </p>
            </section>

            {/* Charges Summary */}
            <section className="space-y-6 bg-gradient-to-br from-green-50 to-white p-8 rounded-2xl border border-green-200 shadow-inner">
              <h3 className="text-2xl font-semibold text-green-800 pb-4 border-b border-green-300">
                Charges Summary
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Admin Fee
                  </label>
                  <input
                    type="text"
                    name="admin_fee"
                    placeholder="£0.00"
                    value={formData.admin_fee}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white/80 focus:ring-2 focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Delivery Charge
                  </label>
                  <input
                    type="text"
                    name="delivery_charge"
                    placeholder="£0.00"
                    value={formData.delivery_charge}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white/80 focus:ring-2 focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CDW Per Day
                  </label>
                  <input
                    type="text"
                    name="cdw_per_day"
                    placeholder="£0.00"
                    value={formData.cdw_per_day}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white/80 focus:ring-2 focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Days Out
                  </label>
                  <input
                    type="number"
                    name="days_out"
                    placeholder="0"
                    value={formData.days_out}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white/80 focus:ring-2 focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Days In
                  </label>
                  <input
                    type="number"
                    name="days_in"
                    placeholder="0"
                    value={formData.days_in}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white/80 focus:ring-2 focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Days
                  </label>
                  <input
                    type="number"
                    name="total_days"
                    placeholder="0"
                    value={formData.total_days}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white/80 focus:ring-2 focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rate per Day
                  </label>
                  <input
                    type="text"
                    name="rate_per_day"
                    placeholder="£0.00"
                    value={formData.rate_per_day}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white/80 focus:ring-2 focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Refuelling @
                  </label>
                  <input
                    type="text"
                    name="refuelling_total"
                    placeholder="£0.00"
                    value={formData.refuelling_total}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white/80 focus:ring-2 focus:ring-green-500 transition"
                  />
                </div>
                <div className="sm:col-span-2 lg:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subtotal
                  </label>
                  <input
                    type="text"
                    name="subtotal"
                    placeholder="£0.00"
                    value={formData.subtotal}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white/80 focus:ring-2 focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    VAT at __%
                  </label>
                  <input
                    type="text"
                    name="vat"
                    placeholder="£0.00"
                    value={formData.vat}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white/80 focus:ring-2 focus:ring-green-500 transition"
                  />
                </div>
                <div className="sm:col-span-2 lg:col-span-3 mt-4">
                  <label className="block text-xl font-bold text-green-800 mb-2">
                    Total Cost
                  </label>
                  <input
                    type="text"
                    name="total_cost"
                    placeholder="£0.00"
                    value={formData.total_cost}
                    onChange={handleChange}
                    className="w-full px-6 py-5 text-2xl font-bold border-2 border-green-400 rounded-2xl bg-green-50 focus:ring-4 focus:ring-green-300 transition shadow-md"
                  />
                  <p className="text-sm text-gray-600 mt-2 italic">
                    (Charges will be completed at termination of hire.)
                  </p>
                </div>
              </div>
            </section>

            {/* VAT Notice */}
            <div className="bg-green-50 p-6 rounded-2xl border border-green-200">
              <h3 className="text-xl font-bold text-green-800 mb-3">VAT Notice:</h3>
              <p className="text-gray-700 text-sm leading-relaxed">
                For hirers who are VAT registered, the vehicle hired under this contract is a qualifying car...
              </p>
            </div>

            {/* Parking Fines & Congestion Charges */}
            <div className="bg-green-50 p-6 rounded-2xl border border-green-200">
              <h3 className="text-xl font-bold text-green-800 mb-3">
                Parking Fines & Congestion Charges
              </h3>
              <p className="text-gray-700 text-sm leading-relaxed">
                To cover administration costs, a surcharge of £30 will be made for parking tickets left unpaid...
              </p>
              <p className="text-gray-700 text-sm leading-relaxed mt-3">
                The hirer accepts full responsibility to pay any congestion charge upon demand...
              </p>
            </div>

            {/* Statement of Liability */}
            <section className="space-y-6">
              <h3 className="text-2xl font-semibold text-green-700 pb-3 border-b border-green-200">
                Statement of Liability
              </h3>
              <p className="text-gray-700 text-sm leading-relaxed">
                I acknowledge that during the currency of this rental agreement...
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date:
                  </label>
                  <input
                    type="date"
                    name="liability_date"
                    value={formData.liability_date}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Signed by Hirer:
                  </label>

                  {isLiabilityFromApi && signatures.liability_signature ? (
                    <div className="border border-green-300 rounded-xl p-6 bg-green-50 max-w-md mx-auto text-center">
                      <img
                        src={signatures.liability_signature}
                        alt="Liability signature"
                        className="max-h-40 mx-auto object-contain"
                      />
                      <p className="mt-4 text-sm text-green-700 font-medium">
                        Signature saved ✓ (from record)
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-4">
                      <Signature
                        ref={liabilityRef}
                        onSign={handleSignature("liability_signature")}
                      />
                      {signatures.liability_signature && (
                        <p></p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Submit Button */}
            <div className="text-center pt-10">
              <button
                type="submit"
                disabled={loading}
                className={`
                  bg-gradient-to-r from-green-600 to-green-500
                  hover:from-green-700 hover:to-green-600
                  text-white font-bold py-5 px-16
                  rounded-full text-xl shadow-2xl
                  transform hover:scale-105 transition-all duration-300
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${loading ? "cursor-wait" : ""}
                `}
              >
                {loading ? "Submitting..." : "Submit & Generate JSON"}
              </button>

              {error && (
                <p className="mt-4 text-red-600 font-medium">{error}</p>
              )}

              {submitted && !loading && (
                <p className="mt-6 text-green-700 font-medium">
                  Rental agreement submitted successfully 🌿
                </p>
              )}
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}