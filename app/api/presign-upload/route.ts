import { NextRequest, NextResponse } from "next/server";
import { generatePresignedUrl } from "@/lib/s3";

export async function POST(req: NextRequest) {
  try {
    const { claimId, files } = await req.json() as {
      claimId: string;
      files: { name: string; type: string }[];
    };

    if (!claimId || !files?.length) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const results = files.map(({ name, type }) =>
      generatePresignedUrl(claimId, name, type)
    );

    return NextResponse.json({ results });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to generate presigned URLs" }, { status: 500 });
  }
}