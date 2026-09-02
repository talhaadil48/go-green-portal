# Offers API — New Contract (JSONB Migration)

## Overview

After the migration, the `offer` table stores offers as a JSONB array instead of separate `offer1`/`offer2`/`offer3` columns. The backend API responses must be updated accordingly.

---

## New API Response Shapes

### `GET /api/offers` — List all offers

**Before (old shape):**
```json
{
  "data": [
    {
      "claim_id": "TC-01",
      "offer1": 8925.00,
      "offer1_date": "2026-07-01",
      "offer1_status": "paid",
      "offer2": 10500.00,
      "offer2_date": "2026-07-15",
      "offer2_status": "paid",
      "offer3": null,
      "offer3_date": null,
      "offer3_status": null,
      "claim_type": "personal",
      "claimant_name": "John Smith",
      "hire_storage": 5000.00
    }
  ]
}
```

**After (new shape):**
```json
{
  "data": [
    {
      "claim_id": "TC-01",
      "offers": [
        { "amount": 8925.00,  "date": "2026-07-01", "status": "paid" },
        { "amount": 10500.00, "date": "2026-07-15", "status": "paid" }
      ],
      "latest_offer": {
        "amount": 10500.00,
        "date": "2026-07-15",
        "status": "paid"
      },
      "status": "paid",
      "seen": false,
      "claim_type": "personal",
      "claimant_name": "John Smith",
      "hire_storage": 5000.00
    }
  ]
}
```

### `POST /api/offers/create` — Create blank offer for a claim

**Request (unchanged):**
```json
{ "claim_id": "TC-01" }
```

**Backend logic:** Append an empty offer object to the `offers` JSON array:
```json
{ "amount": null, "date": null, "status": null }
```

### `PUT /api/offers/:claim_id` — Update an offer

**Before (old shape):**
```json
{
  "offer1": 10500.00,
  "offer1_date": "2026-07-15",
  "offer1_status": "paid"
}
```

**After (new shape):**
```json
{
  "offer_index": 0,
  "offer": {
    "amount": 10500.00,
    "date": "2026-07-15",
    "status": "paid"
  }
}
```

- `offer_index`: 0-based index into the `offers` array
- If `offer_index` is out of bounds, append as a new offer
- If amount/date are both null, the offer entry is removed from the array

### `POST /api/offers` — Mark offer as paid (from InvoiceManagment)

**Before (old shape):**
```json
{
  "claim_id": "TC-01",
  "offer1": 10500.00,
  "offer1_date": "2026-07-15",
  "offer1_status": "paid"
}
```

**After (new shape):**
```json
{
  "claim_id": "TC-01",
  "offer": {
    "amount": 10500.00,
    "date": "2026-07-15",
    "status": "paid"
  }
}
```

**Backend logic:** Append this as a new entry to the `offers` JSON array.

---

## `latest_offer` Computation Logic

The backend should compute `latest_offer` as the offer with the most recent `date` in the `offers` array:

```python
def get_latest_offer(offers: list[dict]) -> dict | None:
    """Return the offer with the most recent date, or None if empty."""
    valid = [o for o in offers if o.get("date")]
    if not valid:
        return None
    return max(valid, key=lambda o: o["date"])
```

**Fallback order is NO LONGER offer3 → offer2 → offer1.**
The latest offer is always determined by the most recent date.

---

## SQL Query Examples (PostgreSQL)

### Get all offers with latest offer computed:
```sql
SELECT
  claim_id,
  offers,
  status,
  seen,
  claim_type,
  claimant_name,
  hire_storage,
  -- Compute latest offer from JSON array
  CASE
    WHEN jsonb_array_length(offers) > 0
    THEN (
      SELECT jsonb_build_object(
        'amount', elem->>'amount',
        'date',   elem->>'date',
        'status', elem->>'status'
      )
      FROM jsonb_array_elements(offers) AS elem
      WHERE elem->>'date' IS NOT NULL
      ORDER BY (elem->>'date') DESC
      LIMIT 1
    )
    ELSE NULL
  END AS latest_offer
FROM offer
ORDER BY claim_id;
```

### Efficient query using the generated column:
```sql
SELECT * FROM offer
WHERE latest_offer_date >= '2026-07-01'
ORDER BY latest_offer_date DESC;
```

---

## Notes

- The `status` and `seen` columns on the `offer` table remain unchanged.
- Old columns (`offer1`, `offer1_date`, etc.) should be kept temporarily for backward compatibility and dropped in a follow-up migration after full verification.
- The `offers` JSONB array supports unlimited offers (no longer capped at 3).
- All existing invoice joins, claim queries, filtering, and sorting should be updated to use `latest_offer_date` or `offers->-1` instead of the old column references.
