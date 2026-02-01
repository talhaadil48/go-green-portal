import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// ┌──────────────────────────────────────────────────────────────┐
// │               Load from .env (recommended)                   │
// └──────────────────────────────────────────────────────────────┘
const EMAIL_USER   = process.env.EMAIL_USER;
const EMAIL_PASS   = process.env.EMAIL_PASS;
const EMAIL_HOST   = process.env.EMAIL_HOST   || 'smtp.gmail.com';
const EMAIL_PORT   = Number(process.env.EMAIL_PORT) || 465;
const EMAIL_SECURE = process.env.EMAIL_SECURE !== 'false'; // true for 465

// Optional: where the email should go (admin / company inbox)
// You can override this per request if needed
const RECIPIENT_EMAIL = process.env.RECIPIENT_EMAIL || EMAIL_USER;

if (!EMAIL_USER || !EMAIL_PASS) {
  console.error('Missing EMAIL_USER or EMAIL_PASS in environment variables');
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const fileCount    = parseInt(formData.get('fileCount') as string) || 0;
    const email        = formData.get('email')        as string;
    const subject      = formData.get('subject')      as string || 'New Documents Submission';
    const message      = formData.get('message')      as string || '';
    const claimId      = formData.get('claimId')      as string || 'unknown';
    const documentTypes = formData.get('documentTypes') as string || 'multiple documents';

    if (fileCount === 0 || !email) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: at least one file and email' },
        { status: 400 }
      );
    }

    // Collect all files
    const attachments: nodemailer.Attachment[] = [];
    const fileDetails: string[] = [];

    for (let i = 0; i < fileCount; i++) {
      const file = formData.get(`file_${i}`) as File | null;
      if (file && file.size > 0) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_'); // sanitize filename

        attachments.push({
          filename: safeName,
          content: buffer,
          contentType: file.type || 'application/octet-stream',
        });

        fileDetails.push(
          `• ${safeName} (${(buffer.length / 1024).toFixed(1)} KB)`
        );
      }
    }

    if (attachments.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No valid files received' },
        { status: 400 }
      );
    }

    // ────────────────────────────────────────────────
    //          Nodemailer transporter
    // ────────────────────────────────────────────────
    const transporter = nodemailer.createTransport({
      host: EMAIL_HOST,
      port: EMAIL_PORT,
      secure: EMAIL_SECURE,
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
    });

    // Optional: test connection (uncomment during dev)
    // await transporter.verify();
    // console.log('SMTP connection verified');

    // Build nice email body
    const textBody = 
      `New document submission received!\n\n` +
      `From: ${email}\n` +
      `Claim ID: ${claimId}\n` +
      `Document types: ${documentTypes}\n` +
      `Message:\n${message || '(no message provided)'}\n\n` +
      `Attached files (${attachments.length}):\n` +
      fileDetails.join('\n');

    const mailOptions: nodemailer.SendMailOptions = {
      from: `"Claim System" <${EMAIL_USER}>`,
      to: email,              // admin / company email
      replyTo: email,                   // so replies go to submitter
      subject: `${subject} – Claim #${claimId} (${attachments.length} file${attachments.length === 1 ? '' : 's'})`,
      text: textBody,
      // html: `<pre>${textBody}</pre>`,   // ← uncomment + improve if you want HTML
      attachments,
    };

    // Send!
    const info = await transporter.sendMail(mailOptions);

    console.log('Multi-document email sent → Message ID:', info.messageId);

    return NextResponse.json({
      success: true,
      message: `${attachments.length} document(s) sent successfully`,
      messageId: info.messageId,
    });

  } catch (error: any) {
    console.error('Multi-document email error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to send documents',
        error: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Very important for file uploads (multipart/form-data)
export const config = {
  api: {
    bodyParser: false,
  },
};