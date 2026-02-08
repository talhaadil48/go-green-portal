// app/api/upload-document/route.ts
import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary (should be done once — ideally in a lib/cloudinary.ts)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const config = {
  api: {
    bodyParser: false, // Required for multipart/form-data
  },
};

async function uploadToCloudinary(file: File, claimId: string): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return new Promise<string>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: `accident-claims/${claimId}`,
          public_id: `${file.name.split(".")[0]}-${Date.now()}`,
          resource_type: "auto", // image / video / raw (pdf etc.)
          // Optional: transformation: [{ quality: "auto:good" }, { fetch_format: "auto" }]
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else if (result?.secure_url) {
            resolve(result.secure_url);
          } else {
            reject(new Error("No secure_url returned from Cloudinary"));
          }
        }
      )
      .end(buffer);
  });
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const claimId = formData.get("claimId") as string | null;
    const files = formData.getAll("files") as File[];
    const names = formData.getAll("names") as string[]; // one name per file

    if (!claimId || files.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields: claimId and at least one file" },
        { status: 400 }
      );
    }

    if (files.length !== names.length && names.length !== 1) {
      return NextResponse.json(
        { error: "Number of names does not match number of files" },
        { status: 400 }
      );
    }

    // Fetch current documents map from your backend
    let currentDocs: Record<string, string> = {};

    try {
      const getRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/post/claim-documents/${claimId}`,
        {
          headers: {
            // Add auth header if your backend requires it
            // Authorization: `Bearer ${token}`,
          },
        }
      );

      if (getRes.ok) {
        const data = await getRes.json();
        currentDocs = data.documents || {};
      }
      // 404 or error → we start with empty object
    } catch (err) {
      console.warn("Could not fetch existing documents → starting fresh", err);
    }

    // Upload files and assign names
    const uploadedResults: { name: string; url: string }[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Use provided name or fallback to original filename
      let desiredName = (names[i] || file.name).trim();
      if (!desiredName) {
        desiredName = file.name;
      }

      // Sanitize name a bit (remove bad chars, but keep extension)
      desiredName = desiredName.replace(/[^a-zA-Z0-9._-\s]/g, "_");

      const url = await uploadToCloudinary(file, claimId);

      // Handle name collision (very important when replacing / multiple uploads)
      let finalKey = desiredName;
      let counter = 1;
      const [base, ext] = desiredName.includes(".")
        ? [desiredName.slice(0, desiredName.lastIndexOf(".")), desiredName.slice(desiredName.lastIndexOf("."))]
        : [desiredName, ""];

      while (currentDocs[finalKey]) {
        finalKey = `${base}-${counter}${ext}`;
        counter++;
      }

      currentDocs[finalKey] = url;
      uploadedResults.push({ name: finalKey, url });
    }

    // Save updated documents map back to your backend (PUT / PATCH)
    const putRes = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/post/claim-documents/${claimId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          // Add auth header if needed
          // Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ documents: currentDocs }),
      }
    );

    if (!putRes.ok) {
      const errorText = await putRes.text();
      throw new Error(`Backend PUT failed: ${putRes.status} – ${errorText}`);
    }

    const backendResult = await putRes.json();

    return NextResponse.json({
      success: true,
      uploaded: uploadedResults,
      allDocuments: backendResult.documents,
      message: `Successfully uploaded ${files.length} file${files.length === 1 ? "" : "s"}`,
    });
  } catch (error: any) {
    console.error("Upload route error:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to process upload",
      },
      { status: 500 }
    );
  }
}