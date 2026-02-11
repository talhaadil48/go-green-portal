import { NextRequest, NextResponse } from "next/server";
import AWS from "aws-sdk";

// Configure S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

export const config = {
  api: {
    bodyParser: false, // required for multipart/form-data
  },
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const claimId = (formData.get("claimId") as string) || "unknown";
    const docName = (formData.get("docName") as string) || "unnamed";

    if (!file || file.size === 0) {
      return NextResponse.json(
        { success: false, message: "No file provided" },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Sanitize filename
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_") || docName;
    const extension = safeName.includes(".")
      ? safeName.slice(safeName.lastIndexOf("."))
      : "";
    const baseName = safeName.replace(/\.[^/.]+$/, "");

    // Use **same key every time** → overwrites existing file
    const key = `claims/${claimId}/${baseName}${extension}`;

    // Upload to S3
    const params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: key,
      Body: buffer,
      ContentType: file.type, // auto-detects image/pdf/video/etc.
      // ACL not needed: bucket is public
    };

    const uploadResult = await s3.upload(params).promise();

    return NextResponse.json({
      success: true,
      url: uploadResult.Location, // public URL
      name: safeName,
      sizeKb: (buffer.length / 1024).toFixed(1),
      message: "File uploaded successfully (overwrites if same name exists)",
    });
  } catch (error: any) {
    console.log("Upload error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Server error during upload",
        error: error.message || "Unknown",
      },
      { status: 500 }
    );
  }
}
