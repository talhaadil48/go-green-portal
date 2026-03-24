'use client';

import React, { useEffect, useState } from 'react';
import api from "@/lib/axios";
import {
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Car,
  Hash,
  Loader2,
  AlertCircle,
  Building2,
  FileText,
  Gauge
} from 'lucide-react';

interface SummaryData {
  claim: {
    claim_id: string;
    claimant_name: string;
    claim_type: string;
    claim_start_date: string;
    status: string;
    closed_date: string | null;
    closed_by: string | null;
    recently_deleted: boolean;
  };
  accident_claim?: {
    checklist_vd?: boolean;
    driver_full_name?: string;
    driver_email?: string;
    driver_telephone?: string;
    driver_address?: string;
    driver_postcode?: string;
    driver_dob?: string;
    driver_ni_number?: string;
    driver_occupation?: string;
    client_vehicle_make?: string;
    client_vehicle_model?: string;
    client_registration?: string;
    client_policy_no?: string;
    client_cover_type?: string;
    client_policy_holder?: string;
  };
  rental_agreement?: {
    hire_vehicle_reg?: string;
    hire_vehicle_make?: string;
    hire_vehicle_model?: string;
    hire_vehicle_date_out?: string;
    hire_vehicle_date_in?: string;
    hire_vehicle_miles_out?: number;
    hire_vehicle_miles_in?: number;
    change_vehicle_history?: Array<{
      date_in?: string;
      fuel_in?: string;
      date_out?: string;
      fuel_out?: string;
      vehicle_reg?: string;
      vehicle_make?: string;
      vehicle_group?: string;
      vehicle_model?: string;
      miles_out?: string;
      miles_in?: string;
    }>;
  };
  storage_form?: { storage_location_key?: string | null } | null;
  invoices?: Array<{
    id: number;
    invoice_datetime: string;
    info: string;
    storage_bill: number | null;
    rent_bill: number | null;
  }>;
}

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

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Inter:wght@400;500;600;700&family=Roboto+Mono:wght@500;600&display=swap');

  :root {
    --sr-bg:            #f2f5f3;
    --sr-bg2:           #e6ece8;
    --sr-white:         #ffffff;
    --sr-em:            #1b7a4c;
    --sr-em-mid:        #28a362;
    --sr-em-light:      #e4f2eb;
    --sr-em-pale:       #edf8f2;
    --sr-em-border:     #acd4be;
    --sr-text-head:     #0a1c13;
    --sr-text-body:     #1e3529;
    --sr-text-muted:    #3d5248;
    --sr-text-faint:    #5a7066;
    --sr-danger:        #c0392b;
    --sr-danger-pale:   #fdf1f0;
    --sr-danger-border: #f0b8b3;
    --sr-amber:         #c47f17;
    --sr-shadow-sm:     0 1px 4px rgba(27,122,76,0.08), 0 1px 2px rgba(0,0,0,0.05);
    --sr-shadow-md:     0 4px 20px rgba(27,122,76,0.11), 0 2px 8px rgba(0,0,0,0.05);
    --sr-r:             16px;
    --sr-r-sm:          10px;
  }

  /* ── ROOT ── */
  .sr-root {
    font-family: 'Inter', sans-serif;
    background: var(--sr-bg);
    min-height: 100vh;
    padding: 48px 32px 80px;
    color: var(--sr-text-body);
  }

  .sr-inner {
    max-width: 1440px;
    margin: 0 auto;
  }

  .sr-center {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    gap: 20px;
    height: 400px;
    text-align: center;
    font-size: 16px;
  }

  /* Header, Cards, Grid, etc. — all your original styles */
  .sr-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 40px;
    gap: 20px;
  }

  .sr-logo {
    display: inline-flex;
    width: 48px;
    height: 48px;
    background: var(--sr-em);
    border-radius: var(--sr-r-sm);
    align-items: center;
    justify-content: center;
    margin-bottom: 12px;
  }

  .sr-title {
    font-family: 'Sora', sans-serif;
    font-size: 42px;
    font-weight: 800;
    color: var(--sr-text-head);
    margin: 0;
    padding: 0;
    letter-spacing: -0.02em;
  }

  .sr-ref {
    font-size: 14px;
    color: var(--sr-text-muted);
    margin: 8px 0 0;
    padding: 0;
    font-weight: 500;
  }

  .sr-ref em {
    font-style: normal;
    color: var(--sr-em);
    font-weight: 700;
    font-family: 'Roboto Mono', monospace;
  }

  .sr-badge {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    background: var(--sr-em-pale);
    border: 1.5px solid var(--sr-em-border);
    color: var(--sr-em);
    padding: 10px 16px;
    border-radius: var(--sr-r-sm);
    font-size: 13px;
    font-weight: 600;
    text-transform: capitalize;
  }

  .sr-badge.sr-badge-deleted {
    background: var(--sr-danger-pale);
    border-color: var(--sr-danger-border);
    color: var(--sr-danger);
  }

  .sr-grid {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .sr-section {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  @media (max-width: 1024px) {
    .sr-section { grid-template-columns: 1fr; }
  }

  @media (max-width: 640px) {
    .sr-section { grid-template-columns: 1fr; }
    .sr-title { font-size: 28px; }
  }

  .sr-section-title {
    font-family: 'Sora', sans-serif;
    font-size: 20px;
    font-weight: 700;
    color: var(--sr-text-head);
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 2px solid var(--sr-em-border);
  }

  .sr-card {
    background: var(--sr-white);
    border: 1px solid #e0e6e3;
    border-radius: var(--sr-r);
    padding: 24px;
    box-shadow: var(--sr-shadow-sm);
  }

  .sr-card-em {
    border-color: var(--sr-em-border);
    background: linear-gradient(135deg, rgba(232, 247, 241, 0.5), var(--sr-white));
  }

  .sr-chead {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
  }

  .sr-clabel {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .sr-cicon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: var(--sr-em-light);
    border-radius: 8px;
    color: var(--sr-em);
  }

  .sr-ctitle {
    font-family: 'Sora', sans-serif;
    font-size: 16px;
    font-weight: 700;
    color: var(--sr-text-head);
  }

  .sr-sublabel {
    display: block;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--sr-text-faint);
    margin-bottom: 10px;
  }

  .sr-div {
    height: 1px;
    background: var(--sr-em-border);
    margin: 16px 0;
  }

  .sr-flabel {
    display: block;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--sr-text-faint);
    margin-bottom: 6px;
  }

  .sr-fv-nm {
    font-family: 'Sora', sans-serif;
    font-size: 20px;
    font-weight: 700;
    color: var(--sr-text-head);
    letter-spacing: -0.01em;
    word-break: break-word;
  }

  .sr-compact {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .sr-compact-row {
    display: flex;
    gap: 8px;
    align-items: flex-start;
  }

  .sr-compact-label {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--sr-text-faint);
    margin: 0;
  }

  .sr-compact-value {
    font-size: 13px;
    font-weight: 600;
    color: var(--sr-text-body);
    word-break: break-word;
  }

  .sr-invoice-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 12px;
  }

  .sr-invoice-table thead {
    background: var(--sr-em-pale);
    border: 1px solid var(--sr-em-border);
  }

  .sr-invoice-table th {
    padding: 10px 12px;
    text-align: left;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--sr-text-faint);
    border-bottom: 1px solid var(--sr-em-border);
  }

  .sr-invoice-table td {
    padding: 10px 12px;
    font-size: 12px;
    color: var(--sr-text-body);
    border-bottom: 1px solid #e0e6e3;
  }

  .sr-check {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px;
    background: var(--sr-em-pale);
    border-radius: 8px;
    border: 1px solid var(--sr-em-border);
  }

  .sr-cdot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
    margin-top: 6px;
    background: var(--sr-em);
  }

  .sr-ctext {
    font-size: 13px;
    font-weight: 600;
    color: var(--sr-text-body);
  }

  .sr-csub {
    font-size: 11px;
    color: var(--sr-text-faint);
    margin-top: 2px;
  }

  .sr-spin {
    width: 32px;
    height: 32px;
    border: 3px solid rgba(27, 122, 76, 0.1);
    border-top-color: var(--sr-em);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

export default function SummaryPage({ claimId }: { claimId: string }) {
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get(`/api/summary/${claimId}`, {
          headers: { requiresAuth: true }
        });
        setData(res.data);
      } catch (e) {
        console.error("[SummaryPage] API Error:", e);
        setError("Failed to load summary");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [claimId]);

  const fmt = (d: string | null | undefined): string => {
    if (!d) return "—";
    try {
      return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }).format(new Date(d));
    } catch {
      return "—";
    }
  };

  if (loading) {
    return (
      <>
        <style>{styles}</style>
        <div className="sr-center">
          <Loader2 size={32} className="animate-spin" style={{ color: 'var(--sr-em)' }} />
          <p>Loading summary...</p>
        </div>
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <style>{styles}</style>
        <div className="sr-center" style={{ color: 'var(--sr-danger)' }}>
          <AlertCircle size={32} />
          <p>{error || "Unable to load summary"}</p>
        </div>
      </>
    );
  }

  const claim = data.claim;
  const accident = data.accident_claim;
  const rental = data.rental_agreement;
  const storageKey = data.storage_form?.storage_location_key || "addr1";
  const storage = storageLocations[storageKey] || storageLocations.addr1;
  const invoices = data.invoices || [];

  return (
    <>
      <style>{styles}</style>
      <div className="sr-root">
        <div className="sr-inner">
          {/* HEADER */}
          <header className="sr-header">
            <div>
              <div className="sr-logo">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <h1 className="sr-title">Claim Summary</h1>
              <p className="sr-ref">Reference <em>#{claim.claim_id || "—"}</em></p>
            </div>

            <div className={`sr-badge ${claim.recently_deleted ? 'sr-badge-deleted' : ''}`}>
              <span className="sr-dot" />
              {claim.recently_deleted ? 'Recently Deleted' : (claim.status || "—")}
            </div>
          </header>

          {/* MAIN GRID */}
          <div className="sr-grid">

            {/* ===== SECTION 1: CLAIMANT & VEHICLE DETAILS ===== */}
            <div>
              <h2 className="sr-section-title">Claimant & Vehicle Details</h2>
              <div className="sr-section">
                {/* Claimant Details Card */}
                <div className="sr-card sr-card-em">
                  <div className="sr-chead">
                    <div className="sr-clabel">
                      <div className="sr-cicon">
                        <User size={18} />
                      </div>
                      <span className="sr-ctitle">Claimant Details</span>
                    </div>
                  </div>

                  {accident ? (
                    <div className="sr-compact" style={{ gap: '16px' }}>
                      <div>
                        <span className="sr-flabel">Full Name</span>
                        <div className="sr-fv-nm" style={{ textTransform: 'uppercase' }}>
                          {accident.driver_full_name || "—"}
                        </div>
                      </div>

                      <div className="sr-compact">
                        {accident.driver_email && (
                          <div className="sr-compact-row">
                            <Mail size={14} className="sr-icon-sm" />
                            <div>
                              <span className="sr-compact-label">Email</span>
                              <div className="sr-compact-value">{accident.driver_email}</div>
                            </div>
                          </div>
                        )}
                        {accident.driver_telephone && (
                          <div className="sr-compact-row">
                            <Phone size={14} className="sr-icon-sm" />
                            <div>
                              <span className="sr-compact-label">Phone</span>
                              <div className="sr-compact-value">{accident.driver_telephone}</div>
                            </div>
                          </div>
                        )}
                        {accident.driver_dob && (
                          <div className="sr-compact-row">
                            <Calendar size={14} className="sr-icon-sm" />
                            <div>
                              <span className="sr-compact-label">DOB</span>
                              <div className="sr-compact-value">{fmt(accident.driver_dob)}</div>
                            </div>
                          </div>
                        )}
                        {accident.driver_address && (
                          <div className="sr-compact-row">
                            <MapPin size={14} className="sr-icon-sm" />
                            <div>
                              <span className="sr-compact-label">Address</span>
                              <div className="sr-compact-value">{accident.driver_address}</div>
                            </div>
                          </div>
                        )}
                        {accident.driver_postcode && (
                          <div className="sr-compact-row">
                            <Hash size={14} className="sr-icon-sm" />
                            <div>
                              <span className="sr-compact-label">Postcode</span>
                              <div className="sr-compact-value">{accident.driver_postcode}</div>
                            </div>
                          </div>
                        )}
                        {accident.driver_occupation && (
                          <div className="sr-compact-row">
                            <User size={14} className="sr-icon-sm" />
                            <div>
                              <span className="sr-compact-label">Occupation</span>
                              <div className="sr-compact-value">{accident.driver_occupation}</div>
                            </div>
                          </div>
                        )}
                        {accident.driver_ni_number && (
                          <div className="sr-compact-row">
                            <Hash size={14} className="sr-icon-sm" />
                            <div>
                              <span className="sr-compact-label">NI Number</span>
                              <div className="sr-compact-value">{accident.driver_ni_number}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p style={{ color: 'var(--sr-text-faint)', fontSize: '12px' }}>
                      No claimant details available
                    </p>
                  )}
                </div>

                {/* Client Vehicle Details Card */}
                <div className="sr-card">
                  <div className="sr-chead">
                    <div className="sr-clabel">
                      <div className="sr-cicon">
                        <Car size={18} />
                      </div>
                      <span className="sr-ctitle">Client Vehicle Details</span>
                    </div>
                  </div>

                  {accident ? (
                    <div className="sr-compact" style={{ gap: '16px' }}>
                      <div>
                        <span className="sr-sublabel">Vehicle Information</span>
                        <div className="sr-compact">
                          {accident.client_vehicle_make && (
                            <div className="sr-compact-row">
                              <Car size={14} className="sr-icon-sm" />
                              <div>
                                <span className="sr-compact-label">Make</span>
                                <div className="sr-compact-value">{accident.client_vehicle_make}</div>
                              </div>
                            </div>
                          )}
                          {accident.client_vehicle_model && (
                            <div className="sr-compact-row">
                              <Car size={14} className="sr-icon-sm" />
                              <div>
                                <span className="sr-compact-label">Model</span>
                                <div className="sr-compact-value">{accident.client_vehicle_model}</div>
                              </div>
                            </div>
                          )}
                          {accident.client_registration && (
                            <div className="sr-compact-row">
                              <Hash size={14} className="sr-icon-sm" />
                              <div>
                                <span className="sr-compact-label">Registration</span>
                                <div className="sr-compact-value">{accident.client_registration}</div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="sr-div" />

                      <div>
                        <span className="sr-sublabel">Policy Information</span>
                        <div className="sr-compact">
                          {accident.client_policy_no && (
                            <div className="sr-compact-row">
                              <Hash size={14} className="sr-icon-sm" />
                              <div>
                                <span className="sr-compact-label">Policy No</span>
                                <div className="sr-compact-value">{accident.client_policy_no}</div>
                              </div>
                            </div>
                          )}
                          {accident.client_policy_holder && (
                            <div className="sr-compact-row">
                              <User size={14} className="sr-icon-sm" />
                              <div>
                                <span className="sr-compact-label">Policy Holder</span>
                                <div className="sr-compact-value">{accident.client_policy_holder}</div>
                              </div>
                            </div>
                          )}
                          {accident.client_cover_type && (
                            <div className="sr-compact-row">
                              <FileText size={14} className="sr-icon-sm" />
                              <div>
                                <span className="sr-compact-label">Cover Type</span>
                                <div className="sr-compact-value">{accident.client_cover_type}</div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p style={{ color: 'var(--sr-text-faint)', fontSize: '12px' }}>
                      No vehicle details available
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* ===== SECTION 2: HIRE VEHICLES ===== */}
            {rental && (
              <div>
                <h2 className="sr-section-title">Hire Vehicles</h2>
                <div className="sr-section">
                  {/* Main Hire Vehicle */}
                  <div className="sr-card sr-card-em">
                    <div className="sr-chead">
                      <div className="sr-clabel">
                        <div className="sr-cicon">
                          <Car size={18} />
                        </div>
                        <span className="sr-ctitle">Hire Vehicle Details</span>
                      </div>
                    </div>

                    <div className="sr-compact" style={{ gap: '16px' }}>
                      {rental.hire_vehicle_reg && (
                        <div>
                          <span className="sr-flabel">Registration</span>
                          <div className="sr-fv-nm">{rental.hire_vehicle_reg}</div>
                        </div>
                      )}

                      <div className="sr-compact">
                        {(rental.hire_vehicle_make || rental.hire_vehicle_model) && (
                          <div className="sr-compact-row">
                            <Car size={14} className="sr-icon-sm" />
                            <div>
                              <span className="sr-compact-label">Vehicle</span>
                              <div className="sr-compact-value">
                                {rental.hire_vehicle_make} {rental.hire_vehicle_model}
                              </div>
                            </div>
                          </div>
                        )}
                        {rental.hire_vehicle_date_out && (
                          <div className="sr-compact-row">
                            <Calendar size={14} className="sr-icon-sm" />
                            <div>
                              <span className="sr-compact-label">Date Out</span>
                              <div className="sr-compact-value">{fmt(rental.hire_vehicle_date_out)}</div>
                            </div>
                          </div>
                        )}
                        {rental.hire_vehicle_date_in && (
                          <div className="sr-compact-row">
                            <Calendar size={14} className="sr-icon-sm" />
                            <div>
                              <span className="sr-compact-label">Date In</span>
                              <div className="sr-compact-value">{fmt(rental.hire_vehicle_date_in)}</div>
                            </div>
                          </div>
                        )}
                        {rental.hire_vehicle_miles_out && (
                          <div className="sr-compact-row">
                            <Hash size={14} className="sr-icon-sm" />
                            <div>
                              <span className="sr-compact-label">Miles Out</span>
                              <div className="sr-compact-value">{rental.hire_vehicle_miles_out}</div>
                            </div>
                          </div>
                        )}
                        {rental.hire_vehicle_miles_in && (
                          <div className="sr-compact-row">
                            <Hash size={14} className="sr-icon-sm" />
                            <div>
                              <span className="sr-compact-label">Miles In</span>
                              <div className="sr-compact-value">{rental.hire_vehicle_miles_in}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Change of Hire Vehicles */}
                  <div className="sr-card">
                    <div className="sr-chead">
                      <div className="sr-clabel">
                        <div className="sr-cicon">
                          <Car size={18} />
                        </div>
                        <span className="sr-ctitle">Vehicle Changes</span>
                      </div>
                    </div>

                    {rental.change_vehicle_history && rental.change_vehicle_history.length > 0 ? (
                      <div className="sr-compact" style={{ gap: '20px' }}>
                        {rental.change_vehicle_history.map((change, idx) => (
                          <div key={idx}>
                            {/* Vehicle Header */}
                            <div style={{
                              background: 'var(--sr-em-pale)',
                              padding: '12px',
                              borderRadius: '8px',
                              borderLeft: '3px solid var(--sr-em)',
                              marginBottom: '12px'
                            }}>
                              <div className="sr-flabel">Change #{idx + 1}</div>
                              <div className="sr-fv-nm" style={{ fontSize: '16px', marginTop: '6px' }}>
                                {change.vehicle_make} {change.vehicle_model}
                              </div>
                              {change.vehicle_reg && (
                                <div style={{
                                  fontFamily: "'Roboto Mono', monospace",
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  color: 'var(--sr-em)',
                                  marginTop: '4px'
                                }}>
                                  {change.vehicle_reg}
                                </div>
                              )}
                            </div>

                            {/* Compact Details - Only Date & Miles */}
                            <div className="sr-compact" style={{ fontSize: '12.5px', marginLeft: '8px', gap: '10px' }}>
                              {change.date_out && (
                                <div className="sr-compact-row">
                                  <Calendar size={12} className="sr-icon-sm" />
                                  <div>
                                    <span className="sr-compact-label">Date Out</span>
                                    <div className="sr-compact-value">{fmt(change.date_out)}</div>
                                  </div>
                                </div>
                              )}

                              {change.date_in && (
                                <div className="sr-compact-row">
                                  <Calendar size={12} className="sr-icon-sm" />
                                  <div>
                                    <span className="sr-compact-label">Date In</span>
                                    <div className="sr-compact-value">{fmt(change.date_in)}</div>
                                  </div>
                                </div>
                              )}

                              {change.miles_out && (
                                <div className="sr-compact-row">
                                  <Gauge size={12} className="sr-icon-sm" />
                                  <div>
                                    <span className="sr-compact-label">Miles Out</span>
                                    <div className="sr-compact-value">{change.miles_out.toLocaleString()}</div>
                                  </div>
                                </div>
                              )}

                              {change.miles_in && (
                                <div className="sr-compact-row">
                                  <Gauge size={12} className="sr-icon-sm" />
                                  <div>
                                    <span className="sr-compact-label">Miles In</span>
                                    <div className="sr-compact-value">{change.miles_in.toLocaleString()}</div>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Divider between changes */}
                            {idx < rental.change_vehicle_history.length - 1 && (
                              <div className="sr-div" style={{ margin: '20px 0' }} />
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ color: 'var(--sr-text-faint)', fontSize: '12px' }}>
                        No vehicle changes recorded
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
            {/* ===== SECTION 3: STORAGE, INVOICES & CHECKLIST ===== */}
            <div>
              <h2 className="sr-section-title">Storage, Invoices & Checklist</h2>

              <div className="sr-section">
                {/* Storage Location */}
                <div className="sr-card">
                  <div className="sr-chead">
                    <div className="sr-clabel">
                      <div className="sr-cicon">
                        <Building2 size={16} />
                      </div>
                      <span className="sr-ctitle">Storage Location</span>
                    </div>
                  </div>

                  <div style={{
                    background: 'var(--sr-em-pale)',
                    border: '1px solid var(--sr-em-border)',
                    borderRadius: '8px',
                    padding: '12px 14px',
                  }}>
                    <div className="sr-fv-nm" style={{ fontSize: '17px', marginBottom: '4px', color: 'var(--sr-em)' }}>
                      {storage.name}
                    </div>
                    <div style={{ fontSize: '13px', marginBottom: '2px', color: 'var(--sr-text-body)' }}>
                      {storage.city}
                    </div>
                    <div style={{
                      fontFamily: "'Roboto Mono', monospace",
                      fontSize: '12.5px',
                      fontWeight: 600,
                      color: 'var(--sr-em)',
                      letterSpacing: '0.05em'
                    }}>
                      {storage.postcode}
                    </div>
                  </div>
                  {accident?.checklist_vd && (
                    <>
                      <div className="sr-div" />
                      <div>
                        <div className="sr-chead" style={{ marginBottom: '8px' }}>
                          <div className="sr-clabel">
                            <div className="sr-cicon">
                              <FileText size={16} />
                            </div>
                            <span className="sr-ctitle">Checklist</span>
                          </div>
                        </div>
                        <div className="sr-check">
                          <div className="sr-cdot" />
                          <div>
                            <div className="sr-ctext">Vehicle Damage </div>
                            <div className="sr-csub text-xs">Yes</div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                </div>

                {/* Invoices & Checklist */}
                <div className="sr-card">
                  <div className="sr-compact" style={{ gap: '16px' }}>
                    {/* Invoices */}
                    <div>
                      <div className="sr-chead" style={{ marginBottom: '8px' }}>
                        <div className="sr-clabel">
                          <div className="sr-cicon">
                            <FileText size={16} />
                          </div>
                          <span className="sr-ctitle">Invoices</span>
                        </div>
                      </div>

                      {invoices.length > 0 ? (
                        <table className="sr-invoice-table text-sm">
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th>Info</th>
                              <th>Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {invoices.map((inv) => (
                              <tr key={inv.id}>
                                <td className="py-1">{fmt(inv.invoice_datetime)}</td>
                                <td className="py-1">{inv.info || "—"}</td>
                                <td className="py-1 font-medium">
                                  <td className="py-1 font-medium">
                                    £{(
                                      Number(inv.storage_bill || 0) + Number(inv.rent_bill || 0)
                                    ).toFixed(2)}
                                  </td>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p style={{ color: 'var(--sr-text-faint)', fontSize: '12px', marginTop: '6px' }}>
                          No invoices available
                        </p>
                      )}
                    </div>

                    {/* Checklist VD */}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
