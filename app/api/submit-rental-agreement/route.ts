import { NextRequest, NextResponse } from 'next/server';
import cloudinary from 'cloudinary';

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export async function POST(req: NextRequest) {
  try {
    const fullData = await req.json();

    const uploadToCloudinary = async (dataUrl: string | null, fieldName: string): Promise<string> => {
      if (!dataUrl) return '';

      try {
        const result = await cloudinary.v2.uploader.upload(dataUrl, {
          folder: 'rental-agreements',
          public_id: `${fieldName}-${Date.now()}`,
          resource_type: 'image',
        });
        return result.secure_url;
      } catch (err) {
        console.error(`Cloudinary upload failed for ${fieldName}:`, err);
        throw err;
      }
    };

    // Upload all signatures
    const signatureFields = [
      'hirer_signature_terms',
      'company_signature',
      'hirer_signature_insurance',
      'declaration_signature',
      'liability_signature',
    ];

    for (const field of signatureFields) {
      if (fullData[field]) {
        fullData[field] = await uploadToCloudinary(fullData[field], field);
      }
    }

    console.log("Submitted Rental Agreement JSON:");
    console.log(JSON.stringify(fullData, null, 2));

    return NextResponse.json(
      { success: true, message: "Rental agreement submitted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in /api/submit-rental-agreement:", error);
    return NextResponse.json(
      { success: false, message: "Server error during submission" },
      { status: 500 }
    );
  }
}