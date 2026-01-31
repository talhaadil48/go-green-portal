"use client";

import React from "react";
import { useState } from "react";
import PreInspectionChecklist from "./components/PreInspection";
import CancellationNotice from "./components/Cancellation";
import StorageRecoveryAgreement from "./components/Storage";
import RentalAgreement from "./components/RentalAgreement";
import AccidentClaimForm from "./components/ClaimForm";
type TabKey =
  | "pre-inspection"
  | "cancellation"
  | "storage-recovery"
  | "rental-agreement"
  | "claim"
  | "document";

const tabs: { key: TabKey; label: string }[] = [
  { key: "claim", label: "Claim Form" },
  { key: "pre-inspection", label: "Pre-Inspection" },
  { key: "cancellation", label: "Cancellation Notice" },
  { key: "storage-recovery", label: "Storage" },
  { key: "rental-agreement", label: "Rental Agreement" },
  { key: "document", label: "Document" },
];

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<TabKey>("pre-inspection");

  // For demo – in real app these would come from props / context / URL / auth
  const customerInfo = {
    customerId: "CUST-394821",
    customerName: "Muhammad Ahmed Khan",
    customerType: "corporate",
  };

  const getCustomerTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      individual: "Individual",
      business: "Business",
      corporate: "Corporate",
      fleet: "Fleet",
    };
    return types[type] || "—";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 pb-12">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-md shadow-md border-b border-green-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-700 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">GG</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-green-800">Go Green Car Hire</h1>
                <p className="text-sm text-gray-500">Customer Forms Portal</p>
              </div>
            </div>

            <div className="text-sm text-gray-600 font-medium">
              Hire Agreement
            </div>
          </div>
        </div>
      </header>

      {/* Customer Info – now fixed / read-only */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-lg p-6">
          <h2 className="text-lg font-bold text-green-800 mb-4">
            Customer Details
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm">
            <div>
              <p className="text-gray-500">Customer ID</p>
              <p className="font-medium text-gray-900 mt-1">{customerInfo.customerId || "—"}</p>
            </div>

            <div>
              <p className="text-gray-500">Customer Name</p>
              <p className="font-medium text-gray-900 mt-1">{customerInfo.customerName || "—"}</p>
            </div>

            <div>
              <p className="text-gray-500">Customer Type</p>
              <p className="font-medium text-gray-900 mt-1">
                {getCustomerTypeLabel(customerInfo.customerType)}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content – same container width as customer section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs – full width inside container */}
        <div className="flex flex-wrap gap-2 p-1 bg-green-100/50 rounded-xl mb-8 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 min-w-[140px] py-3 px-4 text-sm sm:text-base font-semibold rounded-lg transition-all whitespace-nowrap ${
                activeTab === tab.key
                  ? "bg-green-600 text-white shadow-lg"
                  : "text-gray-600 hover:bg-white/50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-lg p-6 sm:p-8">
          {activeTab === "pre-inspection" && <PreInspectionChecklist />}
          {activeTab === "cancellation" && <CancellationNotice />}
          {activeTab === "storage-recovery" && <StorageRecoveryAgreement />}

         {activeTab === "rental-agreement" && <RentalAgreement />}
         {activeTab === "claim" && <AccidentClaimForm />}

          

          {activeTab === "incident-report" && (
            <div className="py-12 text-center text-gray-500">
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Incident / Accident Report</h3>
              <p>Coming soon – official incident reporting form</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}