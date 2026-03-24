'use client';

import React, { useEffect, useState } from 'react';
import api from "@/lib/axios";

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
  accident_claim?: { checklist_vd?: boolean };
  rental_agreement?: {
    hire_vehicle_reg: string;
    hire_vehicle_make: string;
    hire_vehicle_model: string;
    hire_vehicle_date_out: string;
    hire_vehicle_date_in: string;
    change_vehicle_history?: Array<{
      date_in: string; date_out: string;
      vehicle_reg: string; vehicle_make: string; vehicle_model: string;
    }>;
  };
  storage_form?: { storage_location_key: string | null };
  invoices?: Array<{ id: number; invoice_datetime: string; info: string; storage_bill: any; rent_bill: any }>;
}

const storageLocations: Record<string, { name: string; city: string; postcode: string }> = {
  addr1: { name: "LITTLE BURTON EAST", city: "Burton-on-Trent, Staffordshire", postcode: "DE14 1PS" },
  addr2: { name: "Placeholder Location", city: "City, County", postcode: "XX00 0XX" },
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
    position: relative;
    box-sizing: border-box;
  }
  .sr-root *, .sr-root *::before, .sr-root *::after {
    box-sizing: border-box;
  }
  .sr-root::before {
    content: '';
    position: fixed; inset: 0;
    background-image: radial-gradient(circle, rgba(27,122,76,0.10) 1px, transparent 1px);
    background-size: 30px 30px;
    pointer-events: none; z-index: 0;
    opacity: 0.45;
  }

  .sr-inner { max-width: 1160px; margin: 0 auto; position: relative; z-index: 1; }

  /* ── HEADER ── */
  .sr-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 24px;
    margin-bottom: 44px;
    flex-wrap: wrap;
  }
  .sr-logo {
    width: 44px; height: 44px;
    background: var(--sr-em);
    border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 14px;
    box-shadow: 0 4px 14px rgba(27,122,76,0.30);
    flex-shrink: 0;
  }
  .sr-logo svg {
    width: 22px; height: 22px;
    fill: none; stroke: #fff;
    stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round;
  }
  .sr-title {
    font-family: 'Sora', sans-serif;
    font-size: 42px; font-weight: 800; line-height: 1.05;
    color: var(--sr-text-head); letter-spacing: -0.02em;
    margin: 0; padding: 0;
  }
  .sr-ref {
    font-family: 'Roboto Mono', monospace;
    font-size: 13px; font-weight: 500;
    color: var(--sr-text-muted); margin-top: 8px; letter-spacing: 0.04em;
    margin-bottom: 0; padding: 0;
  }
  .sr-ref em { font-style: normal; color: var(--sr-em); font-weight: 600; }

  .sr-badge {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 10px 20px; border-radius: 100px;
    font-family: 'Inter', sans-serif;
    font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
    border: 2px solid; align-self: flex-start; flex-shrink: 0;
  }
  .sr-badge-active  { background: var(--sr-em-pale);    color: var(--sr-em);      border-color: var(--sr-em-border); }
  .sr-badge-deleted { background: var(--sr-danger-pale); color: var(--sr-danger);  border-color: var(--sr-danger-border); }
  .sr-dot {
    width: 7px; height: 7px; border-radius: 50%; background: currentColor;
    animation: sr-blink 2.4s ease-in-out infinite;
    flex-shrink: 0;
  }
  @keyframes sr-blink { 0%,100%{opacity:1} 50%{opacity:.15} }

  /* ── GRID ── */
  .sr-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
  }
  @media(max-width:1024px) {
    .sr-grid { grid-template-columns: repeat(2, 1fr); }
    .sr-w2   { grid-column: span 2; }
    .sr-tall { grid-row: span 1; }
  }
  @media(max-width:640px) {
    .sr-grid  { grid-template-columns: 1fr; }
    .sr-w2    { grid-column: span 1; }
    .sr-title { font-size: 28px; }
  }

  /* ── CARD ── */
  .sr-card {
    background: var(--sr-white);
    border: 1.5px solid rgba(27,122,76,0.12);
    border-radius: var(--sr-r);
    padding: 26px 28px;
    box-shadow: var(--sr-shadow-sm);
    transition: box-shadow .25s ease, transform .2s ease;
    position: relative; overflow: hidden;
    animation: sr-fadeUp .35s ease both;
  }
  .sr-card:hover { box-shadow: var(--sr-shadow-md); transform: translateY(-2px); }
  .sr-card-em::after {
    content: ''; position: absolute;
    top: 0; left: 20px; right: 20px; height: 3px;
    background: linear-gradient(90deg, var(--sr-em), var(--sr-em-mid));
    border-radius: 0 0 4px 4px;
  }
  .sr-w2   { grid-column: span 2; }
  .sr-tall { grid-row: span 2; }

  @keyframes sr-fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
  .sr-card:nth-child(1){animation-delay:.04s}
  .sr-card:nth-child(2){animation-delay:.09s}
  .sr-card:nth-child(3){animation-delay:.14s}
  .sr-card:nth-child(4){animation-delay:.19s}
  .sr-card:nth-child(5){animation-delay:.24s}

  /* ── CARD HEADER ── */
  .sr-chead {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 22px; gap: 10px;
  }
  .sr-clabel { display: flex; align-items: center; gap: 10px; }
  .sr-cicon {
    width: 32px; height: 32px; border-radius: 8px;
    background: var(--sr-em-light);
    display: flex; align-items: center; justify-content: center;
    font-size: 14px; flex-shrink: 0;
  }
  .sr-ctitle {
    font-family: 'Inter', sans-serif;
    font-size: 11px; font-weight: 700; letter-spacing: 0.16em;
    text-transform: uppercase; color: var(--sr-text-muted);
    margin: 0; padding: 0;
  }

  /* ── FIELDS GRID ── */
  .sr-fields     { display: grid; grid-template-columns: 1fr 1fr; gap: 18px 28px; }
  .sr-fields-one { display: grid; grid-template-columns: 1fr;     gap: 16px; }

  /* ── FIELD LABEL ── */
  .sr-flabel {
    font-family: 'Inter', sans-serif;
    font-size: 10px; font-weight: 700; letter-spacing: 0.20em;
    text-transform: uppercase; color: var(--sr-text-faint);
    display: block; margin: 0 0 5px 0; padding: 0;
  }

  /* ── FIELD VALUES — all fully namespaced, no inheritance dependency ── */
  .sr-fv {
    font-family: 'Inter', sans-serif !important;
    font-size: 18px !important; font-weight: 700 !important;
    color: var(--sr-text-head) !important; line-height: 1.25 !important;
    margin: 0 !important; padding: 0 !important;
  }
  .sr-fv-nm {
    font-family: 'Sora', sans-serif !important;
    font-size: 28px !important; font-weight: 700 !important;
    color: var(--sr-text-head) !important; line-height: 1.2 !important;
    letter-spacing: -0.01em !important;
    margin: 0 !important; padding: 0 !important;
  }
  .sr-fv-mn {
    font-family: 'Roboto Mono', monospace !important;
    font-size: 22px !important; font-weight: 600 !important;
    color: var(--sr-em) !important; letter-spacing: 0.05em !important;
    margin: 0 !important; padding: 0 !important;
  }
  .sr-fv-sm {
    font-family: 'Inter', sans-serif !important;
    font-size: 15px !important; font-weight: 600 !important;
    color: var(--sr-text-body) !important; line-height: 1.3 !important;
    margin: 0 !important; padding: 0 !important;
  }
  .sr-fv-err {
    font-family: 'Inter', sans-serif !important;
    font-size: 15px !important; font-weight: 600 !important;
    color: var(--sr-danger) !important; line-height: 1.3 !important;
    margin: 0 !important; padding: 0 !important;
  }

  /* ── DIVIDER ── */
  .sr-div { height: 1.5px; background: var(--sr-bg2); margin: 20px 0; border: none; }

  /* ── STORAGE BOX ── */
  .sr-store {
    background: var(--sr-em-pale);
    border: 1.5px solid var(--sr-em-border);
    border-radius: var(--sr-r-sm);
    padding: 18px 20px;
  }
  .sr-store-name {
    font-family: 'Sora', sans-serif !important;
    font-size: 18px !important; font-weight: 700 !important;
    color: var(--sr-em) !important; letter-spacing: -0.01em !important;
    margin: 0 !important; padding: 0 !important;
  }
  .sr-store-city {
    font-family: 'Inter', sans-serif !important;
    font-size: 14px !important; font-weight: 500 !important;
    color: var(--sr-text-body) !important; margin: 5px 0 0 !important; padding: 0 !important;
  }
  .sr-store-post {
    font-family: 'Roboto Mono', monospace !important;
    font-size: 12px !important; font-weight: 600 !important;
    color: var(--sr-text-muted) !important; margin: 9px 0 0 !important;
    letter-spacing: 0.07em !important; padding: 0 !important;
  }

  /* ── CHECKLIST ── */
  .sr-check {
    display: flex; align-items: center; gap: 12px;
    padding: 14px 16px;
    background: var(--sr-bg);
    border: 1.5px solid rgba(27,122,76,0.12);
    border-radius: var(--sr-r-sm);
  }
  .sr-cdot        { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  .sr-cdot-ok     { background: var(--sr-em-mid);  box-shadow: 0 0 0 3px rgba(40,163,98,.20); }
  .sr-cdot-pnd    { background: var(--sr-amber);    box-shadow: 0 0 0 3px rgba(196,127,23,.20); }
  .sr-ctext {
    font-family: 'Inter', sans-serif !important;
    font-size: 14px !important; font-weight: 700 !important;
    color: var(--sr-text-head) !important;
    margin: 0 !important; padding: 0 !important;
  }
  .sr-csub {
    font-family: 'Inter', sans-serif !important;
    font-size: 12px !important; font-weight: 500 !important;
    color: var(--sr-text-muted) !important; margin: 2px 0 0 !important; padding: 0 !important;
  }

  /* ── VEHICLE HISTORY ── */
  .sr-hrow {
    display: flex; justify-content: space-between; align-items: center;
    padding: 12px 14px;
    background: var(--sr-bg);
    border: 1.5px solid rgba(27,122,76,0.10);
    border-radius: var(--sr-r-sm);
    margin-bottom: 8px;
    transition: border-color .2s;
  }
  .sr-hrow:hover { border-color: var(--sr-em-border); }
  .sr-hreg {
    font-family: 'Roboto Mono', monospace !important;
    font-size: 14px !important; font-weight: 600 !important;
    color: var(--sr-em) !important;
    margin: 0 !important; padding: 0 !important;
  }
  .sr-hveh {
    font-family: 'Inter', sans-serif !important;
    font-size: 13px !important; font-weight: 500 !important;
    color: var(--sr-text-muted) !important; margin: 3px 0 0 !important; padding: 0 !important;
  }
  .sr-hdt {
    text-align: right;
    font-family: 'Roboto Mono', monospace;
    font-size: 12px; font-weight: 500; color: var(--sr-text-faint); line-height: 1.8;
  }

  /* ── PILL ── */
  .sr-pill {
    font-family: 'Roboto Mono', monospace;
    font-size: 12px; font-weight: 600;
    padding: 4px 12px;
    background: var(--sr-em-light);
    color: var(--sr-em);
    border: 1.5px solid var(--sr-em-border);
    border-radius: 100px;
    flex-shrink: 0;
  }

  /* ── INVOICE SCROLL ── */
  .sr-iscroll {
    max-height: 400px; overflow-y: auto;
    display: flex; flex-direction: column; gap: 8px;
    padding-right: 2px;
    scrollbar-width: thin;
    scrollbar-color: var(--sr-em-border) transparent;
  }
  .sr-iscroll::-webkit-scrollbar       { width: 3px; }
  .sr-iscroll::-webkit-scrollbar-thumb { background: var(--sr-em-border); border-radius: 4px; }

  .sr-iitem {
    padding: 14px 16px;
    background: var(--sr-white);
    border: 1.5px solid rgba(27,122,76,0.10);
    border-radius: var(--sr-r-sm);
    transition: border-color .2s, box-shadow .2s;
    cursor: default;
  }
  .sr-iitem:hover { border-color: var(--sr-em-border); box-shadow: var(--sr-shadow-sm); }
  .sr-itop { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
  .sr-idt {
    font-family: 'Roboto Mono', monospace;
    font-size: 11px; font-weight: 500; color: var(--sr-text-faint);
  }
  .sr-itag {
    font-family: 'Inter', sans-serif;
    font-size: 10px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase;
    padding: 3px 9px; border-radius: 5px; flex-shrink: 0;
    background: var(--sr-em-light); color: var(--sr-em); border: 1.5px solid var(--sr-em-border);
  }
  .sr-iinfo {
    font-family: 'Inter', sans-serif !important;
    font-size: 14px !important; font-weight: 600 !important;
    color: var(--sr-text-head) !important; margin: 7px 0 0 !important; padding: 0 !important;
  }

  /* ── EMPTY ── */
  .sr-empty {
    text-align: center; padding: 40px 0;
    font-family: 'Inter', sans-serif;
    font-size: 13px; font-weight: 500;
    letter-spacing: 0.06em; color: var(--sr-text-faint);
  }

  /* ── SUB LABEL ── */
  .sr-sublabel {
    font-family: 'Inter', sans-serif !important;
    font-size: 10px !important; font-weight: 700 !important; letter-spacing: .18em !important;
    text-transform: uppercase !important; color: var(--sr-text-faint) !important;
    margin: 0 0 10px 0 !important; padding: 0 !important;
    display: block !important;
  }

  /* ── LOADING / ERROR ── */
  .sr-center {
    min-height: 100vh; display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 14px;
    font-family: 'Inter', sans-serif;
    background: var(--sr-bg); color: var(--sr-text-muted);
  }
  .sr-center p {
    font-family: 'Inter', sans-serif !important;
    font-size: 12px !important; font-weight: 600 !important;
    letter-spacing: 0.12em !important; text-transform: uppercase !important;
    margin: 0 !important; padding: 0 !important;
    color: var(--sr-text-muted) !important;
  }
  .sr-spin {
    width: 32px; height: 32px;
    border: 2.5px solid var(--sr-em-border);
    border-top-color: var(--sr-em);
    border-radius: 50%;
    animation: sr-spin .7s linear infinite;
  }
  @keyframes sr-spin { to { transform: rotate(360deg); } }
`;

export default function SummaryPage({ claimId }: { claimId: string }) {
  const [data, setData]       = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(`/api/summary/${claimId}`, { headers: { requiresAuth: true } });
        setData(res.data);
      } catch (e) {
        console.error(e);
        setError("Failed to load summary");
      } finally {
        setLoading(false);
      }
    })();
  }, [claimId]);

  const fmt = (d: string | null) =>
    d ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(d)) : "—";

  const calculateDuration = (dateOut: string | null, dateIn: string | null) => {
    if (!dateOut) return "—";
    const outDate = new Date(dateOut);
    const inDate = dateIn ? new Date(dateIn) : new Date();
    const diffMs = inDate.getTime() - outDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
  };

  if (loading) return (
    <>
      <style>{styles}</style>
      <div className="sr-center">
        <div className="sr-spin" />
        <p>Loading summary</p>
      </div>
    </>
  );

  if (error || !data) return (
    <>
      <style>{styles}</style>
      <div className="sr-center" style={{ color: 'var(--sr-danger)' }}>
        {error || "Unable to load summary"}
      </div>
    </>
  );

  const claim   = data.claim;
  const rental  = data.rental_agreement;
  const sk      = data.storage_form?.storage_location_key || "addr1";
  const storage = storageLocations[sk] || storageLocations.addr1;

  return (
    <>
      <style>{styles}</style>
      <div className="sr-root">
        <div className="sr-inner">

          {/* ── HEADER ── */}
          <header className="sr-header">
            <div>
              <div className="sr-logo">
                <svg viewBox="0 0 24 24">
                  <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <h1 className="sr-title">Claim Summary</h1>
              <p className="sr-ref">Reference <em>#{claim.claim_id}</em></p>
            </div>
            <div className={`sr-badge ${claim.recently_deleted ? 'sr-badge-deleted' : 'sr-badge-active'}`}>
              <span className="sr-dot" />
              {claim.recently_deleted ? 'Recently Deleted' : claim.status}
            </div>
          </header>

          {/* ── GRID ── */}
          <div className="sr-grid">

            {/* 1 — Claimant */}
            <div className="sr-card sr-card-em">
              <div className="sr-chead">
                <div className="sr-clabel">
                  <div className="sr-cicon">👤</div>
                  <span className="sr-ctitle">Claimant</span>
                </div>
              </div>
              <div className="sr-fields-one">
                <div>
                  <span className="sr-flabel">Full Name</span>
                  <div className="sr-fv-nm">{claim.claimant_name}</div>
                </div>
                <div className="sr-fields">
                  <div>
                    <span className="sr-flabel">Claim Type</span>
                    <div className="sr-fv-sm" style={{ textTransform: 'capitalize' }}>{claim.claim_type}</div>
                  </div>
                  <div>
                    <span className="sr-flabel">Start Date</span>
                    <div className="sr-fv-sm">{fmt(claim.claim_start_date)}</div>
                  </div>
                  {claim.closed_date && (
                    <div>
                      <span className="sr-flabel">Closed</span>
                      <div className="sr-fv-err">{fmt(claim.closed_date)}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 2 — Storage + Accident */}
            <div className="sr-card">
              <div className="sr-chead">
                <div className="sr-clabel">
                  <div className="sr-cicon">📦</div>
                  <span className="sr-ctitle">Storage Location</span>
                </div>
              </div>
              <div className="sr-store">
                <div className="sr-store-name">{storage.name}</div>
                <div className="sr-store-city">{storage.city}</div>
                <div className="sr-store-post">{storage.postcode}</div>
              </div>
              {data.accident_claim && (
                <>
                  <div className="sr-div" />
                  <span className="sr-sublabel">Accident Checklist</span>
                  <div className="sr-check">
                    <div className={`sr-cdot ${data.accident_claim.checklist_vd ? 'sr-cdot-ok' : 'sr-cdot-pnd'}`} />
                    <div>
                      <div className="sr-ctext">Vehicle Damage</div>
                      <div className="sr-csub">{data.accident_claim.checklist_vd ? 'Yes' : 'No'}</div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* 3 — Invoices */}
            <div className="sr-card sr-tall">
              <div className="sr-chead">
                <div className="sr-clabel">
                  <div className="sr-cicon">🧾</div>
                  <span className="sr-ctitle">Invoices</span>
                </div>
                <span className="sr-pill">{data.invoices?.length ?? 0} total</span>
              </div>
              {data.invoices && data.invoices.length > 0 ? (
                <div className="sr-iscroll">
                  {data.invoices.map(inv => (
                    <div key={inv.id} className="sr-iitem">
                      <div className="sr-itop">
                        <span className="sr-idt">{new Date(inv.invoice_datetime).toLocaleString('en-GB')}</span>
                        <span className="sr-itag">Invoice</span>
                      </div>
                      <div className="sr-iinfo">{inv.info || "Invoice Entry"}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="sr-empty">No invoices yet</div>
              )}
            </div>

            {/* 4 — Rental */}
            {rental && (
              <div className="sr-card sr-w2">
                <div className="sr-chead">
                  <div className="sr-clabel">
                    <div className="sr-cicon">🚗</div>
                    <span className="sr-ctitle">Rental Agreement</span>
                  </div>
                </div>
                <div className="sr-fields">
                  <div>
                    <span className="sr-flabel">Registration</span>
                    <div className="sr-fv-mn">{rental.hire_vehicle_reg}</div>
                  </div>
                  <div>
                    <span className="sr-flabel">Vehicle</span>
                    <div className="sr-fv">{rental.hire_vehicle_make} {rental.hire_vehicle_model}</div>
                  </div>
                  <div>
                    <span className="sr-flabel">Hire Out</span>
                    <div className="sr-fv-sm">{fmt(rental.hire_vehicle_date_out)}</div>
                  </div>
                  <div>
                    <span className="sr-flabel">Hire In</span>
                    <div className="sr-fv-sm">{fmt(rental.hire_vehicle_date_in)}</div>
                  </div>
                  <div>
                    <span className="sr-flabel">Duration</span>
                    <div className="sr-fv-sm">{calculateDuration(rental.hire_vehicle_date_out, rental.hire_vehicle_date_in)}</div>
                  </div>
                </div>
                {rental.change_vehicle_history && rental.change_vehicle_history.length > 0 && (
                  <>
                    <div className="sr-div" />
                    <span className="sr-sublabel">Vehicle Change History</span>
                    {rental.change_vehicle_history.map((c, i) => (
                      <div key={i} className="sr-hrow">
                        <div>
                          <div className="sr-hreg">{c.vehicle_reg}</div>
                          <div className="sr-hveh">{c.vehicle_make} {c.vehicle_model}</div>
                        </div>
                        <div className="sr-hdt">
                          <div>Out {fmt(c.date_out)}</div>
                          <div>In&nbsp;&nbsp;{fmt(c.date_in)}</div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
}
