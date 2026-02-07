// app/api/accident-claims/route.ts   (or wherever your file is)

import { NextRequest, NextResponse } from "next/server";
import cloudinary from "cloudinary";
import { noSSR } from "next/dynamic";

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
      dataUrl: string,
      fieldName: string,
    ): Promise<string> => {
      if (!dataUrl) return "";
      try {
        const result = await cloudinary.v2.uploader.upload(dataUrl, {
          folder: "accident-claims",
          public_id: `${fieldName}-${Date.now()}`,
          resource_type: "image",
        });
        return result.secure_url;
      } catch (uploadError) {
        console.error(
          `Error uploading ${fieldName} to Cloudinary:`,
          uploadError,
        );
        throw uploadError;
      }
    };

    // Replace data URLs → Cloudinary secure URLs
    if (fullData.client_signature) {
      fullData.client_signature = await uploadToCloudinary(
        fullData.client_signature,
        "client_signature",
      );
    }
    if (fullData.circumstance_drawing) {
      fullData.circumstance_drawing = await uploadToCloudinary(
        fullData.circumstance_drawing,
        "circumstance_drawing",
      );
    }
    if (fullData.direction_before_drawing) {
      fullData.direction_before_drawing = await uploadToCloudinary(
        fullData.direction_before_drawing,
        "direction_before_drawing",
      );
    }
    if (fullData.direction_after_drawing) {
      fullData.direction_after_drawing = await uploadToCloudinary(
        fullData.direction_after_drawing,
        "direction_after_drawing",
      );
    }
    const DATE_FIELDS = [
      "date_of_claim",
      "accident_date",
      "owner_dob",
      "driver_dob",
      "third_party_dob",
      "declaration_date",
      "accident_time",
    ];
    const { "checklist_v.d": checklist_vd, ...rest } = fullData;

    const normalizedData = { ...rest, checklist_vd };

    DATE_FIELDS.forEach((field) => {
      if (normalizedData[field] === "") {
        normalizedData[field] = null;
      }
    });

    // === NEW: Forward to your external backend ===
    const EXTERNAL_API_URL = `${process.env.NEXT_PUBLIC_API_URL}/post/accident-claims/{${fullData.claim_id}}`; // adjust path if needed

    const externalResponse = await fetch(EXTERNAL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Optional: forward authorization if your backend needs it
        // 'Authorization': req.headers.get('authorization') || '',
      },
      body: JSON.stringify(normalizedData),
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
      {
        success: true,
        message: "Claim processed and sent to backend successfully",
        claim_id: externalResult.claim_id || null, // if your backend returns an ID
        data: externalResult, // optional
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Error processing submission:", error);
    return NextResponse.json(
      { success: false, message: "Submission failed", error: error.message },
      { status: 500 },
    );
  }
}
