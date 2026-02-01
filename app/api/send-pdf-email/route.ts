import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// IMPORTANT: Add these to your .env.local (and .env for production)
const EMAIL_USER     = process.env.EMAIL_USER;     // your Gmail / SMTP email
const EMAIL_PASS     = process.env.EMAIL_PASS;     // app password if using Gmail
const EMAIL_HOST     = 'smtp.gmail.com';
const EMAIL_PORT     = 465
const EMAIL_SECURE   = true; // true for 465, false for other ports

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const file     = formData.get('file') as File | null;
    const email    = formData.get('email')    as string;
    const subject  = formData.get('subject')  as string || 'New Document Submission';
    const formType = formData.get('formType') as string || 'document';
    const claimId  = formData.get('claimId')  as string || 'unknown';
    console.log(EMAIL_USER,EMAIL_PASS)

    if (!file || !email) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: file and email' },
        { status: 400 }
      );
    }

    // Convert uploaded File → Buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = `${formType}-${claimId}.pdf`;

    // ────────────────────────────────────────────────
    //          Nodemailer transporter setup
    // ────────────────────────────────────────────────
    const transporter = nodemailer.createTransport({
      host: EMAIL_HOST,
      port: EMAIL_PORT,
      secure: EMAIL_SECURE,           // true for 465, false for other ports
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
    });

    // Verify connection (good for debugging – optional in production)
    // await transporter.verify();

    // Email content
    const mailOptions = {
      from: `"Claim System" <${EMAIL_USER}>`,
      to: email,           // or use email variable if you want to send to the user
      // cc: email,                    // ← uncomment if you want to CC the submitter
      replyTo: email,                  // so replies go to the person who submitted
      subject: `${subject} – ${formType} #${claimId}`,
      text: `A new ${formType} document has been submitted.\n\n` +
            `From: ${email}\n` +
            `Claim ID: ${claimId}\n` +
            `File: ${fileName}\n` +
            `Size: ${(buffer.length / 1024).toFixed(1)} KB`,
      attachments: [
        {
          filename: fileName,
          content: buffer,
          contentType: 'application/pdf',
        },
      ],
    };

    // Send the email
    const info = await transporter.sendMail(mailOptions);

    console.log('Email sent → Message ID:', info.messageId);

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
      messageId: info.messageId,
    });

  } catch (error: any) {
    console.error('Email send error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to send email',
        error: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
