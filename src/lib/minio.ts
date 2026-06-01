import * as Minio from 'minio';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import { env } from '../config/env';

export const minioClient = new Minio.Client({
  endPoint: env.MINIO_ENDPOINT,
  port: env.MINIO_PORT,
  useSSL: env.MINIO_USE_SSL,
  accessKey: env.MINIO_ROOT_USER,
  secretKey: env.MINIO_ROOT_PASSWORD,
});

export async function uploadFile(
  file: Express.Multer.File,
  folder: string
): Promise<string> {
  const ext = file.originalname.split('.').pop();
  const objectName = `${folder}/${uuidv4()}.${ext}`;

  await minioClient.putObject(
    env.MINIO_BUCKET_NAME,
    objectName,
    file.buffer,
    file.size,
    { 'Content-Type': file.mimetype }
  );

  return `${env.MINIO_PUBLIC_URL}/${objectName}`;
}

export async function deleteFile(url: string): Promise<void> {
  const objectName = url.replace(`${env.MINIO_PUBLIC_URL}/`, '');
  await minioClient.removeObject(env.MINIO_BUCKET_NAME, objectName);
}

export async function getPresignedUrl(objectName: string, expirySeconds = 3600): Promise<string> {
  return minioClient.presignedGetObject(env.MINIO_BUCKET_NAME, objectName, expirySeconds);
}

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'));
    }
  },
});
