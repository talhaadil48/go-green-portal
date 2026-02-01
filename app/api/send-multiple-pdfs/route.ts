import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Load from .env (same as before)
const EMAIL_USER   = process.env.EMAIL_USER;
const EMAIL_PASS   = process.env.EMAIL_PASS;
const EMAIL_HOST   = process.env.EMAIL_HOST   || 'smtp.gmail.com';
const EMAIL_PORT   = Number(process.env.EMAIL_PORT) || 465;
const EMAIL_SECURE = process.env.EMAIL_SECURE !== 'false';

const RECIPIENT_EMAIL = process.env.RECIPIENT_EMAIL || EMAIL_USER;

if (!EMAIL_USER || !EMAIL_PASS) {
  console.error('Missing EMAIL_USER or EMAIL_PASS in environment variables');
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const fileCount    = parseInt(formData.get('fileCount') as string) || 0;
    const email        = formData.get('email')        as string;
    const subject      = formData.get('subject')      as string || 'New Document Submission';
    const message      = formData.get('message')      as string || '';
    const claimId      = formData.get('claimId')      as string || 'unknown';
    // We no longer use documentTypes for the main list — we'll handle per email

    if (fileCount === 0 || !email) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: at least one file and email' },
        { status: 400 }
      );
    }

    // Collect all files (same as before)
    const attachments: { file: File; buffer: Buffer; safeName: string; sizeKb: string }[] = [];

    for (let i = 0; i < fileCount; i++) {
      const file = formData.get(`file_${i}`) as File | null;
      if (file && file.size > 0) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');

        attachments.push({
          file,
          buffer,
          safeName,
          sizeKb: (buffer.length / 1024).toFixed(1),
        });
      }
    }

    if (attachments.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No valid files received' },
        { status: 400 }
      );
    }

    // Create transporter **once** — reuse it
    const transporter = nodemailer.createTransport({
      host: EMAIL_HOST,
      port: EMAIL_PORT,
      secure: EMAIL_SECURE,
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
    });

    // Optional: verify in dev
    // await transporter.verify();

    // Send one email per attachment
    const results = [];
    const errors: string[] = [];

    for (const att of attachments) {
      const textBody = 
        `New document submission received!\n\n` +
        `From: ${email}\n` +
        `Claim ID: ${claimId}\n` +
        `Document: ${att.safeName} (${att.sizeKb} KB)\n` +
        `Message:\n${message || '(no message provided)'}\n\n` +
        `(This email contains only this one document)`;

      const mailOptions: nodemailer.SendMailOptions = {
        from: `"Claim System" <${EMAIL_USER}>`,
        to: RECIPIENT_EMAIL,           // where documents should arrive (admin/company)
        replyTo: email,                // replies go back to submitter
        subject: `${subject} – Claim #${claimId} – ${att.safeName}`,
        text: textBody,
        // html: `<pre>${textBody}</pre>`,   // optional – improve later
        attachments: [{
          filename: att.safeName,
          content: att.buffer,
          contentType: att.file.type || 'application/octet-stream',
        }],
      };

      try {
        const info = await transporter.sendMail(mailOptions);
        results.push({
          filename: att.safeName,
          messageId: info.messageId,
        });
        console.log(`Email sent for ${att.safeName} → Message ID:`, info.messageId);
      } catch (err: any) {
        console.error(`Failed to send ${att.safeName}:`, err);
        errors.push(att.safeName);
      }
    }

    if (results.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Failed to send any documents' },
        { status: 500 }
      );
    }

    const summary = 
      `Sent ${results.length} of ${attachments.length} document(s) successfully to ${RECIPIENT_EMAIL}.\n` +
      (errors.length > 0 ? `Failed: ${errors.join(', ')}` : '');

    return NextResponse.json({
      success: results.length === attachments.length,
      message: summary,
      sent: results,
      failed: errors,
    });

  } catch (error: any) {
    console.error('Multi-email error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Server error while processing documents',
        error: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}