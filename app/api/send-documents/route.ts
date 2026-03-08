import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

const EMAIL_USER = process.env.EMAIL_USER!;
const EMAIL_PASS = process.env.EMAIL_PASS!;
const EMAIL_HOST = process.env.EMAIL_HOST || "smtp.gmail.com";
const EMAIL_PORT = Number(process.env.EMAIL_PORT) || 465;
const EMAIL_SECURE = process.env.EMAIL_SECURE !== "false";

if (!EMAIL_USER || !EMAIL_PASS) {
  console.error("Missing EMAIL_USER or EMAIL_PASS in environment variables");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      email: recipientEmail,
      subject = "New Documents Uploaded",
      message = "",
      claimId = "—",
      documents,
    } = body;

    if (!documents || !Array.isArray(documents) || documents.length === 0 || !recipientEmail) {
      return NextResponse.json(
        { success: false, message: "Missing documents array or recipient email" },
        { status: 400 },
      );
    }

    // Prepare nodemailer transporter
    const transporter = nodemailer.createTransport({
      host: EMAIL_HOST,
      port: EMAIL_PORT,
      secure: EMAIL_SECURE,
      auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    });

    // Normalize document names for display
    const documentItems = documents
      .map(
        (
          doc: { id?: string; name: string; url: string; sizeKb?: string },
          idx: number,
        ) => {
          let displayName = doc.name;

          if (doc.name.startsWith("pre-inspection")) {
            displayName = doc.name.replace(/^pre-inspection/, "Hire Vehicle Checklist");
          } else if (doc.name.startsWith("claim")) {
            displayName = doc.name.replace(/^claim/, "RTA Form");
          }

          return `
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0;">
                <strong>${idx + 1}.</strong> 
                <a href="${doc.url}" style="color: #0066cc; text-decoration: none; font-weight: 500;">
                  ${displayName}
                </a>
              </td>
            </tr>
          `;
        },
      )
      .join("");

    // Clean, professional HTML email template
    const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Documents Uploaded</title>
</head>
<body style="margin:0; padding:0; background-color:#f6f8fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#333;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f6f8fa; padding: 30px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" border="0" cellspacing="0" cellpadding="0" style="background-color:#ffffff; border-radius:8px; max-width:100%; border:1px solid #e0e0e0;">
          
          <!-- Header -->
          <tr>
            <td style="background-color:#f0f4f8; padding: 30px; text-align:center; border-top-left-radius:8px; border-top-right-radius:8px;">
              <h1 style="margin:0; color:#2c3e50; font-size:24px; font-weight:600;">
                Documents Uploaded
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 30px; line-height:1.6; color:#444;">
              <p style="margin:0 0 20px; font-size:16px;">
                Hello,
              </p>

            

              <p style="margin:0 0 8px; font-size:16px;">
                <strong>Total files:</strong> ${documents.length}
              </p>

              ${
                message
                  ? `
              <div style="background:#f8f9fa; border-left:4px solid #3498db; padding:16px 20px; margin:24px 0; border-radius:4px;">
                <strong>Message:</strong><br>
                ${message.replace(/\n/g, "<br>")}
              </div>
              `
                  : ""
              }

              <p style="margin:32px 0 16px; font-size:16px; font-weight:500;">
                Documents:
              </p>

              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                ${documentItems}
              </table>

              <p style="margin:24px 0 0; font-size:15px; color:#555;">
                <em>Click on the document names above to view or download them.</em>
              </p>

              <p style="margin:32px 0 0; font-size:15px;">
                Regards,<br>
                The Go Green Team
              </p>
            </td>
          </tr>

          <!-- Footer -->
         
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    const mailOptions = {
      from: `"Go Green" <${EMAIL_USER}>`,
      to: [recipientEmail], // add more recipients as needed
      subject: subject,
      text: `
New documents uploaded

Project/Claim #: ${claimId}
Total documents: ${documents.length}

Documents:
${documents.map((d: any, i: number) => `${i + 1}. ${d.name} → ${d.url}`).join("\n")}

${message ? `Message:\n${message}\n` : ""}
Click the links above to view or download the files.

Regards,
Go Green Team
      `.trim(),
      html: htmlBody,
    };

    const info = await transporter.sendMail(mailOptions);

    return NextResponse.json({
      success: true,
      message: `Email sent successfully (${documents.length} documents) → Message ID: ${info.messageId}`,
    });
  } catch (error: any) {
    console.error("Email sending error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to send email",
        error: error.message || "Unknown error",
      },
      { status: 500 },
    );
  }
}