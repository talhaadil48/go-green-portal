'use client';

import { useState } from 'react';
import { RefreshCw, Plus } from 'lucide-react'; // assuming you're using lucide-react
import InvoiceManagementPage from "../components/InvoiceManagment";

export default function InvoicePage() {
  const [activeTab, setActiveTab] = useState('invoices');
  const [isLoading, setIsLoading] = useState(false);
  // You can later add real loading + fetch logic

  const tabs = [
    { id: 'invoices', label: 'Invoices' },
    
  ];

  const handleRefresh = () => {
    setIsLoading(true);
    // Simulate refresh – replace with your real fetches
    setTimeout(() => setIsLoading(false), 1200);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50/40">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-green-800 tracking-tight">
              Accounts Management
            </h1>
           
          </div>

          
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-green-200/70">
          <div className="flex space-x-10 overflow-x-auto pb-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-3 px-2 text-base font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'text-green-700 border-b-2 border-green-600'
                    : 'text-green-600/70 hover:text-green-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl shadow-sm border border-green-100/50 p-6 md:p-8">
          {activeTab === 'invoices' && (
            <>
              <h2 className="text-2xl font-bold text-green-800 mb-6">
                All Invoices
              </h2>
              <InvoiceManagementPage />
            </>
          )}

          {activeTab === 'due' && (
            <>
              <h2 className="text-2xl font-bold text-green-800 mb-6">
                Due / Pending Invoices
              </h2>
              <div className="bg-white rounded-xl p-10 text-center border border-green-100">
                <p className="text-green-700 text-lg">
                  Invoices sent but not yet paid (due within 30 days)
                </p>
                {/* → Later: filtered list here */}
              </div>
            </>
          )}

          {activeTab === 'paid' && (
            <>
              <h2 className="text-2xl font-bold text-green-800 mb-6">
                Paid Invoices
              </h2>
              <div className="bg-white rounded-xl p-10 text-center border border-green-100">
                <p className="text-green-700 text-lg">
                  Successfully settled transactions
                </p>
              </div>
            </>
          )}

          {activeTab === 'overdue' && (
            <>
              <h2 className="text-2xl font-bold text-red-700 mb-6">
                Overdue Invoices
              </h2>
              <div className="bg-white rounded-xl p-10 text-center border border-red-100">
                <p className="text-red-700 text-lg">
                  Payments past due date – action required
                </p>
              </div>
            </>
          )}

          {activeTab === 'estimates' && (
            <>
              <h2 className="text-2xl font-bold text-green-800 mb-6">
                Estimates & Quotes
              </h2>
              <div className="bg-white rounded-xl p-10 text-center border border-green-100">
                <p className="text-green-700 text-lg">
                  Draft proposals awaiting approval
                </p>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}