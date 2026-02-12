"use client";

import jsPDF from "jspdf";

export default function Page() {
  const generatePDF = async () => {
    try {
      const imageUrl =
        "https://gogreenstorage111.s3.amazonaws.com/accident-claims/00000/client_signature-2374b942-0ea6-4b4f-b8bb-33b53455125c.png";

      // 1️⃣ Fetch image
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error("Image fetch failed");

      const blob = await response.blob();

      // 2️⃣ Convert blob → Base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
      });

      // 3️⃣ Create PDF
      const pdf = new jsPDF();

      // 4️⃣ Add Image using addImage()
      pdf.addImage(
        base64,   // image data
        "PNG",    // format
        20,       // x position
        40,       // y position
        100,      // width
        50        // height
      );

      // 5️⃣ Download
      pdf.save("signature.pdf");

    } catch (error) {
      console.error(error);
      alert("Error generating PDF");
    }
  };

  return (
    <div style={{ padding: "40px" }}>
      <button onClick={generatePDF}>
        Generate PDF
      </button>
      <img src="https://gogreenstorage111.s3.amazonaws.com/accident-claims/00000/client_signature-2374b942-0ea6-4b4f-b8bb-33b53455125c.png" alt="Signature" className="h-100 w-100" />
    </div>
  );
}