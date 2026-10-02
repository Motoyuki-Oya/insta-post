# insta-post 📸

AIで生成した画像や動画（リール）を、**Instagram Graph API（公式API）** 経由で手軽に自動投稿するための軽量CLIツールです。

**Cloudflare R2** または **AWS S3** を一時ストレージとして活用し、Meta側のメディア読み込みと投稿が完了した後は**ストレージ上の一時ファイルを自動削除**するため、ストレージを圧迫しません。

---

## 🌟 特徴

- **環境汚染ゼロの単一ファイル**: すべての依存ライブラリ（AWS SDK, TOMLパーサー等）を `dist/insta-post.cjs`（約750KB）に完全内包。Mac側で `npm install` や `node_modules` の作成は**一切不要**です。
- **macOS Gatekeeper 回避**: 未署名バイナリではないため、macOSの「開発元が未確認のため開けません」というGatekeeperブロックや、年間99ドルのApple署名・公証コストが発生しません。
- **TOML設定ファイル**: 見やすく扱いやすい `config.toml` に認証情報を記述。
- **S3 / Cloudflare R2 両対応**: 設定ファイルの切り替えだけでどちらでも動作。
- **自動クリーンアップ**: 投稿が完了すると、S3/R2にアップロードした一時画像/動画を即座に自動削除。
- **多彩な投稿形式**:
  - 単一画像の通常投稿
  - 動画（Reels / リール）投稿
  - 複数画像（最大10枚）のカルーセル投稿

---

## 🚀 Macでのセットアップと使い方

### 1. 事前準備 (Mac)

Macに Node.js（v18以上推奨）が入っていない場合は、公式サイト（[nodejs.org](https://nodejs.org/)）から `.pkg` インストーラをダウンロードして導入してください（または `brew install node`）。

### 2. 設定ファイルの作成

フォルダ内にある `config.toml.example` をコピーして `config.toml` を作成し、情報を記入します。

```bash
cp config.toml.example config.toml
```

#### `config.toml` の設定例

```toml
[instagram]
account_id = "17841400000000000"
access_token = "EAAB..."

[storage]
# "r2" または "s3"
provider = "r2"
bucket = "my-insta-bucket"
access_key_id = "your_key_id"
secret_access_key = "your_secret_key"

# Cloudflare R2 の場合:
endpoint = "https://<account_id>.r2.cloudflarestorage.com"
public_url_base = "https://pub-xxxxxxxx.r2.dev"

# AWS S3 の場合:
# endpoint はコメントアウトし、region を指定してください。
# region = "ap-northeast-1"
# public_url_base = "https://my-insta-bucket.s3.ap-northeast-1.amazonaws.com"
```

---

### 3. コマンドの実行

#### ① 単一画像の投稿
```bash
node dist/insta-post.cjs --image ./my_ai_art.png --caption "AIで生成したアート作品！ #aiart #midjourney"
```

#### ② 動画（Reels / リール）の投稿
```bash
node dist/insta-post.cjs --video ./animation.mp4 --caption "AI動画リール #aivideo #reels"
```

#### ③ 複数画像のカルーセル投稿（最大10枚）
```bash
node dist/insta-post.cjs --images ./img1.png ./img2.png ./img3.png --caption "AIイラストまとめ"
```

#### その他のオプション
- `--dry-run`: 実際のInstagram投稿は行わず、S3/R2アップロードと公開URL疎通の検証のみ実行します。
- `--keep-remote`: 投稿完了後もストレージから一時ファイルを削除せず残します。
- `--config <path>`: 別の設定ファイルを指定したい場合に使用します（デフォルト: `config.toml`）。

---

### 💡 便利な設定（Macのターミナルで `insta` だけで呼び出す）

Macの `~/.zshrc`（または `~/.bashrc`）にエイリアスを追加しておくと、どこからでもコマンド一発で投稿できるようになります。

```bash
alias insta="node /Users/ユーザー名/path/to/insta-post/dist/insta-post.cjs --config /Users/ユーザー名/path/to/insta-post/config.toml"
```

反映後：
```bash
insta -i ./art.png -c "どこからでも一発投稿！"
```

---

## 🔑 Meta Graph API の準備（最短ガイド）

Instagram公式APIを利用するための初期準備手順です（費用は一切かかりません）。

### Step 1: Instagram をプロアカウントに切り替え
1. スマホの Instagram アプリで、[設定とプライバシー] ＞ [アカウントの種類とツール] ＞ **[プロアカウントに切り替える]** を選択（「クリエイター」または「ビジネス」を選択、無料）。

### Step 2: Facebook ページを作成してリンク
1. Facebook（PCブラウザ等）で簡単な Facebook ページ（名前は何でもOK）を1つ作成。
2. Instagram アプリの [プロフィールを編集] ＞ [ページ] から、作成した Facebook ページをリンク。

### Step 3: Meta for Developers でアプリ作成
1. [Meta for Developers](https://developers.facebook.com/) にアクセスしログイン。
2. **[アプリを作成]** をクリック。
   - アプリタイプで「その他」または「ビジネス」を選択。
   - アプリ名（例: `MyInstaPostTool`）を入力して作成。

### Step 4: アクセストークンとアカウントIDの取得
1. メニューの **[ツール] ＞ [グラフAPIエクスプローラ]** を開く。
2. 右側の [ユーザーまたはページ] で、先ほどリンクした **Facebook ページ** を選択。
3. [アクセス許可を追加] で以下の2つを追加：
   - `instagram_basic`
   - `instagram_content_publish`
4. **[Generate Access Token]** をクリックして許可を承認。
5. 表示されたトークンをコピー。
6. 以下のクエリを実行して、`instagram_business_account` の `id` を取得：
   - `GET /v21.0/me/accounts?fields=instagram_business_account`
   - レスポンスに含まれる `178414...` のような数字が `account_id` です。

### Step 5: 長期トークン（60日間有効）に変換（推奨）
発行直後のトークンは約1〜2時間で切れる短期トークンです。ブラウザのアドレスバーで以下のURLを叩くと、60日間有効な長期トークンに変換できます：

```text
https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id={アプリID}&client_secret={アプリシークレット}&fb_exchange_token={短期トークン}
```
※返ってきた JSON の `access_token` を `config.toml` に設定してください。

---

## 🤖 Google Antigravity スキルとしての利用

Antigravity に本ツールを「スキル（Skill）」として登録すると、チャット上で **「この生成画像をインスタに投稿して」「リール動画を投稿して」と指示するだけで、AIが自動的に投稿を実行** してくれるようになります。

### スキルのインストール方法

目的に応じて「ワークスペース単位」または「マシン全体（グローバル）」のどちらかでインストールできます。

#### 方法 A: このプロジェクト（ワークスペース）で使う場合（最も簡単）
本リポジトリにはすでに `.agents/skills/insta-post/SKILL.md` が配置されています。
Antigravity でこのフォルダをワークスペースとして開くだけで、**追加設定なしで自動的にスキルが認識・有効化** されます。

#### 方法 B: 他のプロジェクトやPC全体（グローバル）で使う場合
どのワークスペースを開いていても Antigravity から Instagram 投稿を呼び出せるようにしたい場合は、グローバルスキルディレクトリに配置します。

**【Mac / Linux の場合】**
```bash
# グローバルスキルディレクトリを作成
mkdir -p ~/.gemini/antigravity/skills/insta-post

# SKILL.md をコピー
cp skills/insta-post/SKILL.md ~/.gemini/antigravity/skills/insta-post/
```

**【Windows の場合 (PowerShell)】**
```powershell
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.gemini\antigravity\skills\insta-post"
Copy-Item "skills\insta-post\SKILL.md" "$env:USERPROFILE\.gemini\antigravity\skills\insta-post\"
```

※グローバルに配置した場合は、コピー先の `SKILL.md` に記載されている `<PATH_TO_INSTA_POST>` を、実際の `insta-post` ディレクトリの絶対パス（例: `/Users/username/tools/insta-post`）に置き換えてください。

---

### 💬 Antigravity での使い方例

スキル導入後は、チャット上で自然言語で指示するだけでAIが自動投稿してくれます：

- **画像投稿**:
  > 「今作成した `./output/art.png` を、『今日生成したサイバーパンクアート作品！ #aiart』というキャプションでインスタに投稿して」
- **リール動画投稿**:
  > 「`./videos/anime.mp4` をリールとして投稿して」
- **カルーセル投稿**:
  > 「`./img1.png`, `./img2.png`, `./img3.png` をまとめてカルーセルで投稿して」

