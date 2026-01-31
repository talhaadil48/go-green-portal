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
      fieldName: string
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
        "client_signature"
      );
    }
    if (fullData.owner_signature) {
      fullData.owner_signature = await uploadToCloudinary(
        fullData.owner_signature,
        "owner_signature"
      );
    }

    console.log("Submitted Storage & Recovery Agreement JSON:");
    console.log(JSON.stringify(fullData, null, 2));

    return NextResponse.json(
      { success: true, message: "Storage & recovery agreement submitted" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in /api/submit-storage-recovery:", error);
    return NextResponse.json(
      { success: false, message: "Server error during submission" },
      { status: 500 }
    );
  }
}