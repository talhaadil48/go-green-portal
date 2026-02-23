import fetch from "node-fetch";

export async function GET(req : Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");

  if (!url) {
    return new Response(JSON.stringify({ error: "No URL provided" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch image");

    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    let mime = "image/jpeg";
    if (url.endsWith(".png")) mime = "image/png";
    else if (url.endsWith(".gif")) mime = "image/gif";

    return new Response(
      JSON.stringify({ base64: `data:${mime};base64,${base64}` }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: "Failed to fetch image" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}