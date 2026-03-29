'use client';

import React, { useEffect, useState } from 'react';
import api from "@/lib/axios";
import Cookies from 'js-cookie';
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
  FileText,
  Gauge,
  Trash2
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
    client_vehicle_make?: string;
    client_vehicle_model?: string;
    client_registration?: string;
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
      date_out?: string;
      vehicle_reg?: string;
      vehicle_make?: string;
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
    --sr-white:         #ffffff;
    --sr-em:            #1b7a4c;
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
    --sr-r:             16px;
    --sr-r-sm:          10px;
  }

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

  .sr-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 40px;
    gap: 20px;
  }

  .sr-logo {
    width: 48px;
    height: 48px;
    background: var(--sr-em);
    border-radius: var(--sr-r-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 24px;
  }

  .sr-title {
    font-family: 'Sora', sans-serif;
    font-size: 42px;
    font-weight: 800;
    color: var(--sr-text-head);
    margin: 0;
    letter-spacing: -0.02em;
  }

  .sr-ref {
    font-size: 14px;
    color: var(--sr-text-muted);
    margin: 8px 0 0;
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
    box-shadow: 0 1px 4px rgba(0,0,0,0.05);
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
    width: 32px;
    height: 32px;
    background: var(--sr-em-light);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
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
    background: var(--sr-em);
    margin-top: 6px;
    flex-shrink: 0;
  }

  .sr-ctext {
    font-size: 13px;
    font-weight: 600;
    color: var(--sr-text-body);
  }

  .sr-delete-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: var(--sr-danger);
    color: white;
    padding: 10px 18px;
    border-radius: var(--sr-r-sm);
    font-size: 13px;
    font-weight: 600;
    border: none;
    cursor: pointer;
  }
  .sr-delete-btn:hover {
    background: #a12c22;
  }
`;

export default function SummaryPage({ claimId }: { claimId: string }) {
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUsername] = useState<string | null>(null);

  // Get username from cookie
  useEffect(() => {
    const getCurrentUsername = (): string | null => {
      try {
        const userData = Cookies.get("user");
        if (!userData) return null;
        const parsed = JSON.parse(userData);
        return parsed?.username || null;
      } catch {
        return null;
      }
    };
    setUsername(getCurrentUsername());
  }, []);

  // Fetch summary
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

  // Soft Delete Function
  const handleSoftDelete = async () => {
    if (!userName) {
      alert("User session not found. Please log in again.");
      return;
    }

    const confirmationPassword = prompt(
      "Security Confirmation\n\nPlease enter the confirmation password to proceed."
    );
    if (!confirmationPassword) return;
    if (confirmationPassword !== "12345678") {
      alert("Incorrect confirmation password.");
      return;
    }

    if (!window.confirm(`You want to soft delete claim ${claimId}?`)) return;

    try {
      await api.put(
        `/api/claims/${claimId}/soft-delete`,
        { deleted_by: userName },
        { headers: { requiresAuth: true } }
      );
      alert("Claim soft deleted successfully.");
      window.location.reload();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to soft delete claim.");
    }
  };
  if (loading) {
    return (
      <>
        <style>{styles}</style>
        <div className="flex justify-center items-center" style={{ height: '100vh' }}>
          <div className="text-center">
            <Loader2 size={40} className="animate-spin" style={{ color: 'var(--sr-em)' }} />
            <p style={{ marginTop: '20px' }}>Loading summary...</p>
          </div>
        </div>
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <style>{styles}</style>
        <div className="sr-center" style={{ height: '100vh', justifyContent: 'center', color: 'var(--sr-danger)' }}>
          <AlertCircle size={40} />
          <p style={{ marginTop: '20px' }}>{error || "Unable to load summary"}</p>
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
  const hasVehicleChanges = rental?.change_vehicle_history && rental.change_vehicle_history.length > 0;

  return (
    <>
      <style>{styles}</style>
      <div className="sr-root">
        <div className="sr-inner">

          {/* HEADER with Delete Button */}
          <header className="sr-header">
            <div>
              <h1 className="sr-title">Claim Summary</h1>
              <p className="sr-ref">Reference <em>#{claim.claim_id || "—"}</em></p>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div className={`sr-badge ${claim.recently_deleted ? 'sr-badge-deleted' : ''}`}>
                {claim.recently_deleted ? 'Recently Deleted' : (claim.status || "—")}
              </div>

              {!claim.recently_deleted && (
                <button
                  onClick={handleSoftDelete}
                  className="sr-delete-btn"
                >
                  <Trash2 size={17} />
                  Delete Claim
                </button>
              )}
            </div>
          </header>
          <div className="sr-grid">

            {/* CLAIMANT & VEHICLE DETAILS */}
            <div>
              <h2 className="sr-section-title">Claimant & Vehicle Details</h2>
              <div className="sr-section">

                {/* Claimant Details */}
                <div className="sr-card sr-card-em">
                  <div className="sr-chead">
                    <div className="sr-clabel">
                      <div className="sr-cicon"><User size={18} /></div>
                      <span className="sr-ctitle">Claimant Details</span>
                    </div>
                  </div>

                  {accident ? (
                    <div className="sr-compact" style={{ gap: '16px' }}>
                      <div>
                        <span className="sr-flabel">Full Name</span>
                        <div className="sr-fv-nm" style={{ textTransform: 'uppercase' }}>
                          {claim.claimant_name || "—"}
                        </div>
                      </div>

                      <div className="sr-compact">
                        {accident.driver_email && (
                          <div className="sr-compact-row">
                            <Mail size={14} />
                            <div>
                              <span className="sr-compact-label">Email</span>
                              <div className="sr-compact-value">{accident.driver_email}</div>
                            </div>
                          </div>
                        )}
                        {accident.driver_telephone && (
                          <div className="sr-compact-row">
                            <Phone size={14} />
                            <div>
                              <span className="sr-compact-label">Phone</span>
                              <div className="sr-compact-value">{accident.driver_telephone}</div>
                            </div>
                          </div>
                        )}
                        {accident.driver_dob && (
                          <div className="sr-compact-row">
                            <Calendar size={14} />
                            <div>
                              <span className="sr-compact-label">DOB</span>
                              <div className="sr-compact-value">{fmt(accident.driver_dob)}</div>
                            </div>
                          </div>
                        )}
                        {(accident.driver_address || accident.driver_postcode) && (
                          <div className="sr-compact-row">
                            <MapPin size={14} />
                            <div>
                              <span className="sr-compact-label">Address</span>
                              <div className="sr-compact-value">
                                {accident.driver_address}
                                {accident.driver_address && accident.driver_postcode && ", "}
                                {accident.driver_postcode}
                              </div>
                            </div>
                          </div>
                        )}
                        {accident.driver_ni_number && (
                          <div className="sr-compact-row">
                            <Hash size={14} />
                            <div>
                              <span className="sr-compact-label">NI Number</span>
                              <div className="sr-compact-value">{accident.driver_ni_number}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p style={{ color: 'var(--sr-text-faint)', fontSize: '12px' }}>No claimant details available</p>
                  )}
                </div>

                {/* Client Vehicle Details with PTU Storage and Vehicle Damage */}
                <div className="sr-card" style={{ position: 'relative' }}>
                  <div className="sr-chead">
                    <div className="sr-clabel">
                      <div className="sr-cicon"><Car size={18} /></div>
                      <span className="sr-ctitle">Client Vehicle Details</span>
                    </div>
                  </div>

                  {/* Vehicle Damage Badge - Top Right */}
                  {accident?.checklist_vd && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '16px',
                        right: '16px',
                        background: 'var(--sr-em)',
                        color: 'white',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                      }}
                    >
                      <div className="sr-cdot" style={{ background: 'white' }} />
                      Vehicle Damage
                    </div>
                  )}

                  {accident ? (
                    <div className="sr-compact" style={{ gap: '16px' }}>
                      <div>
                        <span className="sr-sublabel">Vehicle Information</span>
                        <div className="sr-compact">
                          {accident.client_registration && (
                            <div className="sr-compact-row">
                              <Hash size={14} />
                              <div>
                                <span className="sr-compact-label">Registration</span>
                                <div className="sr-compact-value">{accident.client_registration}</div>
                              </div>
                            </div>
                          )}
                          {accident.client_vehicle_make && (
                            <div className="sr-compact-row">
                              <Car size={14} />
                              <div>
                                <span className="sr-compact-label">Make</span>
                                <div className="sr-compact-value">{accident.client_vehicle_make}</div>
                              </div>
                            </div>
                          )}
                          {accident.client_vehicle_model && (
                            <div className="sr-compact-row">
                              <Car size={14} />
                              <div>
                                <span className="sr-compact-label">Model</span>
                                <div className="sr-compact-value">{accident.client_vehicle_model}</div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="sr-div" />

                      {/* PTU Storage Location */}
                      <div>
                        <span className="sr-sublabel">PTU Storage Location</span>
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
                      </div>
                    </div>
                  ) : (
                    <p style={{ color: 'var(--sr-text-faint)', fontSize: '12px' }}>No vehicle details available</p>
                  )}
                </div>
              </div>
            </div>


            {rental && (
              <div>
                <h2 className="sr-section-title">Hire Vehicles</h2>

                {!hasVehicleChanges ? (
                  /* Full width when no changes */
                  <div className="sr-card sr-card-em">
                    <div className="sr-chead">
                      <div className="sr-clabel">
                        <div className="sr-cicon"><Car size={18} /></div>
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
                            <Car size={14} />
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
                            <Calendar size={14} />
                            <div>
                              <span className="sr-compact-label">Date Out</span>
                              <div className="sr-compact-value">{fmt(rental.hire_vehicle_date_out)}</div>
                            </div>
                          </div>
                        )}
                        {rental.hire_vehicle_date_in && (
                          <div className="sr-compact-row">
                            <Calendar size={14} />
                            <div>
                              <span className="sr-compact-label">Date In</span>
                              <div className="sr-compact-value">{fmt(rental.hire_vehicle_date_in)}</div>
                            </div>
                          </div>
                        )}
                        {rental.hire_vehicle_miles_out && (
                          <div className="sr-compact-row">
                            <Hash size={14} />
                            <div>
                              <span className="sr-compact-label">Miles Out</span>
                              <div className="sr-compact-value">{rental.hire_vehicle_miles_out}</div>
                            </div>
                          </div>
                        )}
                        {rental.hire_vehicle_miles_in && (
                          <div className="sr-compact-row">
                            <Hash size={14} />
                            <div>
                              <span className="sr-compact-label">Miles In</span>
                              <div className="sr-compact-value">{rental.hire_vehicle_miles_in}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Two columns when there are changes */
                  <div className="sr-section">
                    {/* Hire Vehicle Details */}
                    <div className="sr-card sr-card-em">
                      <div className="sr-chead">
                        <div className="sr-clabel">
                          <div className="sr-cicon"><Car size={18} /></div>
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
                              <Car size={14} />
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
                              <Calendar size={14} />
                              <div>
                                <span className="sr-compact-label">Date Out</span>
                                <div className="sr-compact-value">{fmt(rental.hire_vehicle_date_out)}</div>
                              </div>
                            </div>
                          )}
                          {rental.hire_vehicle_date_in && (
                            <div className="sr-compact-row">
                              <Calendar size={14} />
                              <div>
                                <span className="sr-compact-label">Date In</span>
                                <div className="sr-compact-value">{fmt(rental.hire_vehicle_date_in)}</div>
                              </div>
                            </div>
                          )}
                          {rental.hire_vehicle_miles_out && (
                            <div className="sr-compact-row">
                              <Hash size={14} />
                              <div>
                                <span className="sr-compact-label">Miles Out</span>
                                <div className="sr-compact-value">{rental.hire_vehicle_miles_out}</div>
                              </div>
                            </div>
                          )}
                          {rental.hire_vehicle_miles_in && (
                            <div className="sr-compact-row">
                              <Hash size={14} />
                              <div>
                                <span className="sr-compact-label">Miles In</span>
                                <div className="sr-compact-value">{rental.hire_vehicle_miles_in}</div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Vehicle Changes */}
                    <div className="sr-card">
                      <div className="sr-chead">
                        <div className="sr-clabel">
                          <div className="sr-cicon"><Car size={18} /></div>
                          <span className="sr-ctitle">Vehicle Changes</span>
                        </div>
                      </div>

                      <div className="sr-compact" style={{ gap: '20px' }}>
                        {rental.change_vehicle_history!.map((change, idx) => (
                          <div key={idx}>
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

                            <div className="sr-compact" style={{ fontSize: '12.5px', marginLeft: '8px', gap: '10px' }}>
                              {change.date_out && (
                                <div className="sr-compact-row">
                                  <Calendar size={12} />
                                  <div>
                                    <span className="sr-compact-label">Date Out</span>
                                    <div className="sr-compact-value">{fmt(change.date_out)}</div>
                                  </div>
                                </div>
                              )}
                              {change.date_in && (
                                <div className="sr-compact-row">
                                  <Calendar size={12} />
                                  <div>
                                    <span className="sr-compact-label">Date In</span>
                                    <div className="sr-compact-value">{fmt(change.date_in)}</div>
                                  </div>
                                </div>
                              )}
                              {change.miles_out && (
                                <div className="sr-compact-row">
                                  <Gauge size={12} />
                                  <div>
                                    <span className="sr-compact-label">Miles Out</span>
                                    <div className="sr-compact-value">{change.miles_out.toLocaleString()}</div>
                                  </div>
                                </div>
                              )}
                              {change.miles_in && (
                                <div className="sr-compact-row">
                                  <Gauge size={12} />
                                  <div>
                                    <span className="sr-compact-label">Miles In</span>
                                    <div className="sr-compact-value">{change.miles_in.toLocaleString()}</div>
                                  </div>
                                </div>
                              )}
                            </div>

                            {idx < rental.change_vehicle_history!.length - 1 && (
                              <div className="sr-div" style={{ margin: '20px 0' }} />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}


            {/* INVOICES */}
            <div>
              <h2 className="sr-section-title">Invoices</h2>
              <div className="sr-card">
                <div className="sr-chead" style={{ marginBottom: '8px' }}>
                  <div className="sr-clabel">
                    <div className="sr-cicon"><FileText size={16} /></div>
                    <span className="sr-ctitle">Invoices</span>
                  </div>
                </div>

                {invoices.length > 0 ? (
                  <table className="sr-invoice-table">
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
                          <td>{fmt(inv.invoice_datetime)}</td>
                          <td>{inv.info || "—"}</td>
                          <td className="font-medium">
                            £{(Number(inv.storage_bill || 0) + Number(inv.rent_bill || 0)).toFixed(2)}
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
            </div>

          </div>
        </div>
      </div>
    </>
  );
}