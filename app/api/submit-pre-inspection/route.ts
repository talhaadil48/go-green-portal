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
          folder: "pre-inspection-checklists",
          public_id: `${fieldName}-${Date.now()}`,
          resource_type: "image",
        });
        return result.secure_url;
      } catch (uploadError) {
        console.error(
          `Cloudinary upload failed for ${fieldName}:`,
          uploadError,
        );
        throw uploadError;
      }
    };

    // Upload images to Cloudinary
    if (fullData.customer_signature) {
      fullData.customer_signature = await uploadToCloudinary(
        fullData.customer_signature,
        "customer_signature",
      );
    }
    if (fullData.detailer_signature) {
      fullData.detailer_signature = await uploadToCloudinary(
        fullData.detailer_signature,
        "detailer_signature",
      );
    }
    if (fullData.annotated_vehicle_image) {
      fullData.annotated_vehicle_image = await uploadToCloudinary(
        fullData.annotated_vehicle_image,
        "annotated_vehicle_image",
      );
    }
    if (fullData.base_vehicle_image) {
      fullData.base_vehicle_image = await uploadToCloudinary(
        fullData.base_vehicle_image,
        "base_vehicle_image",
      );
    }

    const DATE_FIELDS = ["date"];
    DATE_FIELDS.forEach((field) => {
      if (fullData[field] === "") {
        fullData[field] = null;
      }
    });

    // === NEW: Forward to your external backend ===
    const EXTERNAL_API_URL = `${process.env.NEXT_PUBLIC_API_URL}/api/pre-inspection-forms`; // adjust path if needed

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
      {
        success: true,
        message: "Pre-inspection checklist submitted successfully",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error in /api/submit-pre-inspection:", error);
    return NextResponse.json(
      { success: false, message: "Server error during submission" },
      { status: 500 },
    );
  }
}
