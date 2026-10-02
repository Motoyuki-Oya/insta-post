# Project AGENTS.md

## Project: insta-post
A lightweight, standalone CLI tool for publishing AI-generated images and videos to Instagram via the official Instagram Graph API, supporting AWS S3 and Cloudflare R2 for temporary hosting.

## Global Rules
1. ユーザーの所感・同意を作業指示とみなすことの禁止。明確な作業指示がない限り、実装コードに手を触れない。
2. 未指示・未合意のコード変更の抱き合わせ厳格禁止。
3. リポジトリ内のファイルを調査・編集する際は、まず AGENTS.md を確認すること。

## Architecture & Design
- Target runtime: Node.js (cross-platform, tested for macOS Apple Silicon / Intel and Windows).
- Output format: A single bundled JavaScript file (`dist/insta-post.cjs`) with zero external `node_modules` required at runtime on the target machine.
- Configuration: TOML file (`config.toml`).
- API: Instagram Graph API (v21.0+).
- Storage: S3 compatible (AWS S3 & Cloudflare R2).
- Automatic cleanup: Temporary uploads to S3/R2 are automatically removed once Instagram finishes container creation / publishing.
