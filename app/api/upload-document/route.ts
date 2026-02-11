import { NextRequest, NextResponse } from "next/server";
import { uploadToS3 } from "@/lib/s3";

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const claimId = formData.get("claimId") as string | null;
    const files = formData.getAll("files") as File[];
    const names = formData.getAll("names") as string[];

    if (!claimId || files.length === 0) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (files.length !== names.length && names.length !== 1) {
      return NextResponse.json({ error: "Names count mismatch" }, { status: 400 });
    }

    let currentDocs: Record<string, string> = {};

    try {
      const getRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/post/claim-documents/${claimId}`);
      if (getRes.ok) {
        const data = await getRes.json();
        currentDocs = data.documents || {};
      }
    } catch {
      currentDocs = {};
    }

    const uploadedResults: { name: string; url: string }[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      let desiredName = (names[i] || file.name).trim();
      if (!desiredName) desiredName = file.name;
      desiredName = desiredName.replace(/[^a-zA-Z0-9._-\s]/g, "_");

      const url = await uploadToS3(file, claimId);

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

    const putRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/post/claim-documents/${claimId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documents: currentDocs }),
    });

    if (!putRes.ok) throw new Error("Backend PUT failed");
    const backendResult = await putRes.json();

    return NextResponse.json({
      success: true,
      uploaded: uploadedResults,
      allDocuments: backendResult.documents,
      message: `Successfully uploaded ${files.length} file(s)`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
