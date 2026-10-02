---
name: insta-post
description: >-
  Publish AI-generated images, videos (Reels), or multi-image carousels to Instagram via the official Instagram Graph API using S3/R2 temporary hosting. Also guides the user through obtaining Meta Graph API tokens and setting up configuration if not yet configured. Activate this skill whenever the user asks to post an image or video to Instagram, or asks how to setup Instagram posting.
---

# Instagram Post Skill (`insta-post`)

Use this skill to publish visual media (AI-generated artwork, photos, videos/reels, or carousel collections) to Instagram on behalf of the user using the `insta-post` CLI tool.

If the user has not yet configured their credentials or encounters authentication errors, guide them step-by-step through setting up their Meta Graph API access token and storage.

---

## 🛠 Prerequisites & Initial Check

Before executing an upload, verify whether `config.toml` exists in the `insta-post` directory:

1. **Check if `config.toml` exists**:
   - If `config.toml` does NOT exist, or if values are placeholder defaults (e.g. `YOUR_META_LONG_LIVED_ACCESS_TOKEN`), **do not fail silently**. Proactively guide the user through the setup process outlined in [Setup & Token Guide](#setup--token-guide).
2. **Check Node.js**:
   - Ensure `node` is available in the environment.

---

## 🚀 How to Execute Commands

Always run the bundled CLI script using `run_command`:

```bash
node <PATH_TO_INSTA_POST>/dist/insta-post.cjs [options]
```

### 1. Single Image Post
```bash
node <PATH_TO_INSTA_POST>/dist/insta-post.cjs --image "/path/to/image.png" --caption "Your caption here #hashtags"
```

### 2. Video Post (Reels)
```bash
node <PATH_TO_INSTA_POST>/dist/insta-post.cjs --video "/path/to/video.mp4" --caption "Reel caption here #reel"
```

### 3. Carousel Post (Multiple Images, Up to 10)
```bash
node <PATH_TO_INSTA_POST>/dist/insta-post.cjs --images "/path/to/1.png" "/path/to/2.png" --caption "Carousel caption"
```

### 4. Dry Run (Validation only)
```bash
node <PATH_TO_INSTA_POST>/dist/insta-post.cjs --image "/path/to/image.png" --dry-run
```

---

## 📋 Options Reference

| Option | Description |
| :--- | :--- |
| `-i, --image <path>` | Path to a single image file (JPEG, PNG). |
| `-v, --video <path>` | Path to a video file (MP4, MOV) for Instagram Reels. |
| `-m, --images <paths...>` | Paths to multiple images for a carousel post (2 to 10 images). |
| `-c, --caption <caption>` | Caption text for the post, including hashtags. |
| `--config <path>` | Path to `config.toml`. Defaults to `config.toml` in the current working directory. |
| `--dry-run` | Validates configuration and tests S3/R2 upload without actually publishing to Instagram. |
| `--keep-remote` | Keep temporary files in S3/R2 instead of automatically deleting them after publish. |

---

## 🧭 Setup & Token Guide (親切な案内手順)

If the user does not have their Instagram token or `config.toml` set up, walk them through these steps warmly and clearly:

### Step 1: Instagramプロアカウントへの切り替え (無料)
ユーザーにスマホのInstagramアプリから以下を行ってもらうよう案内します：
- [設定とプライバシー] ＞ [アカウントの種類とツール] ＞ **[プロアカウントに切り替える]** を選択（「クリエイター」または「ビジネス」を選択）。

### Step 2: Facebookページの作成とリンク
- Facebookで簡単なFacebookページ（名前は何でも可）を1つ作成。
- Instagramアプリの [プロフィールを編集] ＞ [公開ビジネス情報] ＞ [ページ] から作成したFacebookページをリンク。

### Step 3: Meta for Developers でアプリ作成
- [Meta for Developers](https://developers.facebook.com/) にアクセスしログイン。
- **[アプリを作成]** をクリックし、タイプ「その他」または「ビジネス」を選択して作成。

### Step 4: アクセストークンとアカウントIDの取得
1. **[ツール] ＞ [グラフAPIエクスプローラ]** を開く。
2. 右上の [ユーザーまたはページ] で、先ほどリンクした **Facebook ページ** を選択。
3. [アクセス許可を追加] で以下の2つの権限を追加：
   - `instagram_basic`
   - `instagram_content_publish`
4. **[Generate Access Token]** をクリックして承認。表示された短期トークンをコピー。
5. グラフAPIエクスプローラで以下のクエリを実行し、`id`（`178414...` の数字）を取得：
   - `GET /v21.0/me/accounts?fields=instagram_business_account`
   - これが `account_id` になります。

### Step 5: 長期トークン（60日間有効）への交換
短期トークンは1〜2時間で切れるため、長期トークン（60日有効）への交換URLをユーザーに提示します：
```text
https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id={アプリID}&client_secret={アプリシークレット}&fb_exchange_token={短期トークン}
```
ブラウザで上記を開くと返ってくる JSON の `access_token` が長期トークンです。

### Step 6: `config.toml` の作成支援
ユーザーから取得したトークンやストレージ情報（R2またはS3）を受け取ったら、エージェント側で `config.toml` の作成・更新をお手伝いします。

---

## ⚠️ Troubleshooting & Error Handling

- **Error: `OAuthException` (Code: 190, Session has expired)**:
  - アクセストークンの有効期限切れです。[Step 5] の長期トークン再取得手順を案内してください。
- **Error: `Application does not have permission`**:
  - `instagram_content_publish` のパーミッションが不足しています。[Step 4] で権限を追加してトークンを再発行するよう案内してください。
- **Error: `Invalid aspect ratio`**:
  - Instagramの仕様上、フィード画像のアスペクト比は 1.91:1（横長）から 4:5（縦長）の範囲である必要があります。範囲外の場合はリサイズまたは正方形（1:1）へのトリミングを提案してください。
