"use client";

import { useState, FormEvent, useRef, useEffect } from "react";
import Signature from "../components/Signature"; // ← adjust the import path if needed

export default function AccidentClaimForm() {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [signatures, setSignatures] = useState<Record<string, string | null>>({});
  const [circumstanceDrawing, setCircumstanceDrawing] = useState<string | null>(null);
  const [beforeDrawing, setBeforeDrawing] = useState<string | null>(null);
  const [afterDrawing, setAfterDrawing] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const circumstanceCanvasRef = useRef<HTMLCanvasElement>(null);
  const beforeCanvasRef = useRef<HTMLCanvasElement>(null);
  const afterCanvasRef = useRef<HTMLCanvasElement>(null);

  // ────────────────────────────────────────────────
  // Shared drawing logic (mouse + touch support)
  const setupDrawingCanvas = (
    canvasRef: React.RefObject<HTMLCanvasElement>,
    setDrawing: React.Dispatch<React.SetStateAction<string | null>>,
    width = 700,
    height = 300
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

    // Mouse
    canvas.addEventListener("mousedown", startDrawing);
    canvas.addEventListener("mousemove", draw);
    canvas.addEventListener("mouseup", stopDrawing);
    canvas.addEventListener("mouseout", stopDrawing);

    // Touch
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
    return setupDrawingCanvas(circumstanceCanvasRef, setCircumstanceDrawing, 900, 500);
  }, []);

  useEffect(() => {
    return setupDrawingCanvas(beforeCanvasRef, setBeforeDrawing, 400, 400);
  }, []);

  useEffect(() => {
    return setupDrawingCanvas(afterCanvasRef, setAfterDrawing, 400, 400);
  }, []);

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type, checked } = e.target as any;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSignature = (field: string) => (dataUrl: string | null) => {
    setSignatures((prev) => ({ ...prev, [field]: dataUrl }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    const fullData = {
      ...formData,
      client_signature: signatures.client,
      circumstance_drawing: circumstanceDrawing,
      direction_before_drawing: beforeDrawing,
      direction_after_drawing: afterDrawing,
      submitted_at: new Date().toISOString(),
      form_type: "Accident Claim Form - Go Green Car Hire Ltd",
    };

    console.log("Submitted Accident Claim:", JSON.stringify(fullData, null, 2));
    setSubmitted(true);
  };

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
              {["V.D", "DVLA", "BADGE", "RECOVERY", "HIRE", "NI NO", "STORAGE", "PLATE", "LICENCE", "LOGBOOK"].map(
                (item) => (
                  <label key={item} className="flex items-center gap-2 text-gray-800 font-medium">
                    <input
                      type="checkbox"
                      name={`checklist_${item.toLowerCase().replace(/ /g, "_")}`}
                      onChange={handleChange}
                      className="h-5 w-5 text-green-600 rounded border-gray-300"
                    />
                    <span>{item}</span>
                  </label>
                )
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-10">
            {/* DATE OF CLAIM */}
            <div className="text-center">
              <label className="block text-lg font-semibold text-gray-800 mb-2">DATE OF CLAIM</label>
              <input
                type="date"
                name="date_of_claim"
                onChange={handleChange}
                className="inline-block px-6 py-3 border-2 border-green-400 rounded-xl text-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
              />
            </div>

            {/* ACCIDENT DETAILS */}
           
            {/* VEHICLE OWNER DETAILS */}
            <section className="bg-gradient-to-b from-white to-green-50/20 p-6 rounded-2xl border border-green-200 shadow-md">
              <h3 className="text-xl font-bold text-green-800 mb-4 border-b border-green-300 pb-2">
                VEHICLE OWNER DETAILS
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                  <input type="text" name="owner_full_name" onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Date of Birth</label>
                  <input type="date" name="owner_dob" onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <input type="email" name="owner_email" onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Telephone</label>
                  <input type="tel" name="owner_telephone" onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
                  <textarea name="owner_address" rows={2} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Postcode</label>
                  <input type="text" name="owner_postcode" onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">NI number</label>
                  <input type="text" name="owner_ni_number" onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Occupation</label>
                  <input type="text" name="owner_occupation" onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition" />
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
                  <input type="text" name="driver_full_name" onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Date of Birth</label>
                  <input type="date" name="driver_dob" onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <input type="email" name="driver_email" onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Telephone</label>
                  <input type="tel" name="driver_telephone" onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
                  <textarea name="driver_address" rows={2} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Postcode</label>
                  <input type="text" name="driver_postcode" onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">NI number</label>
                  <input type="text" name="driver_ni_number" onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Occupation</label>
                  <input type="text" name="driver_occupation" onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition" />
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
                  <input type="text" name="client_vehicle_make" onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Model</label>
                  <input type="text" name="client_vehicle_model" onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Registration</label>
                  <input type="text" name="client_registration" onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition" />
                </div>
              </div>

              <h4 className="text-lg font-semibold text-green-800 mb-3">CLIENT INSURANCE DETAILS</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Insurance Policy No</label>
                  <input type="text" name="client_policy_no" onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Policy Holder</label>
                  <input type="text" name="client_policy_holder" onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition" />
                </div>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-6 flex-wrap">
                {["Third party fire & theft", "Comprehensive", "Third party"].map((type) => (
                  <label key={type} className="flex items-center gap-2">
                    <input type="radio" name="client_cover_type" value={type} onChange={handleChange} className="h-5 w-5 text-green-600" />
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
                  <input type="text" name="third_party_name" onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Date of Birth</label>
                  <input type="date" name="third_party_dob" onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <input type="email" name="third_party_email" onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Telephone</label>
                  <input type="tel" name="third_party_telephone" onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
                  <textarea name="third_party_address" rows={2} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Postcode</label>
                  <input type="text" name="third_party_postcode" onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">NI number</label>
                  <input type="text" name="third_party_ni_number" onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Occupation</label>
                  <input type="text" name="third_party_occupation" onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition" />
                </div>
              </div>

              <h4 className="text-lg font-semibold text-green-800 mb-4 border-t border-green-200 pt-4">
                THIRD PARTY VEHICLE & INSURANCE
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Make</label>
                  <input type="text" name="third_party_vehicle_make" onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Model</label>
                  <input type="text" name="third_party_vehicle_model" onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Registration</label>
                  <input type="text" name="third_party_registration" onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Insurance Policy No</label>
                  <input type="text" name="third_party_policy_no" onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Policy Holder</label>
                  <input type="text" name="third_party_policy_holder" onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition" />
                </div>
              </div>
            </section>

            {/* DIRECTION OF TRAVEL */}
            <section className="bg-gradient-to-b from-white to-green-50/20 p-6 rounded-2xl border border-green-200 shadow-md">
              <label className="block text-xl font-bold text-gray-900 mb-6 text-center">
                (Please indicate direction of travel – Before vs After)
              </label>

              <div className="flex flex-col sm:flex-row justify-center gap-10 sm:gap-16">
                <div className="text-center">
                  <div className="text-lg font-semibold mb-3 text-gray-800">Before</div>
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
                </div>

                <div className="text-center">
                  <div className="text-lg font-semibold mb-3 text-gray-800">After</div>
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
                    rows={2}
                    onChange={handleChange}
                    className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-lg font-semibold text-gray-800 mb-2">
                    Why do you think this is so?
                  </label>
                  <textarea
                    name="fault_reason"
                    rows={3}
                    onChange={handleChange}
                    className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-lg font-semibold text-gray-800 mb-2">Road conditions</label>
                    <input type="text" name="road_conditions" onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition" />
                  </div>
                  <div>
                    <label className="block text-lg font-semibold text-gray-800 mb-2">Weather conditions</label>
                    <input type="text" name="weather_conditions" onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition" />
                  </div>
                </div>
              </div>
            </section>
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
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Time of Accident</label>
                  <input
                    type="time"
                    name="accident_time"
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Location of Accident</label>
                  <textarea
                    name="accident_location"
                    rows={2}
                    onChange={handleChange}
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
            </section>

            {/* WITNESSES */}
            <section className="bg-gradient-to-b from-white to-green-50/20 p-6 rounded-2xl border border-green-200 shadow-md">
              <h3 className="text-xl font-bold text-green-800 mb-4 border-b border-green-300 pb-2">WITNESSES</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {[1, 2].map((num) => (
                  <div key={num}>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                    <input
                      type="text"
                      name={`witness${num}_name`}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                    />
                    <label className="block text-sm font-medium text-gray-700 mt-4 mb-1.5">Address</label>
                    <textarea
                      name={`witness${num}_address`}
                      rows={2}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                    />
                    <label className="block text-sm font-medium text-gray-700 mt-4 mb-1.5">Postcode</label>
                    <input
                      type="text"
                      name={`witness${num}_postcode`}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                    />
                    <label className="block text-sm font-medium text-gray-700 mt-4 mb-1.5">Telephone</label>
                    <input
                      type="tel"
                      name={`witness${num}_telephone`}
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
                    className="h-5 w-5 text-green-600 rounded"
                    onChange={handleChange}
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
                  rows={3}
                  onChange={handleChange}
                  className="w-full px-5 py-4 border border-gray-300 rounded-xl focus:ring-green-500 transition"
                />
              </div>
            </section>

            {/* DECLARATION - improved layout */}
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
                    onChange={handleChange}
                    className="w-full px-5 py-4 border-2 border-green-400 rounded-xl focus:ring-green-500 transition text-lg text-center"
                  />
                </div>

                <div>
                  <label className="block text-xl font-bold text-green-900 mb-3">Date</label>
                  <input
                    type="date"
                    name="declaration_date"
                    onChange={handleChange}
                    className="w-full px-5 py-4 border-2 border-green-400 rounded-xl focus:ring-green-500 transition text-lg text-center"
                  />
                </div>

                <div>
                  <label className="block text-xl font-bold text-green-900 mb-3">Signature</label>
                  <div className="flex justify-center">
                    <Signature onSign={handleSignature("client")} />
                  </div>
                </div>
              </div>
            </section>

            {/* SUBMIT BUTTON */}
            <div className="text-center mt-12">
              <button
                type="submit"
                className="inline-flex items-center px-16 py-6 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-extrabold text-2xl rounded-full shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300"
              >
                Submit Claim Form
              </button>

              {submitted && (
                <p className="mt-8 text-green-700 font-semibold text-xl animate-pulse">
                  Form submitted successfully – check console for JSON output 🌿
                </p>
              )}
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