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
          folder: "storage-recovery-agreements",
          public_id: `${fieldName}-${Date.now()}`,
          resource_type: "image",
        });
        return result.secure_url;
      } catch (err) {
        console.error(`Cloudinary upload failed for ${fieldName}:`, err);
        throw err;
      }
    };

    // Upload signatures
    if (fullData.client_signature) {
      fullData.client_signature = await uploadToCloudinary(
        fullData.client_signature,
        "client_signature",
      );
    }
    if (fullData.owner_signature) {
      fullData.owner_signature = await uploadToCloudinary(
        fullData.owner_signature,
        "owner_signature",
      );
    }
    const DATE_FIELDS = [
      "date_of_recovery",
      "storage_start_date",
      "storage_end_date",
      "client_date",
      "owner_date",
        "number_of_days",
      "charges_per_day",
      "total_storage_charge",
      "recovery_charge",
      "subtotal",
      "vat_amount",
      "invoice_total",
    ];


    // Handle date fields
    DATE_FIELDS.forEach((field) => {
      if (!fullData[field] || fullData[field] === "") {
        fullData[field] = null;
      }
    });

   
    
    // === NEW: Forward to your external backend ===
    const EXTERNAL_API_URL = `${process.env.NEXT_PUBLIC_API_URL}/api/storage-forms`; // adjust path if needed

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
      { success: true, message: "Storage & recovery agreement submitted" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error in /api/submit-storage-recovery:", error);
    return NextResponse.json(
      { success: false, message: "Server error during submission" },
      { status: 500 },
    );
  }
}
