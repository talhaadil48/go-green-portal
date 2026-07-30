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
        return null;
      }

      // ✅ If already an S3 URL → return it
      if (dataUrl.startsWith("http")) {
        return dataUrl;
      }

      // ✅ Only upload if it's base64
      if (!dataUrl.startsWith("data:")) {
        return dataUrl;
      }

      try {
        const buffer = base64ToBuffer(dataUrl);
        const file = new File([buffer], `${fieldName}.png`, {
          type: "image/png",
        });

        const claimId = fullData.claim_id || "general";
        const folderPath = fullData.rental_agreement_id 
          ? `${claimId}/agreement-${fullData.rental_agreement_id}`
          : claimId;

        const s3Url = await uploadToS3(file, folderPath);
        return s3Url;
      } catch (err) {
        console.error(`S3 upload failed for ${fieldName}:`, err);
        // ✅ Return the original data to preserve signature
        return dataUrl;
      }
    };

    // Upload all signatures to S3 and store the URLs
    const signatureFields = [
      "hirer_signature_terms",
      "company_signature",
      "hirer_signature_insurance",
      "declaration_signature",
      "liability_signature",
    ];

    // ✅ Store the processed signature URLs
    const processedSignatures: Record<string, string | null> = {};

    for (const field of signatureFields) {
      if (fullData[field]) {
        const uploadedUrl = await uploadFieldToS3(fullData[field], field);
        // ✅ Store the processed URL
        processedSignatures[field] = uploadedUrl;
        // ✅ Update the fullData with the processed URL
        fullData[field] = uploadedUrl;
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
      "valid_from",
      "valid_till",
      "daily_rate",
      "policy_excess",
      "deposit",
      "refuelling_charge",
      "admin_fee",
      "delivery_charge",
      "cdw_per_day",
      "days_out",
      "hire_vehicle_rate_per_day",
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

    const payload = {
      ...fullData,
      claim_id: fullData.claim_id,
      rental_agreement_id: fullData.rental_agreement_id || undefined,
    };

    // Forward to external backend
    const EXTERNAL_API_URL = `${process.env.NEXT_PUBLIC_API_URL}/post/rental-agreements`;

    const externalResponse = await fetch(EXTERNAL_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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

    // ✅ Return the processed signature URLs along with the response
    return NextResponse.json(
      {
        success: true,
        message: "Rental agreement submitted successfully",
        rental_agreement_id: externalResult?.rental_agreement_id,
        claim_id: externalResult?.claim_id,
        // ✅ Include the processed signatures with their S3 URLs
        signatures: processedSignatures,
        // Also include the full data with S3 URLs for the frontend
        data: {
          ...fullData,
          // Make sure signatures are included in data
          ...processedSignatures,
        },
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

// ─── GET: Get all rental agreements for a claim ───
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const claimId = searchParams.get("claimId");
    const agreementId = searchParams.get("agreementId");

    // Forward to external backend
    const EXTERNAL_API_URL = process.env.NEXT_PUBLIC_API_URL;

    let url: string;
    
    if (agreementId && claimId) {
      // Get specific agreement
      url = `${EXTERNAL_API_URL}/get/claims/${claimId}/rental-agreements/${agreementId}`;
    } else if (claimId) {
      // Get all agreements for claim
      url = `${EXTERNAL_API_URL}/get/claims/${claimId}/rental-agreements`;
    } else {
      return NextResponse.json(
        {
          success: false,
          message: "claimId is required",
        },
        { status: 400 }
      );
    }

    const externalResponse = await fetch(url, {
      method: "GET",
      headers: { 
        "Content-Type": "application/json",
        ...(req.headers.get("authorization") && {
          Authorization: req.headers.get("authorization")!,
        }),
      },
    });

    if (!externalResponse.ok) {
      if (externalResponse.status === 404) {
        return NextResponse.json(
          {
            success: true,
            data: agreementId ? null : [],
            message: agreementId ? "Agreement not found" : "No agreements found",
          },
          { status: 200 }
        );
      }

      const errorData = await externalResponse.json().catch(() => null);
      return NextResponse.json(
        {
          success: false,
          message: errorData?.detail || "Failed to fetch rental agreements",
        },
        { status: externalResponse.status }
      );
    }

    const data = await externalResponse.json();

    return NextResponse.json(
      {
        success: true,
        data: data,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("GET rental agreements error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Server error fetching rental agreements",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

// ─── DELETE: Delete a rental agreement ───
export async function DELETE(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const claimId = searchParams.get("claimId");
    const agreementId = searchParams.get("agreementId");

    if (!claimId || !agreementId) {
      return NextResponse.json(
        {
          success: false,
          message: "Both claimId and agreementId are required",
        },
        { status: 400 }
      );
    }

    const EXTERNAL_API_URL = process.env.NEXT_PUBLIC_API_URL;
    const url = `${EXTERNAL_API_URL}/delete/claims/${claimId}/rental-agreements/${agreementId}`;

    const externalResponse = await fetch(url, {
      method: "DELETE",
      headers: { 
        "Content-Type": "application/json",
        ...(req.headers.get("authorization") && {
          Authorization: req.headers.get("authorization")!,
        }),
      },
    });

    if (!externalResponse.ok) {
      const errorData = await externalResponse.json().catch(() => null);
      return NextResponse.json(
        {
          success: false,
          message: errorData?.detail || "Failed to delete rental agreement",
        },
        { status: externalResponse.status }
      );
    }

    const data = await externalResponse.json();

    return NextResponse.json(
      {
        success: true,
        message: "Rental agreement deleted successfully",
        data: data,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("DELETE rental agreement error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Server error deleting rental agreement",
        error: error.message,
      },
      { status: 500 }
    );
  }
}