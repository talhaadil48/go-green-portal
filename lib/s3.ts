// lib/s3.ts
import AWS from "aws-sdk";
import { v4 as uuidv4 } from "uuid";

// Generate key (folder + unique filename)

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION, // same as your bucket
});

export async function uploadToS3(file: File, claimId: string): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  console.log(process.env.AWS_S3_BUCKET_NAME);

  const fileExtension = file.name.split(".").pop();
  const uniqueId = uuidv4(); // generates a unique ID
  const fileName = `${file.name.split(".")[0]}-${uniqueId}.${fileExtension}`;
  const key = `accident-claims/${claimId}/${fileName}`;
  const params = {
    Bucket: process.env.AWS_S3_BUCKET_NAME!,
    Key: key,
    Body: buffer,
    ContentType: file.type,
  };

  return new Promise((resolve, reject) => {
    s3.upload(params, (err, data) => {
      if (err) reject(err);
      else resolve(data.Location); // URL of the uploaded file
    });
  });
}
