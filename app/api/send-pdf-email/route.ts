// app/api/send-email/route.ts
import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export const runtime = 'nodejs'; // ✅ Use Node.js runtime to allow bigger uploads

const EMAIL_USER   = process.env.EMAIL_USER;
const EMAIL_PASS   = process.env.EMAIL_PASS;
const EMAIL_HOST   = 'smtp.gmail.com';
const EMAIL_PORT   = 465;
const EMAIL_SECURE = true;

const MAX_FILE_SIZE_MB = 20; // max allowed file size

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const file     = formData.get('file') as File | null;
    const email    = formData.get('email') as string;
    const subject  = (formData.get('subject') as string) || 'New Document Submission';
    let formType = (formData.get('formType') as string) || 'document';
    const claimId  = (formData.get('claimId') as string) || 'unknown';
    if (formType === "pre-inspection") {
      formType = "Hire Checklist";
    }

    if (!file || !email) {
      return NextResponse.json({ success: false, message: 'Missing required fields: file and email' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const sizeInBytes = buffer.length;
    const sizeInKB = (sizeInBytes / 1024).toFixed(2);
    const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(2);

    console.log(`File name: ${file.name}`);
    console.log(`File size: ${sizeInBytes} bytes / ${sizeInKB} KB / ${sizeInMB} MB`);

    if (parseFloat(sizeInMB) > MAX_FILE_SIZE_MB) {
      return NextResponse.json({
        success: false,
        message: `File is too large! Max allowed size is ${MAX_FILE_SIZE_MB} MB.`,
      }, { status: 413 }); // 413 Payload Too Large
    }

    const fileName = `${formType}-${claimId}.pdf`;

    const transporter = nodemailer.createTransport({
      host: EMAIL_HOST,
      port: EMAIL_PORT,
      secure: EMAIL_SECURE,
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"Claim System" <${EMAIL_USER}>`,
      to: email,
      replyTo: email,
      subject: `${subject} – ${formType} #${claimId}`,
      text: `A new ${formType} document has been submitted.\n\n` +
            `Claim ID: ${claimId}\nFile: ${fileName}\n`,
           
      attachments: [
        {
          filename: fileName,
          content: buffer,
          contentType: 'application/pdf',
        },
      ],
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent → Message ID:', info.messageId);

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
      messageId: info.messageId,
      fileSizeMB: sizeInMB,
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
