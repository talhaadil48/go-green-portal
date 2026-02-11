// app/signature/page.tsx
"use client";

import { useEffect, useState } from "react";

export default function SignaturePage() {
  const [signatureSrc, setSignatureSrc] = useState("/placeholder.svg");

  // Your S3 URL
  const signatureUrl = "https://gogreen11.s3.amazonaws.com/accident-claims/general/hirer_signature_insurance-c0ca05bb-9986-4b0d-a7ef-be9f2afe0903.png";

  useEffect(() => {
    async function checkSignature() {
      try {
        const res = await fetch(signatureUrl, { method: "HEAD" }); // check if file exists
        if (res.ok) {
          setSignatureSrc(signatureUrl);
        } else {
          setSignatureSrc("/placeholder.svg");
        }
      } catch (err) {
        console.error("Error fetching signature:", err);
        setSignatureSrc("/placeholder.svg");
      }
    }

    checkSignature();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-xl font-bold mb-4">Liability Signature</h1>
      <img
        src={signatureSrc}
        alt="Liability signature"
        className="max-h-40 mx-auto object-contain border border-gray-300 p-2"
      />
    </div>
  );
}