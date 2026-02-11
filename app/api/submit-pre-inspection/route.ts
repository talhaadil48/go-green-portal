// app/api/pre-inspection/route.ts
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

        // Create a File object for uploadToS3
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

    // Upload images to S3
    if (fullData.customer_signature) {
      fullData.customer_signature = await uploadFieldToS3(
        fullData.customer_signature,
        "customer_signature",
      );
    }
    if (fullData.detailer_signature) {
      fullData.detailer_signature = await uploadFieldToS3(
        fullData.detailer_signature,
        "detailer_signature",
      );
    }
    if (fullData.annotated_vehicle_image) {
      fullData.annotated_vehicle_image = await uploadFieldToS3(
        fullData.annotated_vehicle_image,
        "annotated_vehicle_image",
      );
    }
    if (fullData.base_vehicle_image) {
      fullData.base_vehicle_image = await uploadFieldToS3(
        fullData.base_vehicle_image,
        "base_vehicle_image",
      );
    }

    // Normalize date fields
    const DATE_FIELDS = ["date"];
    DATE_FIELDS.forEach((field) => {
      if (!fullData[field] || fullData[field] === "") fullData[field] = null;
    });

    // Forward to external backend
    const EXTERNAL_API_URL = `${process.env.NEXT_PUBLIC_API_URL}/post/pre-inspection-forms/`;

    const externalResponse = await fetch(EXTERNAL_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
        data: externalResult, // optional: backend response
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Error in /api/submit-pre-inspection:", error);
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
