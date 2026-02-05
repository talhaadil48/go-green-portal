import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

// Email config (same)
const EMAIL_USER = process.env.EMAIL_USER!;
const EMAIL_PASS = process.env.EMAIL_PASS!;
const EMAIL_HOST = process.env.EMAIL_HOST || "smtp.gmail.com";
const EMAIL_PORT = Number(process.env.EMAIL_PORT) || 465;
const EMAIL_SECURE = process.env.EMAIL_SECURE !== "false";

if (!EMAIL_USER || !EMAIL_PASS) {
  console.error("Missing EMAIL_USER or EMAIL_PASS");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      email: fromEmail,
      subject = "Go Green! New Documents Uploaded",
      message = "",
      claimId = "unknown", // you can rename to initiativeId / projectId later
      documents,
    } = body;

    if (
      !documents ||
      !Array.isArray(documents) ||
      documents.length === 0 ||
      !fromEmail
    ) {
      return NextResponse.json(
        { success: false, message: "Missing documents array or email" },
        { status: 400 },
      );
    }

    // Prepare email
    const transporter = nodemailer.createTransport({
      host: EMAIL_HOST,
      port: EMAIL_PORT,
      secure: EMAIL_SECURE,
      auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    });

    // Build document list for HTML (with nice styling)
    const documentItems = documents
      .map(
        (
          doc: { id?: string; name: string; url: string; sizeKb?: string },
          idx: number,
        ) => {
          let displayName = doc.name;

          if (doc.name.startsWith("pre-inspection")) {
            displayName = doc.name.replace(
              /^pre-inspection/,
              "hire-vehicle-checklist",
            );
          } else if (doc.name.startsWith("claim")) {
            displayName = doc.name.replace(/^claim/, "rta-form");
          }

          return `
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #e0f2e9;">
            <strong style="color: #1a3c34;">${idx + 1}.</strong>
            <a href="${doc.url}" style="color: #2e7d32; text-decoration: none; font-weight: 600;">
              ${displayName}
            </a>
          </td>
        </tr>
      `;
        },
      )
      .join("");

    // Sexy Green HTML Template
    const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Go Green! New Upload</title>
</head>
<body style="margin:0; padding:0; background-color:#f0f9f4; font-family: -apple-system, BlinkMacOSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f0f9f4; padding: 20px 10px;">
    <tr>
      <td align="center">
        <!-- Main container -->
        <table role="presentation" width="600" border="0" cellspacing="0" cellpadding="0" style="background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 10px 30px rgba(0,0,0,0.08); max-width:100%;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #2e7d32 0%, #4caf50 100%); padding: 40px 30px 30px; text-align:center;">
              <h1 style="margin:0; color:#ffffff; font-size:32px; font-weight:700; letter-spacing:1px;">
                GO GREEN 🌱
              </h1>
             
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px 30px; color:#1a3c34;">
              <h2 style="margin:0 0 20px; font-size:24px; color:#1b5e20;">
                Hello!
              </h2>
              
              <p style="margin:0 0 24px; font-size:16px; line-height:1.6; color:#2e4a3d;">
                <strong>From:</strong> ${fromEmail}<br>
                <strong>Project / Claim #:</strong> ${claimId}<br>
                <strong>Total files:</strong> ${documents.length}
              </p>

              <p style="margin:0 0 20px; font-size:16px; line-height:1.6; color:#2e4a3d;">
                Fresh documents have been uploaded to support our green journey.
                Let's keep making the planet healthier together!
              </p>

              ${
                message
                  ? `
              <div style="background:#e8f5e9; border-left:4px solid #4caf50; padding:20px; margin:24px 0; border-radius:8px; font-style:italic; color:#1b5e20;">
                <strong>Personal message:</strong><br>
                ${message.replace(/\n/g, "<br>")}
              </div>
              `
                  : ""
              }

              <!-- Documents list -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin:28px 0;">
                <tr>
                  <td style="font-size:18px; font-weight:700; color:#1b5e20; padding-bottom:12px;">
                    Uploaded Documents 🌿
                  </td>
                </tr>
                ${documentItems}
              </table>

              <p style="margin:32px 0 0; text-align:center;">
                <a href="#" style="display:inline-block; background:#4caf50; color:#ffffff; font-weight:600; padding:16px 36px; border-radius:50px; text-decoration:none; font-size:16px; box-shadow:0 4px 14px rgba(76,175,80,0.3);">
                  View All Documents
                </a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#1a3c34; color:#e8f5e9; text-align:center; padding:30px 20px; font-size:14px;">
              
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    const mailOptions: nodemailer.SendMailOptions = {
      from: `"Go Green " <${EMAIL_USER}>`,
      to: fromEmail, // admin / sustainability team
      // cc: fromEmail,        // optional — copy to uploader
      subject: `${subject}`,
      text: `
Go Green! 🌱 New documents uploaded

From: ${fromEmail}
Project/Claim #: ${claimId}
Total documents: ${documents.length}

Documents:
${documents.map((d: any, i: number) => `${i + 1}. ${d.name} → ${d.url}`).join("\n")}

Message:
${message || "(no additional message)"}

Keep up the great sustainable work!
      `.trim(),
      html: htmlBody,
    };

    const info = await transporter.sendMail(mailOptions);

    return NextResponse.json({
      success: true,
      message: `Sexy green email sent with ${documents.length} document links → Message ID: ${info.messageId}`,
    });
  } catch (error: any) {
    console.error("Send-green-docs error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Server error while sending green email",
        error: error.message || "Unknown",
      },
      { status: 500 },
    );
  }
}
