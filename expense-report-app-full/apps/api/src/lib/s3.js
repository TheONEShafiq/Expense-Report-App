import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export function s3() {
  const endpoint = process.env.S3_ENDPOINT;
  const forcePathStyle = String(process.env.S3_FORCE_PATH_STYLE || "true") === "true";
  return new S3Client({
    region: process.env.S3_REGION || "us-east-1",
    endpoint,
    forcePathStyle,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY || "minioadmin",
      secretAccessKey: process.env.S3_SECRET_KEY || "minioadmin",
    },
  });
}

export async function putObject({ Bucket, Key, Body, ContentType }) {
  const client = s3();
  const cmd = new PutObjectCommand({ Bucket, Key, Body, ContentType });
  return client.send(cmd);
}
