#!/usr/bin/env node

import { Command } from "commander";
import { loadConfig } from "./config.js";
import { StorageService } from "./storage.js";
import { InstagramService } from "./instagram.js";

const program = new Command();

program
  .name("insta-post")
  .description("AI画像や動画をS3/R2経由でInstagram Graph APIに投稿する軽量CLIツール")
  .version("1.0.0")
  .option("-i, --image <path>", "投稿する画像ファイルのパス")
  .option("-v, --video <path>", "投稿する動画ファイル（リール）のパス")
  .option("-m, --images <paths...>", "カルーセル投稿用の複数画像ファイルパス（最大10枚）")
  .option("-c, --caption <caption>", "投稿に付けるキャプション", "")
  .option("--config <path>", "設定ファイルのパス", "config.toml")
  .option("--keep-remote", "投稿完了後にS3/R2の一時ファイルを削除せず残す", false)
  .option("--dry-run", "実際のInstagram投稿は行わず、設定検証とストレージアップロード・疎通確認のみ行う", false);

program.parse(process.argv);
const options = program.opts();

async function main() {
  // 引数チェック
  const hasImage = Boolean(options.image);
  const hasVideo = Boolean(options.video);
  const hasMultipleImages = Boolean(options.images && options.images.length > 0);

  const modeCount = [hasImage, hasVideo, hasMultipleImages].filter(Boolean).length;

  if (modeCount === 0) {
    console.error("エラー: 投稿するメディアを指定してください。");
    console.error("使用例:");
    console.error("  node insta-post.cjs --image ./art.png --caption 'My AI Artwork #aiart'");
    console.error("  node insta-post.cjs --video ./video.mp4 --caption 'My AI Reel #aivideo'");
    console.error("  node insta-post.cjs --images ./1.png ./2.png --caption 'My AI Carousel'");
    process.exit(1);
  }

  if (modeCount > 1) {
    console.error("エラー: --image, --video, --images のいずれか1つのみを指定してください。");
    process.exit(1);
  }

  console.log("=========================================");
  console.log("   Instagram Post CLI (Graph API)        ");
  console.log("=========================================");

  // 1. 設定ファイルの読み込み
  console.log(`[1/4] 設定ファイル読み込み中 (${options.config})...`);
  const config = loadConfig(options.config);
  console.log(`  ✓ 設定完了: アカウントID [${config.instagram.account_id}], ストレージ [${config.storage.provider.toUpperCase()}]`);

  const storage = new StorageService(config.storage);
  const instagram = new InstagramService(config.instagram);

  const uploadedKeys: string[] = [];

  try {
    // 2. メディアのアップロード
    if (hasImage) {
      console.log(`[2/4] 画像を一時ストレージにアップロード中: ${options.image}`);
      const { key, publicUrl } = await storage.uploadFile(options.image);
      uploadedKeys.push(key);
      console.log(`  ✓ アップロード完了: ${publicUrl}`);

      if (options.dryRun) {
        console.log("\n[DRY RUN] Instagramへの投稿はスキップされました。");
        return;
      }

      // 3. Instagramコンテナ作成
      console.log(`[3/4] Instagram メディアコンテナ作成中...`);
      const containerId = await instagram.createImageContainer(publicUrl, options.caption);
      console.log(`  ✓ コンテナ作成完了 (ID: ${containerId})`);

      // 4. 公開
      console.log(`[4/4] Instagramへ投稿公開中...`);
      const postId = await instagram.publishMedia(containerId);
      console.log(`\n🎉 投稿が正常に公開されました！`);
      console.log(`  Post ID: ${postId}`);
    } else if (hasVideo) {
      console.log(`[2/4] 動画を一時ストレージにアップロード中: ${options.video}`);
      const { key, publicUrl } = await storage.uploadFile(options.video);
      uploadedKeys.push(key);
      console.log(`  ✓ アップロード完了: ${publicUrl}`);

      if (options.dryRun) {
        console.log("\n[DRY RUN] Instagramへの投稿はスキップされました。");
        return;
      }

      // 3. Instagram動画コンテナ作成
      console.log(`[3/4] Instagram リールコンテナ作成中...`);
      const containerId = await instagram.createVideoContainer(publicUrl, options.caption);
      console.log(`  ✓ コンテナID: ${containerId}`);

      console.log(`  Meta側の動画処理完了を待機中 (数十秒かかる場合があります)...`);
      await instagram.waitForContainerReady(containerId);
      console.log(`  ✓ メディア処理完了`);

      // 4. 公開
      console.log(`[4/4] Instagramへ投稿公開中...`);
      const postId = await instagram.publishMedia(containerId);
      console.log(`\n🎉 リール動画が正常に公開されました！`);
      console.log(`  Post ID: ${postId}`);
    } else if (hasMultipleImages) {
      const imagePaths: string[] = options.images;
      if (imagePaths.length > 10) {
        throw new Error("カルーセル投稿は最大10枚までです。");
      }
      console.log(`[2/4] カルーセル画像 (${imagePaths.length}枚) をアップロード中...`);

      const childContainerIds: string[] = [];
      for (let i = 0; i < imagePaths.length; i++) {
        const imgPath = imagePaths[i];
        console.log(`  [${i + 1}/${imagePaths.length}] アップロード中: ${imgPath}`);
        const { key, publicUrl } = await storage.uploadFile(imgPath);
        uploadedKeys.push(key);

        if (!options.dryRun) {
          const childId = await instagram.createCarouselItemContainer(publicUrl);
          childContainerIds.push(childId);
        }
      }

      if (options.dryRun) {
        console.log("\n[DRY RUN] Instagramへの投稿はスキップされました。");
        return;
      }

      // 3. 親コンテナ作成
      console.log(`[3/4] カルーセル親コンテナを作成中...`);
      const containerId = await instagram.createCarouselContainer(childContainerIds, options.caption);
      console.log(`  ✓ コンテナ作成完了 (ID: ${containerId})`);

      // 4. 公開
      console.log(`[4/4] Instagramへ投稿公開中...`);
      const postId = await instagram.publishMedia(containerId);
      console.log(`\n🎉 カルーセル投稿が正常に公開されました！`);
      console.log(`  Post ID: ${postId}`);
    }
  } catch (error: any) {
    console.error(`\n❌ エラーが発生しました: ${error.message}`);
    process.exitCode = 1;
  } finally {
    // 一時ファイルの自動クリーンアップ
    if (!options.keepRemote && uploadedKeys.length > 0) {
      console.log(`\n🧹 ストレージから一時ファイルを自動削除中 (${uploadedKeys.length}件)...`);
      for (const key of uploadedKeys) {
        await storage.deleteFile(key);
      }
      console.log(`  ✓ 一時ファイルのクリーンアップが完了しました。`);
    } else if (options.keepRemote && uploadedKeys.length > 0) {
      console.log(`\nℹ️  --keep-remote が指定されているため、ストレージ上のファイルは保持されます。`);
    }
  }
}

main().catch((err) => {
  console.error("予期しないエラー:", err);
  process.exit(1);
});
