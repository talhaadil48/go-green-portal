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

    // Upload signature if present
    if (fullData.cancellation_signature) {
      try {
        const result = await cloudinary.v2.uploader.upload(
          fullData.cancellation_signature,
          {
            folder: "cancellation-notices",
            public_id: `cancellation-signature-${Date.now()}`,
            resource_type: "image",
          },
        );
        fullData.cancellation_signature = result.secure_url;
      } catch (uploadErr) {
        console.error("Cloudinary upload failed:", uploadErr);
        // We continue anyway – signature URL will remain data URL or empty
      }
    }

    const DATE_FIELDS = ["cancellation_date"];
    DATE_FIELDS.forEach((field) => {
      if (fullData[field] === "") {
        fullData[field] = null;
      }
    });

    // === NEW: Forward to your external backend ===
    const EXTERNAL_API_URL = `${process.env.NEXT_PUBLIC_API_URL}/post/cancellation-forms`; // adjust path if needed

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

    // Optional: log the final processed JSON (you already had this)
 
    return NextResponse.json(
      { success: true, message: "Cancellation notice submitted" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error in /api/submit-cancellation-notice:", error);
    return NextResponse.json(
      { success: false, message: "Server error during submission" },
      { status: 500 },
    );
  }
}
