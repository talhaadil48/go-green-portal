// app/api/upload-document/route.ts
import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary (do this once — can be moved to a lib file)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const config = {
  api: {
    bodyParser: false, // Important: disable Next.js default body parser for multipart
  },
};

async function uploadToCloudinary(file: File, claimId: string): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const result = await new Promise<any>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: `accident-claims/${claimId}`,
          public_id: `${file.name.split(".")[0]}-${Date.now()}`,
          resource_type: "auto", // auto-detect: image, pdf, video, etc.
          // You can add: transformation: [{ quality: "auto" }, { fetch_format: "auto" }]
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        },
      )
      .end(buffer);
  });

  if (!result?.secure_url) {
    throw new Error("Cloudinary upload failed - no secure_url returned");
  }

  return result.secure_url;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const claimId = formData.get("claimId") as string;
    const documentName = formData.get("documentName") as string;
    const file = formData.get("file") as File | null;

    if (!claimId || !documentName?.trim() || !file) {
      return NextResponse.json(
        { error: "Missing required fields: claimId, documentName, file" },
        { status: 400 },
      );
    }

    // Upload file → Cloudinary
    const fileUrl = await uploadToCloudinary(file, claimId);

    // Fetch current documents (to merge / avoid overwrite of unrelated keys)
    let currentDocs: Record<string, string> = {};

    try {
      const getRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/claim-documents/${claimId}`,
      );

      if (getRes.ok) {
        const data = await getRes.json();
        currentDocs = data.documents || {};
      }
      // 404 → just start with empty
    } catch (e) {
      console.warn("Could not fetch existing docs, starting fresh", e);
    }

    // Merge: overwrite only this document name
    const updatedDocs = {
      ...currentDocs,
      [documentName.trim()]: fileUrl,
    };

    // PUT to your FastAPI endpoint
    const putRes = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/claim-documents/${claimId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documents: updatedDocs }),
      },
    );

    if (!putRes.ok) {
      const errorText = await putRes.text();
      throw new Error(`Backend PUT failed: ${putRes.status} - ${errorText}`);
    }

    const backendResult = await putRes.json();

    return NextResponse.json({
      success: true,
      documentName,
      url: fileUrl,
      allDocuments: backendResult.documents,
      message: "Document uploaded and saved successfully",
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to upload document",
      },
      { status: 500 },
    );
  }
}