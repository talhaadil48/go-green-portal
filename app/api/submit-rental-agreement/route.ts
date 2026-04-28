// app/api/rental-agreements/route.ts
import { NextRequest, NextResponse } from "next/server";
import { uploadToS3 } from "@/lib/s3";

// Convert base64 string to Buffer
function base64ToBuffer(base64: string) {
  return Buffer.from(base64.replace(/^data:.*;base64,/, ""), "base64");
}

export async function POST(req: NextRequest) {
  try {
    const fullData = await req.json();

    // Helper to upload a single field to S3
    const uploadFieldToS3 = async (
      dataUrl: string | null,
      fieldName: string,
    ) => {
      if (!dataUrl || dataUrl === "") {
        return "";
      }

      // ✅ If already an S3 URL → don't touch it
      if (dataUrl.startsWith("http")) {
        return dataUrl;
      }

      // ✅ Only upload if it's base64
      if (!dataUrl.startsWith("data:")) {
        return dataUrl;
      }

      try {
        const buffer = base64ToBuffer(dataUrl);

        // Create a File object for your lib/s3.ts
        const file = new File([buffer], `${fieldName}.png`, {
          type: "image/png",
        });

        // Use ID from fullData or fallback
        const claimId = fullData.id || "general";

        const s3Url = await uploadToS3(file, claimId);
        return s3Url;
      } catch (err) {
        console.error(`S3 upload failed for ${fieldName}:`, err);
        return ""; // continue even if upload fails
      }
    };

    // Upload all signatures to S3
    const signatureFields = [
      "hirer_signature_terms",
      "company_signature",
      "hirer_signature_insurance",
      "declaration_signature",
      "liability_signature",
    ];

    for (const field of signatureFields) {
      if (fullData[field]) {
        fullData[field] = await uploadFieldToS3(fullData[field], field);
      }
    }

    // Handle date fields and numeric fields that can be empty
    const DATE_FIELDS = [
      "date_issued",
      "expiry_date",
      "dob",
      "date_test_passed",
      "insurance_date",
      "hire_vehicle_date_out",
      "hire_vehicle_date_in",
      "change_vehicle_date_out",
      "change_vehicle_date_in",
      "declaration_date",
      "liability_date",
      "daily_rate",
      "policy_excess",
      "deposit",
      "refuelling_charge",
      "admin_fee",
      "delivery_charge",
      "cdw_per_day",
      "days_out",
      "days_in",
      "total_days",
      "rate_per_day",
      "refuelling_total",
      "subtotal",
      "vat",
      "total_cost",
      "new_date_issued",
      "new_expiry_date",
      "new_dob",
      "new_date_test_passed",
    ];

    DATE_FIELDS.forEach((field) => {
      if (!fullData[field] || fullData[field] === "") {
        fullData[field] = null;
      }
    });
    // Forward to external backend
    const EXTERNAL_API_URL = `${process.env.NEXT_PUBLIC_API_URL}/post/rental-agreements`;

    const externalResponse = await fetch(EXTERNAL_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fullData),
    });

    if (!externalResponse.ok) {
      const errorData = await externalResponse.json().catch(() => null);

      console.error(
        "External API error:",
        externalResponse.status,
        errorData,
      );

      return NextResponse.json(
        {
          success: false,
          status: externalResponse.status,
          message:
            errorData?.detail ||
            externalResponse.statusText ||
            "External API error",
        },
        { status: externalResponse.status },
      );
    }
    const externalResult = await externalResponse.json();

    return NextResponse.json(
      {
        success: true,
        message: "Rental agreement submitted successfully",
        data: externalResult, // optional: backend response
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.log(error);
    return NextResponse.json(
      {
        success: false,
        message: "Server error during submission",
        error: error.message,
      },
      { status: 500 },
    );
  }
}
