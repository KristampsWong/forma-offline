import { S3Client } from "@aws-sdk/client-s3"

import { isBuildTime } from "@/lib/env"

let client: S3Client | null = null

export function getS3Client(): S3Client {
  if (isBuildTime()) {
    throw new Error("S3 client is not available during build time")
  }

  if (!client) {
    const region = process.env.AWS_S3_REGION
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY

    if (!region || !accessKeyId || !secretAccessKey) {
      throw new Error(
        "Missing required S3 environment variables: AWS_S3_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY"
      )
    }

    client = new S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey },
    })
  }
  return client
}

export function getS3Bucket(): string {
  const bucket = process.env.AWS_S3_BUCKET
  if (!bucket) {
    throw new Error("Missing required environment variable: AWS_S3_BUCKET")
  }
  return bucket
}
