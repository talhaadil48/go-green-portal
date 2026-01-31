import { NextRequest, NextResponse } from 'next/server';
import cloudinary from 'cloudinary';

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export async function POST(req: NextRequest) {
  try {
    const fullData = await req.json();

    // Function to upload a data URL to Cloudinary and return the secure URL
    const uploadToCloudinary = async (dataUrl: string, fieldName: string): Promise<string> => {
      if (!dataUrl) return ''; // Skip if no data

      try {
        const result = await cloudinary.v2.uploader.upload(dataUrl, {
          folder: 'accident-claims', // Organize in a folder
          public_id: `${fieldName}-${Date.now()}`, // Unique name
          resource_type: 'image',
        });
        return result.secure_url;
      } catch (uploadError) {
        console.error(`Error uploading ${fieldName} to Cloudinary:`, uploadError);
        throw uploadError; // Rethrow to handle in outer try-catch
      }
    };

    // Upload images if they exist (replace data URLs with Cloudinary URLs)
    if (fullData.client_signature) {
      fullData.client_signature = await uploadToCloudinary(fullData.client_signature, 'client_signature');
    }
    if (fullData.circumstance_drawing) {
      fullData.circumstance_drawing = await uploadToCloudinary(fullData.circumstance_drawing, 'circumstance_drawing');
    }
    if (fullData.direction_before_drawing) {
      fullData.direction_before_drawing = await uploadToCloudinary(fullData.direction_before_drawing, 'direction_before_drawing');
    }
    if (fullData.direction_after_drawing) {
      fullData.direction_after_drawing = await uploadToCloudinary(fullData.direction_after_drawing, 'direction_after_drawing');
    }

    // Construct JSON and print to terminal (server console)
    const jsonOutput = JSON.stringify(fullData, null, 2);
    console.log('Submitted Accident Claim JSON:');
    console.log(jsonOutput);

    // Respond with success
    return NextResponse.json({ success: true, message: 'Form submitted and logged successfully.' }, { status: 200 });
  } catch (error) {
    console.error('Error processing submission:', error);
    return NextResponse.json({ success: false, message: 'Submission failed.' }, { status: 500 });
  }
}