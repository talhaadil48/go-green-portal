import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary (do this once — can be moved to a lib file)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const claimId = formData.get('claimId') as string || 'unknown';
    const docName = formData.get('docName') as string || 'unnamed';
    if (!file || file.size === 0) {
      return NextResponse.json(
        { success: false, message: 'No file provided' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_') || docName;

    // Upload to Cloudinary
    const result = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'auto', // auto-detect pdf/image/etc
          public_id: `claims/${claimId}/${safeName.replace(/\.[^/.]+$/, "")}`, // optional unique ID
          folder: 'claims', // optional organization
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );

      uploadStream.end(buffer);
    });

    return NextResponse.json({
      success: true,
      url: result.secure_url,
      name: safeName,
      sizeKb: (buffer.length / 1024).toFixed(1),
    });

  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Server error during upload',
        error: error.message || 'Unknown',
      },
      { status: 500 }
    );
  }
}