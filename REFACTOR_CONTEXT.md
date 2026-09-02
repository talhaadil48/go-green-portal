# Offer Table Refactoring — Full Context

## What Changed

Refactored the `offer` table from separate `offer1`/`offer2`/`offer3` columns to a single `offers JSONB` array column. This removes the 3-offer limit and makes latest-offer selection dynamic instead of hard-coded.

---

## Files Modified

| File | Change |
|---|---|
| `app/components/Offers.tsx` | Complete rewrite — new types, latest-offer logic, table columns, edit flow, history modal |
| `app/components/InvoiceManagment.tsx` | "Mark Paid" payload changed from `offer1/offer1_date/offer1_status` to `offer: {amount, date, status}` |
| `migrations/001_offers_to_jsonb.sql` | **New** — migration SQL to add `offers JSONB`, migrate data, add indexes |
| `migrations/API_CONTRACT.md` | **New** — backend API contract documenting new request/response shapes |

---

## Key Logic Changes

### Latest Offer Selection
- **Before**: Hard-coded `offer3 → offer1` fallback (offer3 always treated as "final")
- **After**: Determined by most recent `date` in the `offers` JSON array
- `resolveLatestOffer()` uses pre-computed `latest_offer` from API, falls back to `getLatestOffer()` client-side

### New Type Definitions
```typescript
interface OfferEntry {
  amount: number | null;
  date: string | null;
  status: string | null;
}

interface Offer {
  claim_id: string;
  offers: OfferEntry[];          // full history
  latest_offer: OfferEntry | null; // computed by backend
  status: string | null;
  seen: boolean;
  claim_type: string | null;
  claimant_name: string | null;
  hire_storage: number | null;
}
```

### API Payload Changes

**PUT /api/offers/:claim_id** (edit):
```json
{ "offer_index": 0, "offer": { "amount": 10500, "date": "2026-07-15", "status": "paid" } }
```

**POST /api/offers** (mark paid from InvoiceManagment):
```json
{ "claim_id": "TC-01", "offer": { "amount": 10500, "date": "2026-07-15", "status": "paid" } }
```

### New Features
- **Offer History Modal**: Click "History" on any row to see all offers sorted newest-first
- **Table shows only latest offer**: Cleaner main table with "Latest Offer" and "Offer Date" columns
- **Unlimited offers**: No longer capped at 3 per claim

---

## Backend Still Needs

1. Run the migration SQL from `migrations/001_offers_to_jsonb.sql`
2. Update all backend queries to use `offers` JSONB column instead of `offer1`/`offer2`/`offer3`
3. Update `GET /api/offers` to return `{ offers: [...], latest_offer: {...} }` shape
4. Update `PUT /api/offers/:claim_id` to accept `{ offer_index, offer }` payload
5. Update `POST /api/offers` to accept `{ offer: {...} }` and append to JSON array
6. Update `POST /api/offers/create` to append an empty offer entry to the JSON array
7. After verification, drop old columns (Step 7 in migration SQL)

See `migrations/API_CONTRACT.md` for full backend specifications.

---

## What Was NOT Changed
- `app/page.tsx` — no offer references
- `app/claim/[id]/page.tsx` — no offer references
- `app/components/Summary.tsx` — no offer references
- `app/components/InnvoiceManager.tsx` — no offer references (different from InvoiceManagment.tsx)
- All other components — no offer references found
- The `status` and `seen` columns on the offer table remain unchanged
