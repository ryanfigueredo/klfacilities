import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function generatePresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 3600
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET!,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

export async function generatePresignedDownloadUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET!,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

interface UploadBufferOptions {
  buffer: Buffer;
  originalName?: string;
  contentType?: string;
  prefix?: string;
}

export async function uploadBufferToS3({
  buffer,
  originalName = 'upload.bin',
  contentType = 'application/octet-stream',
  prefix = 'uploads',
}: UploadBufferOptions): Promise<string> {
  if (!process.env.AWS_S3_BUCKET) {
    throw new Error('AWS_S3_BUCKET env var is not configured');
  }

  const sanitizedName = originalName.replace(/\s+/g, '-');
  const key = `${prefix}/${randomUUID()}-${sanitizedName}`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET!,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: 'max-age=31536000,immutable',
    })
  );

  const region = process.env.AWS_REGION || 'us-east-1';
  return `https://${process.env.AWS_S3_BUCKET}.s3.${region}.amazonaws.com/${key}`;
}
