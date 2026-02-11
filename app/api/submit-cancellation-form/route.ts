// app/api/submit-cancellation-notice/route.ts
import { NextRequest, NextResponse } from "next/server";
import { uploadToS3 } from "@/lib/s3";

function base64ToBuffer(base64: string) {
  // Remove the "data:image/png;base64," part if present
  const base64Data = base64.replace(/^data:.*;base64,/, "");
  return Buffer.from(base64Data, "base64");
}

export async function POST(req: NextRequest) {
  try {
    const fullData = await req.json();

    const uploadFieldToS3 = async (dataUrl: string | null, fieldName: string) => {
      if (!dataUrl) return "";

      try {
        const buffer = base64ToBuffer(dataUrl);

        // Create a fake File object for uploadToS3
        const file = new File([buffer], `${fieldName}.png`, { type: "image/png" });

        // Use some ID from the data or a default
        const claimId = fullData.id || "general";

        const s3Url = await uploadToS3(file, claimId);
        return s3Url;
      } catch (err) {
        console.error(`S3 upload failed for ${fieldName}:`, err);
        return ""; // continue even if upload fails
      }
    };

    // Upload cancellation signature if present
    if (fullData.cancellation_signature) {
      fullData.cancellation_signature = await uploadFieldToS3(
        fullData.cancellation_signature,
        "cancellation_signature"
      );
    }

    // Handle empty date fields
    const DATE_FIELDS = ["cancellation_date"];
    DATE_FIELDS.forEach((field) => {
      if (fullData[field] === "") fullData[field] = null;
    });

    // Forward to external backend
    const EXTERNAL_API_URL = `${process.env.NEXT_PUBLIC_API_URL}/post/cancellation-forms`;

    const externalResponse = await fetch(EXTERNAL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(fullData),
    });

    if (!externalResponse.ok) {
      const errorText = await externalResponse.text();
      console.error("External API error:", externalResponse.status, errorText);
      throw new Error(`External backend failed: ${externalResponse.status} - ${errorText}`);
    }

    const externalResult = await externalResponse.json();

    return NextResponse.json(
      { success: true, message: "Cancellation notice submitted", data: externalResult },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in /api/submit-cancellation-notice:", error);
    return NextResponse.json(
      { success: false, message: "Server error during submission" },
      { status: 500 }
    );
  }
}