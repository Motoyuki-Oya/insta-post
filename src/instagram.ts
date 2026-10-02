import { InstagramConfig } from "./config.js";

export class InstagramService {
  private config: InstagramConfig;
  private apiVersion = "v21.0";
  private baseUrl = "https://graph.facebook.com";

  constructor(config: InstagramConfig) {
    this.config = config;
  }

  /**
   * 単一画像のコンテナを作成
   */
  async createImageContainer(imageUrl: string, caption?: string): Promise<string> {
    const url = `${this.baseUrl}/${this.apiVersion}/${this.config.account_id}/media`;
    const params: Record<string, string> = {
      image_url: imageUrl,
      access_token: this.config.access_token,
    };
    if (caption) {
      params.caption = caption;
    }

    const data = await this.postForm(url, params);
    return data.id;
  }

  /**
   * 動画（Reels）のコンテナを作成
   */
  async createVideoContainer(videoUrl: string, caption?: string): Promise<string> {
    const url = `${this.baseUrl}/${this.apiVersion}/${this.config.account_id}/media`;
    const params: Record<string, string> = {
      media_type: "REELS",
      video_url: videoUrl,
      access_token: this.config.access_token,
    };
    if (caption) {
      params.caption = caption;
    }

    const data = await this.postForm(url, params);
    return data.id;
  }

  /**
   * カルーセル投稿用の個別画像コンテナを作成
   */
  async createCarouselItemContainer(imageUrl: string): Promise<string> {
    const url = `${this.baseUrl}/${this.apiVersion}/${this.config.account_id}/media`;
    const params: Record<string, string> = {
      image_url: imageUrl,
      is_carousel_item: "true",
      access_token: this.config.access_token,
    };

    const data = await this.postForm(url, params);
    return data.id;
  }

  /**
   * カルーセル全体の親コンテナを作成
   */
  async createCarouselContainer(childrenIds: string[], caption?: string): Promise<string> {
    const url = `${this.baseUrl}/${this.apiVersion}/${this.config.account_id}/media`;
    const params: Record<string, string> = {
      media_type: "CAROUSEL",
      children: childrenIds.join(","),
      access_token: this.config.access_token,
    };
    if (caption) {
      params.caption = caption;
    }

    const data = await this.postForm(url, params);
    return data.id;
  }

  /**
   * メディアコンテナが準備完了（FINISHED）になるまで待機
   * （動画やカルーセルの処理待ち）
   */
  async waitForContainerReady(containerId: string, maxWaitSeconds = 120): Promise<void> {
    const url = `${this.baseUrl}/${this.apiVersion}/${containerId}?fields=status_code,status&access_token=${this.config.access_token}`;
    const startTime = Date.now();

    while (true) {
      const res = await fetch(url);
      const data: any = await res.json();

      if (!res.ok || data.error) {
        throw new Error(`ステータス確認エラー: ${this.formatError(data.error || data)}`);
      }

      const statusCode = data.status_code;

      if (statusCode === "FINISHED") {
        return;
      } else if (statusCode === "ERROR" || statusCode === "EXPIRED") {
        throw new Error(`メディア処理が失敗しました (Status: ${statusCode}): ${JSON.stringify(data)}`);
      }

      if ((Date.now() - startTime) / 1000 > maxWaitSeconds) {
        throw new Error(`メディア処理がタイムアウトしました (${maxWaitSeconds}秒経過)`);
      }

      // 3秒待機
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  /**
   * メディアコンテナをInstagramへ公開（Publish）
   */
  async publishMedia(containerId: string): Promise<string> {
    const url = `${this.baseUrl}/${this.apiVersion}/${this.config.account_id}/media_publish`;
    const params: Record<string, string> = {
      creation_id: containerId,
      access_token: this.config.access_token,
    };

    const data = await this.postForm(url, params);
    return data.id; // 公開された投稿のID
  }

  /**
   * URLエンコードされたフォームデータをPOST送信
   */
  private async postForm(url: string, params: Record<string, string>): Promise<any> {
    const body = new URLSearchParams(params);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    const data: any = await res.json();

    if (!res.ok || data.error) {
      throw new Error(this.formatError(data.error || data));
    }

    return data;
  }

  /**
   * Meta APIのエラーレスポンスを読みやすい文字列に整形
   */
  private formatError(error: any): string {
    if (typeof error === "string") return error;
    const msg = error.message || "Unknown error";
    const type = error.type ? `[${error.type}]` : "";
    const code = error.code ? `(Code: ${error.code})` : "";
    const userMsg = error.error_user_msg ? ` 詳細: ${error.error_user_msg}` : "";
    return `${type} ${msg} ${code}${userMsg}`.trim();
  }
}
