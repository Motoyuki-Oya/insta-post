import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import mime from "mime-types";
import { StorageConfig } from "./config.js";

export class StorageService {
  private client: S3Client;
  private config: StorageConfig;

  constructor(config: StorageConfig) {
    this.config = config;

    this.client = new S3Client({
      region: config.region || "auto",
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.access_key_id,
        secretAccessKey: config.secret_access_key,
      },
      // Cloudflare R2 では path-style が推奨される場合があるが、通常S3Clientは自動ハンドリング
      forcePathStyle: config.provider === "r2",
    });
  }

  /**
   * ローカルファイルをS3/R2に一時アップロード
   */
  async uploadFile(filePath: string): Promise<{ key: string; publicUrl: string }> {
    const resolvedPath = path.resolve(process.cwd(), filePath);
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`ファイルが見つかりません: ${resolvedPath}`);
    }

    const fileBuffer = fs.readFileSync(resolvedPath);
    const ext = path.extname(resolvedPath).toLowerCase();
    const contentType = mime.lookup(resolvedPath) || "application/octet-stream";

    // 一意のキー名を生成（例: temp-insta-uploads/20260926-xxxx.png）
    const randomHex = crypto.randomBytes(8).toString("hex");
    const timestamp = Date.now();
    const key = `temp-insta-uploads/${timestamp}-${randomHex}${ext}`;

    const command = new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
    });

    try {
      await this.client.send(command);
    } catch (err: any) {
      throw new Error(`ストレージへのアップロードに失敗しました (${this.config.provider}): ${err.message}`);
    }

    const publicUrl = `${this.config.public_url_base}/${key}`;
    return { key, publicUrl };
  }

  /**
   * 一時アップロードされたファイルをS3/R2から削除
   */
  async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
    });

    try {
      await this.client.send(command);
    } catch (err: any) {
      console.warn(`[WARN] 一時ファイルの削除に失敗しました (key: ${key}): ${err.message}`);
    }
  }
}
