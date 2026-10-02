import fs from "node:fs";
import path from "node:path";
import { parse } from "smol-toml";

export interface InstagramConfig {
  account_id: string;
  access_token: string;
}

export interface StorageConfig {
  provider: "r2" | "s3";
  bucket: string;
  access_key_id: string;
  secret_access_key: string;
  endpoint?: string;
  region?: string;
  public_url_base: string;
}

export interface AppConfig {
  instagram: InstagramConfig;
  storage: StorageConfig;
}

export function loadConfig(configPath: string): AppConfig {
  const resolvedPath = path.resolve(process.cwd(), configPath);

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(
      `設定ファイルが見つかりません: ${resolvedPath}\n` +
      `例として 'config.toml.example' を 'config.toml' にコピーして編集してください。`
    );
  }

  const rawContent = fs.readFileSync(resolvedPath, "utf-8");
  let parsed: any;
  try {
    parsed = parse(rawContent);
  } catch (err: any) {
    throw new Error(`TOMLのパースに失敗しました (${resolvedPath}): ${err.message}`);
  }

  // バリデーション
  if (!parsed.instagram) {
    throw new Error("設定ファイルに [instagram] セクションがありません。");
  }
  if (!parsed.instagram.account_id) {
    throw new Error("[instagram] に 'account_id' が指定されていません。");
  }
  if (!parsed.instagram.access_token) {
    throw new Error("[instagram] に 'access_token' が指定されていません。");
  }

  if (!parsed.storage) {
    throw new Error("設定ファイルに [storage] セクションがありません。");
  }
  if (!parsed.storage.provider || !["r2", "s3"].includes(parsed.storage.provider.toLowerCase())) {
    throw new Error("[storage] の 'provider' には 'r2' または 's3' を指定してください。");
  }
  if (!parsed.storage.bucket) {
    throw new Error("[storage] に 'bucket' が指定されていません。");
  }
  if (!parsed.storage.access_key_id) {
    throw new Error("[storage] に 'access_key_id' が指定されていません。");
  }
  if (!parsed.storage.secret_access_key) {
    throw new Error("[storage] に 'secret_access_key' が指定されていません。");
  }
  if (!parsed.storage.public_url_base) {
    throw new Error(
      "[storage] に 'public_url_base' が指定されていません。\n" +
      "Instagram側がアクセスするための公開URLベース (例: https://pub-xxxx.r2.dev や https://your-bucket.s3.amazonaws.com) を設定してください。"
    );
  }

  // R2の場合はendpointの指定を推奨/チェック
  if (parsed.storage.provider.toLowerCase() === "r2" && !parsed.storage.endpoint) {
    throw new Error(
      "Cloudflare R2 を使用する場合、[storage] の 'endpoint' (例: https://<account_id>.r2.cloudflarestorage.com) が必要です。"
    );
  }

  return {
    instagram: {
      account_id: String(parsed.instagram.account_id).trim(),
      access_token: String(parsed.instagram.access_token).trim(),
    },
    storage: {
      provider: parsed.storage.provider.toLowerCase() as "r2" | "s3",
      bucket: String(parsed.storage.bucket).trim(),
      access_key_id: String(parsed.storage.access_key_id).trim(),
      secret_access_key: String(parsed.storage.secret_access_key).trim(),
      endpoint: parsed.storage.endpoint ? String(parsed.storage.endpoint).trim() : undefined,
      region: parsed.storage.region ? String(parsed.storage.region).trim() : (parsed.storage.provider === "r2" ? "auto" : "us-east-1"),
      public_url_base: String(parsed.storage.public_url_base).trim().replace(/\/+$/, ""),
    },
  };
}
