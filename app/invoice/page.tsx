'use client';

import { useState, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import InvoiceManagementPage from "../components/InvoiceManagment";
import ClientsPage from '../components/Client';
import OffersPage from '../components/Offers';
import FleetComponent from '../components/Fleet';

const TABS = [
  { id: 'fleet', label: 'Fleet' },
  { id: 'clients', label: 'Clients' },
  { id: 'invoices', label: 'Invoices' },
  { id: 'offers', label: 'Offers' },
] as const;

type TabId = typeof TABS[number]['id'];

export default function InvoicePage() {
  const [activeTab, setActiveTab] = useState<TabId>('fleet');
  const [isLoading, setIsLoading] = useState(false);

  const handleTabChange = useCallback((tabId: TabId) => {
    setActiveTab(tabId);
  }, []);

  const handleRefresh = useCallback(() => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1200);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50/40">
      <main className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
              type="button"
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 text-green-700 hover:bg-green-100 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Sticky Tabs - stays pinned to top of viewport while scrolling */}
        <div className="sticky top-18 z-50 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-2 mb-6 bg-emerald-50/95 backdrop-blur-md border-b border-green-200/70 shadow-sm">
          <div className="flex space-x-10 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                aria-current={activeTab === tab.id ? 'page' : undefined}
                className={`pb-3 pt-1 px-2 text-base font-medium transition-all whitespace-nowrap border-b-2 cursor-pointer ${
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

        {/* Tab Content */}
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl shadow-sm border border-green-100/50 p-6 md:p-8 min-h-[600px]">
          {activeTab === 'fleet' && (
            <div key="fleet">
              <h2 className="text-2xl font-bold text-green-800 mb-6">Fleet Management</h2>
              <FleetComponent />
            </div>
          )}

          {activeTab === 'clients' && (
            <div key="clients">
              <h2 className="text-2xl font-bold text-green-800 mb-6">Clients</h2>
              <ClientsPage />
            </div>
          )}

          {activeTab === 'invoices' && (
            <div key="invoices">
              <h2 className="text-2xl font-bold text-green-800 mb-6">All Invoices</h2>
              <InvoiceManagementPage />
            </div>
          )}

          {activeTab === 'offers' && (
            <div key="offers">
              <h2 className="text-2xl font-bold text-green-800 mb-6">Offers</h2>
              <OffersPage />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}