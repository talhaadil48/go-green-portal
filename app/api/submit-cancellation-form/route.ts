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
          }
        );
        fullData.cancellation_signature = result.secure_url;
      } catch (uploadErr) {
        console.error("Cloudinary upload failed:", uploadErr);
        // We continue anyway – signature URL will remain data URL or empty
      }
    }

    console.log("Submitted Cancellation Notice JSON:");
    console.log(JSON.stringify(fullData, null, 2));

    return NextResponse.json(
      { success: true, message: "Cancellation notice submitted" },
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