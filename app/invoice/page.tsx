'use client';

import { useState } from 'react';
import { RefreshCw, Plus } from 'lucide-react';
import InvoiceManagementPage from "../components/InvoiceManagment";
import ClientsPage from '../components/Client';

export default function InvoicePage() {
  const [activeTab, setActiveTab] = useState<string | null>(null); // null = blank page by default
  const [isLoading, setIsLoading] = useState(false);

  const tabs = [
    { id: 'fleet', label: 'Fleet' },
    { id: 'clients', label: 'Clients' },
    { id: 'invoices', label: 'Invoices' },
  ];

  const handleRefresh = () => {
    if (!activeTab) return;
    setIsLoading(true);
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
            <p className="text-green-600 mt-1">Manage your fleet, clients, invoices & bank</p>
          </div>

          <div className="flex items-center gap-3 mt-4 md:mt-0">
            <button
              onClick={handleRefresh}
              disabled={isLoading || !activeTab}
              className="flex items-center gap-2 px-4 py-2 text-green-700 hover:bg-green-100 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>

            <button className="flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white px-5 py-2.5 rounded-xl font-medium transition-colors">
              <Plus className="w-5 h-5" />
              New Entry
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-green-200/70">
          <div className="flex space-x-10 overflow-x-auto pb-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-3 px-2 text-base font-medium transition-all whitespace-nowrap border-b-2 ${
                  activeTab === tab.id
                    ? 'text-green-700 border-green-600'
                    : 'text-green-600/70 hover:text-green-700 border-transparent'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content - Completely Blank by Default */}
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl shadow-sm border border-green-100/50 p-6 md:p-8 min-h-[600px]">
          
          {/* Fleet Tab */}
          {activeTab === 'fleet' && (
            <>
              <h2 className="text-2xl font-bold text-green-800 mb-6">Fleet Management</h2>
              <div className="bg-white rounded-xl p-12 text-center border border-green-100">
                <p className="text-green-700 text-lg">
                  Fleet page content will go here.<br />
                  (Create <code className="bg-gray-100 px-1 rounded">../components/Fleet.tsx</code> component)
                </p>
              </div>
            </>
          )}

          {/* Clients Tab */}
          {activeTab === 'clients' && (
            <>
              <h2 className="text-2xl font-bold text-green-800 mb-6">Clients</h2>
              <ClientsPage />
            </>
          )}

          {/* Invoices Tab */}
          {activeTab === 'invoices' && (
            <>
              <h2 className="text-2xl font-bold text-green-800 mb-6">All Invoices</h2>
              <InvoiceManagementPage />
            </>
          )}

          {/* Default Blank State - Nothing shows until tab is clicked */}
          {!activeTab && <div className="h-full"></div>}

        </div>
      </main>
    </div>
  );
}