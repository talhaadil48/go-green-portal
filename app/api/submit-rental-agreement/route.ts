import { NextRequest, NextResponse } from "next/server";
import cloudinary from "cloudinary";

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export async function POST(req: NextRequest) {
  try {
    const fullData = await req.json();

    const uploadToCloudinary = async (
      dataUrl: string | null,
      fieldName: string,
    ): Promise<string> => {
      if (!dataUrl) return "";

      try {
        const result = await cloudinary.v2.uploader.upload(dataUrl, {
          folder: "rental-agreements",
          public_id: `${fieldName}-${Date.now()}`,
          resource_type: "image",
        });
        return result.secure_url;
      } catch (err) {
        console.error(`Cloudinary upload failed for ${fieldName}:`, err);
        throw err;
      }
    };

    // Upload all signatures
    const signatureFields = [
      "hirer_signature_terms",
      "company_signature",
      "hirer_signature_insurance",
      "declaration_signature",
      "liability_signature",
    ];

    for (const field of signatureFields) {
      if (fullData[field]) {
        fullData[field] = await uploadToCloudinary(fullData[field], field);
      }
    }

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
    ];

   

    // Handle date fields
    DATE_FIELDS.forEach((field) => {
      if (!fullData[field] || fullData[field] === "") {
        fullData[field] = null;
      }
    });

   
    // === NEW: Forward to your external backend ===
    const EXTERNAL_API_URL = `${process.env.NEXT_PUBLIC_API_URL}/api/rental-agreements`; // adjust path if needed

    const externalResponse = await fetch(EXTERNAL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Optional: forward authorization if your backend needs it
        // 'Authorization': req.headers.get('authorization') || '',
      },
      body: JSON.stringify(fullData),
    });

    if (!externalResponse.ok) {
      const errorText = await externalResponse.text();
      console.error("External API error:", externalResponse.status, errorText);
      throw new Error(
        `External backend failed: ${externalResponse.status} - ${errorText}`,
      );
    }

    const externalResult = await externalResponse.json();

    return NextResponse.json(
      { success: true, message: "Rental agreement submitted successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error in /api/submit-rental-agreement:", error);
    return NextResponse.json(
      { success: false, message: "Server error during submission" },
      { status: 500 },
    );
  }
}
