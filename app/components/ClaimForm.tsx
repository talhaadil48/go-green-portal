"use client";

import { useState, FormEvent, useRef, useEffect } from "react";
import axios from "axios";
import Signature from "../components/Signature"; // ← adjust path if needed

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

  const initialChecklistState = checklistItems.reduce((acc, item) => {
    const key = `checklist_${item.toLowerCase().replace(/ /g, "_")}`;
    acc[key] = false;
    return acc;
  }, {} as Record<string, boolean>);

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
  const [signatures, setSignatures] = useState<Record<string, string | null>>({});
  const [circumstanceDrawing, setCircumstanceDrawing] = useState<string | null>(null);
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

  const circumstanceCanvasRef = useRef<HTMLCanvasElement>(null);
  const beforeCanvasRef = useRef<HTMLCanvasElement>(null);
  const afterCanvasRef = useRef<HTMLCanvasElement>(null);
  const sigRef = useRef<any>(null); // for <Signature> component (clear support)

  // Canvas setup logic (only run when not from API and not already drawn)
  const setupDrawingCanvas = (
    canvasRef: React.RefObject<HTMLCanvasElement>,
    setDrawing: React.Dispatch<React.SetStateAction<string | null>>,
    width: number,
    height: number
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = width;
    canvas.height = height;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "#991b1b";
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;

    const getPosition = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (e instanceof TouchEvent && e.touches?.length) {
        return {
          x: e.touches[0].clientX - rect.left,
          y: e.touches[0].clientY - rect.top,
        };
      }
      return {
        x: (e as MouseEvent).clientX - rect.left,
        y: (e as MouseEvent).clientY - rect.top,
      };
    };

    const startDrawing = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      isDrawing = true;
      const { x, y } = getPosition(e);
      lastX = x;
      lastY = y;
    };

    const draw = (e: MouseEvent | TouchEvent) => {
      if (!isDrawing) return;
      e.preventDefault();

      const { x, y } = getPosition(e);

      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(x, y);
      ctx.stroke();

      lastX = x;
      lastY = y;

      setDrawing(canvas.toDataURL("image/png"));
    };

    const stopDrawing = () => {
      if (isDrawing) {
        isDrawing = false;
        setDrawing(canvas.toDataURL("image/png"));
      }
    };

    canvas.addEventListener("mousedown", startDrawing);
    canvas.addEventListener("mousemove", draw);
    canvas.addEventListener("mouseup", stopDrawing);
    canvas.addEventListener("mouseout", stopDrawing);

    canvas.addEventListener("touchstart", startDrawing);
    canvas.addEventListener("touchmove", draw);
    canvas.addEventListener("touchend", stopDrawing);
    canvas.addEventListener("touchcancel", stopDrawing);

    return () => {
      canvas.removeEventListener("mousedown", startDrawing);
      canvas.removeEventListener("mousemove", draw);
      canvas.removeEventListener("mouseup", stopDrawing);
      canvas.removeEventListener("mouseout", stopDrawing);
      canvas.removeEventListener("touchstart", startDrawing);
      canvas.removeEventListener("touchmove", draw);
      canvas.removeEventListener("touchend", stopDrawing);
      canvas.removeEventListener("touchcancel", stopDrawing);
    };
  };

  useEffect(() => {
    if (!circumstanceDrawing && !isCircumstanceFromApi) {
      return setupDrawingCanvas(circumstanceCanvasRef, setCircumstanceDrawing, 900, 500);
    }
  }, [circumstanceDrawing, isCircumstanceFromApi]);

  useEffect(() => {
    if (!beforeDrawing && !isBeforeFromApi) {
      return setupDrawingCanvas(beforeCanvasRef, setBeforeDrawing, 400, 400);
    }
  }, [beforeDrawing, isBeforeFromApi]);

  useEffect(() => {
    if (!afterDrawing && !isAfterFromApi) {
      return setupDrawingCanvas(afterCanvasRef, setAfterDrawing, 400, 400);
    }
  }, [afterDrawing, isAfterFromApi]);

  useEffect(() => {
    setCurrentClaimId(claimId);
  }, [claimId]);

  const clearCanvas = (
    ref: React.RefObject<HTMLCanvasElement>,
    setter: React.Dispatch<React.SetStateAction<string | null>>
  ) => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setter(null);
  };

  const loadImageToCanvas = (
    ref: React.RefObject<HTMLCanvasElement>,
    dataUrl: string | null
  ) => {
    if (!dataUrl || !ref.current) return;
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = dataUrl;
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
  };

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
        loadImageToCanvas(circumstanceCanvasRef, data.circumstance_drawing);
      } else {
        setCircumstanceDrawing(null);
        setIsCircumstanceFromApi(false);
      }

      if (data.direction_before_drawing) {
        setBeforeDrawing(data.direction_before_drawing);
        setIsBeforeFromApi(true);
        loadImageToCanvas(beforeCanvasRef, data.direction_before_drawing);
      } else {
        setBeforeDrawing(null);
        setIsBeforeFromApi(false);
      }

      if (data.direction_after_drawing) {
        setAfterDrawing(data.direction_after_drawing);
        setIsAfterFromApi(true);
        loadImageToCanvas(afterCanvasRef, data.direction_after_drawing);
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
    } catch (err: any) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        console.log("Claim not found (404) – showing empty form");
      } else {
        console.error("Fetch error:", err);
        setError(err.message || "Failed to load claim data");
      }
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    if (claimId) fetchClaim();
  }, [claimId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    let newValue: any = value;

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
      await fetchClaim(); // refresh after submit
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
                  <label key={item} className="flex items-center gap-2 text-gray-800 font-medium">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    name="owner_full_name"
                    value={formData.owner_full_name || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Date of Birth</label>
                  <input
                    type="date"
                    name="owner_dob"
                    value={formData.owner_dob || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    name="owner_email"
                    value={formData.owner_email || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Telephone</label>
                  <input
                    type="tel"
                    name="owner_telephone"
                    value={formData.owner_telephone || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
                  <textarea
                    name="owner_address"
                    value={formData.owner_address || ""}
                    onChange={handleChange}
                    rows={2}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Postcode</label>
                  <input
                    type="text"
                    name="owner_postcode"
                    value={formData.owner_postcode || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">NI number</label>
                  <input
                    type="text"
                    name="owner_ni_number"
                    value={formData.owner_ni_number || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Occupation</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    name="driver_full_name"
                    value={formData.driver_full_name || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Date of Birth</label>
                  <input
                    type="date"
                    name="driver_dob"
                    value={formData.driver_dob || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    name="driver_email"
                    value={formData.driver_email || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Telephone</label>
                  <input
                    type="tel"
                    name="driver_telephone"
                    value={formData.driver_telephone || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
                  <textarea
                    name="driver_address"
                    value={formData.driver_address || ""}
                    onChange={handleChange}
                    rows={2}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Postcode</label>
                  <input
                    type="text"
                    name="driver_postcode"
                    value={formData.driver_postcode || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">NI number</label>
                  <input
                    type="text"
                    name="driver_ni_number"
                    value={formData.driver_ni_number || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Occupation</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Make</label>
                  <input
                    type="text"
                    name="client_vehicle_make"
                    value={formData.client_vehicle_make || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Model</label>
                  <input
                    type="text"
                    name="client_vehicle_model"
                    value={formData.client_vehicle_model || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Registration</label>
                  <input
                    type="text"
                    name="client_registration"
                    value={formData.client_registration || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                  />
                </div>
              </div>

              <h4 className="text-lg font-semibold text-green-800 mb-3">CLIENT INSURANCE DETAILS</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Insurance Policy No</label>
                  <input
                    type="text"
                    name="client_policy_no"
                    value={formData.client_policy_no || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Policy Holder</label>
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
                {["Third party fire & theft", "Comprehensive", "Third party"].map((type) => (
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
                ))}
              </div>
            </section>

            {/* THIRD PARTY DETAILS + VEHICLE */}
            <section className="bg-gradient-to-b from-white to-green-50/20 p-6 rounded-2xl border border-green-200 shadow-md">
              <h3 className="text-xl font-bold text-green-800 mb-4 border-b border-green-300 pb-2">
                THIRD PARTY DETAILS
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    name="third_party_name"
                    value={formData.third_party_name || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Date of Birth</label>
                  <input
                    type="date"
                    name="third_party_dob"
                    value={formData.third_party_dob || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    name="third_party_email"
                    value={formData.third_party_email || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Telephone</label>
                  <input
                    type="tel"
                    name="third_party_telephone"
                    value={formData.third_party_telephone || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
                  <textarea
                    name="third_party_address"
                    value={formData.third_party_address || ""}
                    onChange={handleChange}
                    rows={2}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Postcode</label>
                  <input
                    type="text"
                    name="third_party_postcode"
                    value={formData.third_party_postcode || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">NI number</label>
                  <input
                    type="text"
                    name="third_party_ni_number"
                    value={formData.third_party_ni_number || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Occupation</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Make</label>
                  <input
                    type="text"
                    name="third_party_vehicle_make"
                    value={formData.third_party_vehicle_make || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Model</label>
                  <input
                    type="text"
                    name="third_party_vehicle_model"
                    value={formData.third_party_vehicle_model || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Registration</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Insurance Policy No</label>
                  <input
                    type="text"
                    name="third_party_policy_no"
                    value={formData.third_party_policy_no || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Policy Holder</label>
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

              <div className="flex flex-col sm:flex-row justify-center gap-10 sm:gap-16">
                {/* BEFORE */}
                <div className="text-center">
                  <div className="text-lg font-semibold mb-3 text-gray-800">Before</div>

                  {isBeforeFromApi && beforeDrawing ? (
                    <div className="mx-auto">
                      <img
                        src={beforeDrawing}
                        alt="Before accident direction drawing"
                        className="w-[400px] h-[400px] object-contain border-4 border-gray-400 rounded-2xl shadow-lg"
                      />
                      <p className="text-sm text-gray-500 mt-2 italic">
                        (Saved drawing – view only)
                      </p>
                    </div>
                  ) : (
                    <div className="relative border-4 border-gray-400 rounded-2xl overflow-hidden shadow-lg bg-white w-[400px] h-[400px] mx-auto touch-none">
                      <canvas ref={beforeCanvasRef} className="absolute inset-0 cursor-crosshair touch-none" />
                      <button
                        type="button"
                        onClick={() => clearCanvas(beforeCanvasRef, setBeforeDrawing)}
                        className="absolute bottom-4 right-4 bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg text-sm shadow transition"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>

                {/* AFTER */}
                <div className="text-center">
                  <div className="text-lg font-semibold mb-3 text-gray-800">After</div>

                  {isAfterFromApi && afterDrawing ? (
                    <div className="mx-auto">
                      <img
                        src={afterDrawing}
                        alt="After accident direction drawing"
                        className="w-[400px] h-[400px] object-contain border-4 border-gray-400 rounded-2xl shadow-lg"
                      />
                      <p className="text-sm text-gray-500 mt-2 italic">
                        (Saved drawing – view only)
                      </p>
                    </div>
                  ) : (
                    <div className="relative border-4 border-gray-400 rounded-2xl overflow-hidden shadow-lg bg-white w-[400px] h-[400px] mx-auto touch-none">
                      <canvas ref={afterCanvasRef} className="absolute inset-0 cursor-crosshair touch-none" />
                      <button
                        type="button"
                        onClick={() => clearCanvas(afterCanvasRef, setAfterDrawing)}
                        className="absolute bottom-4 right-4 bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg text-sm shadow transition"
                      >
                        Clear
                      </button>
                    </div>
                  )}
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
                    <label className="block text-lg font-semibold text-gray-800 mb-2">Road conditions</label>
                    <input
                      type="text"
                      name="road_conditions"
                      value={formData.road_conditions || ""}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-lg font-semibold text-gray-800 mb-2">Weather conditions</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Date of Accident</label>
                  <input
                    type="date"
                    name="accident_date"
                    value={formData.accident_date || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Time of Accident</label>
                  <input
                    type="time"
                    name="accident_time"
                    value={formData.accident_time || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Location of Accident</label>
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

              {isCircumstanceFromApi && circumstanceDrawing ? (
                <div className="max-w-4xl mx-auto text-center">
                  <img
                    src={circumstanceDrawing}
                    alt="Circumstances of accident drawing"
                    className="w-full max-h-[500px] object-contain border-4 border-gray-400 rounded-3xl shadow-2xl"
                  />
                  <p className="text-sm text-gray-500 mt-3 italic">
                    (Saved drawing – view only)
                  </p>
                </div>
              ) : (
                <div className="relative border-4 border-gray-400 rounded-3xl overflow-hidden shadow-2xl max-w-4xl mx-auto bg-white touch-none">
                  <canvas ref={circumstanceCanvasRef} className="w-full h-[500px] cursor-crosshair touch-none" />
                  <button
                    type="button"
                    onClick={() => clearCanvas(circumstanceCanvasRef, setCircumstanceDrawing)}
                    className="absolute bottom-5 right-5 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl text-base font-semibold shadow-lg transition transform hover:scale-105"
                  >
                    Clear Drawing
                  </button>
                </div>
              )}
            </section>

            {/* WITNESSES */}
            <section className="bg-gradient-to-b from-white to-green-50/20 p-6 rounded-2xl border border-green-200 shadow-md">
              <h3 className="text-xl font-bold text-green-800 mb-4 border-b border-green-300 pb-2">
                WITNESSES
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {[1, 2].map((num) => (
                  <div key={num}>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                    <input
                      type="text"
                      name={`witness${num}_name`}
                      value={formData[`witness${num}_name` as keyof typeof formData] || ""}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                    />
                    <label className="block text-sm font-medium text-gray-700 mt-4 mb-1.5">Address</label>
                    <textarea
                      name={`witness${num}_address`}
                      value={formData[`witness${num}_address` as keyof typeof formData] || ""}
                      onChange={handleChange}
                      rows={2}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                    />
                    <label className="block text-sm font-medium text-gray-700 mt-4 mb-1.5">Postcode</label>
                    <input
                      type="text"
                      name={`witness${num}_postcode`}
                      value={formData[`witness${num}_postcode` as keyof typeof formData] || ""}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                    />
                    <label className="block text-sm font-medium text-gray-700 mt-4 mb-1.5">Telephone</label>
                    <input
                      type="tel"
                      name={`witness${num}_telephone`}
                      value={formData[`witness${num}_telephone` as keyof typeof formData] || ""}
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
              <h3 className="text-2xl font-bold text-green-900 mb-6">DECLARATION</h3>
              <p className="text-gray-700 leading-relaxed mb-10 max-w-3xl mx-auto">
                I confirm that the above information I have given is correct and to the best of my knowledge, and request that you act on my behalf in pursuing the claim for compensation arising out of the above incident, including issuing Court proceedings, should this be required.
              </p>

              <div className="max-w-lg mx-auto space-y-10">
                <div>
                  <label className="block text-xl font-bold text-green-900 mb-3">Print Name</label>
                  <input
                    type="text"
                    name="print_name"
                    value={formData.print_name || ""}
                    onChange={handleChange}
                    className="w-full px-5 py-4 border-2 border-green-400 rounded-xl focus:ring-green-500 transition text-lg text-center"
                  />
                </div>

                <div>
                  <label className="block text-xl font-bold text-green-900 mb-3">Date</label>
                  <input
                    type="date"
                    name="declaration_date"
                    value={formData.declaration_date || ""}
                    onChange={handleChange}
                    className="w-full px-5 py-4 border-2 border-green-400 rounded-xl focus:ring-green-500 transition text-lg text-center"
                  />
                </div>

                <div>
                  <label className="block text-xl font-bold text-green-900 mb-3">Signature</label>
                  <div className="flex flex-col items-center gap-4">
                    {isSignatureFromApi && signatures.client ? (
                      <div className="text-center">
                        <img
                          src={signatures.client}
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
                        {signatures.client && (
                          <p>   </p>
                        )}
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
                  Form submitted successfully – data refreshed 🌿
                </p>
              )}
              {error && <p className="mt-8 text-red-700 font-semibold text-xl">{error}</p>}
            </div>

            {/* Footer */}
            <div className="text-center text-gray-600 text-sm mt-12 pt-8 border-t border-gray-200">
              <p>
                Email: <strong className="text-green-700">info@gogreenhire.co.uk</strong> •
                Website: <strong className="text-green-700">www.gogreenhire.co.uk</strong> •
                Phone: <strong className="text-green-700">01283 247247</strong>
              </p>
              <p className="mt-2">Company Number: 15238847</p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}