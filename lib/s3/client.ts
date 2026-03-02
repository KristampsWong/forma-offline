import { S3Client } from "@aws-sdk/client-s3"

let client: S3Client | null = null

export function getS3Client(): S3Client {
  if (!client) {
    client = new S3Client({
      region: process.env.AWS_S3_REGION!,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    })
  }
  return client
}

export function getS3Bucket(): string {
  return process.env.AWS_S3_BUCKET!
}
