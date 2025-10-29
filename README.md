# Tech Book Reader

無料の技術書を音声読み上げ・自動翻訳できる完全統合型デスクトップアプリケーション

![Tech Book Reader](https://img.shields.io/badge/platform-macOS-lightgrey)
![Node.js](https://img.shields.io/badge/node-%3E%3D16.0.0-green)
![Electron](https://img.shields.io/badge/electron-28.0.0-blue)

---

## 🚀 すぐに始める

### Windows ユーザー → **[START_HERE.md](./START_HERE.md)** を読んでください
### macOS/Linux ユーザー → `npm install` → `npm start`

### 🚨 **electron.exeが削除される問題が発生している場合**
→ **[EMERGENCY_FIX.md](./EMERGENCY_FIX.md)** を今すぐ読んでください

---

## 特徴

### 📚 無料書籍の検索とダウンロード

- **無料の技術書のみ**を検索・ダウンロード
- 厳選された無料書籍カタログ（Pro Git、Think Python、Eloquent JavaScriptなど）
- Internet Archiveからパブリックドメイン書籍を取得
- ライブラリで本を一元管理（追加・削除機能）
- 読書進捗の自動保存

### 🌐 高速自動翻訳機能

- **並列翻訳処理**: 最大50ページを同時翻訳
- 英語の書籍を日本語に一括翻訳
- 翻訳済み書籍をキャッシュして即座に閲覧可能
- リーダー画面で翻訳ON/OFF切り替え
- 翻訳中でも操作可能（エラー耐性）
- Google Translate API使用（無料）

### 📖 高機能リーダー

- EPUB、PDF形式に対応
- 章/ページナビゲーション
- **ページジャンプ機能**（特定ページへ移動）
- リーダー画面で速度調整可能
- リーダー画面で翻訳切り替え可能
- 読書進捗トラッキング

### 🔊 自動連続読み上げ機能（TTS）

- **自動連続読み上げ**: ページ終了後、自動的に次のページへ進む
- 本の最後まで操作不要で聴き続けられる
- **クロスプラットフォーム対応**: macOS、Windows、Linux
  - macOS: `say`コマンド（高品質音声）
  - Windows: PowerShell + SAPI
  - Linux: `espeak`
- 音声選択（プラットフォーム別の利用可能な音声）
  - macOS: Kyoko、Otoya（日本語）、Alex、Samantha（英語）など
  - Windows: Microsoft Haruka、Sayaka（日本語）、David、Zira（英語）など
  - Linux: en、en-us、ja、defaultなど
- 速度調整（0.5x〜4x、デフォルト2x）
- リーダー画面で速度をリアルタイム調整
- 再生/一時停止/停止コントロール

### 🎨 UI/UX

- ダークテーマ
- モダンなグラスモーフィズムデザイン
- 直感的なナビゲーション
- リアルタイムコントロール

## システム要件

- **OS**:
  - macOS 10.15 (Catalina) 以降
  - Windows 10/11 (64-bit)
  - Linux (Ubuntu 18.04以降推奨)
- **Node.js**: 16.0.0 以降
- **npm**: 7.0.0 以降
- **空き容量**: 500MB以上

### プラットフォーム別の音声読み上げ要件

- **macOS**: 標準の `say`コマンド（プリインストール済み）
- **Windows**: Windows Speech API (SAPI) / PowerShell（プリインストール済み）
- **Linux**: `espeak`が必要
  ```bash
  # Ubuntu/Debianの場合
  sudo apt-get install espeak

  # Fedora/CentOSの場合
  sudo yum install espeak
  ```

## インストール

### 🚨 【Windows ユーザー必読】完璧に動かす手順

**⚠️ ウィルス対策ソフトの設定変更が必須です！**

Electronの実行ファイル（`.exe`）がウィルス対策ソフトに誤検知されて自動削除されるため、**除外設定なしでは動作しません。**

## 📖 **完全セットアップガイド（推奨）**

### ⭐️ **[WINDOWS_SETUP.md](./WINDOWS_SETUP.md)** ⭐️
**→ この1つのガイドで完璧に動作します！（所要時間：5〜10分）**

手順：
1. Windows Defenderの除外設定（画像付き詳細手順）
2. 証明書作成
3. インストール＆起動
4. トラブルシューティング
5. コピー＆ペーストで実行できるコマンド集

---

**📚 その他のドキュメント（参考）：**
- **[QUICK_START.md](./QUICK_START.md)** - 簡易版セットアップ手順
- **[SETUP_REQUIRED.md](./SETUP_REQUIRED.md)** - なぜ設定が必要か（背景説明）
- **[CODE_SIGNING_EXPLAINED.md](./CODE_SIGNING_EXPLAINED.md)** - コード署名の実験結果
- **[ANTIVIRUS_FIX.md](./ANTIVIRUS_FIX.md)** - 詳細なトラブルシューティング

**💡 注意：** 自己署名証明書でも、ウィルス対策ソフトの除外設定は必須です。  
詳細は [CODE_SIGNING_EXPLAINED.md](./CODE_SIGNING_EXPLAINED.md) を参照してください。

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd tech-book-reader
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. ⚠️ Windows: ウィルス対策ソフトの設定

**Windows環境では、この手順が必須です！**

詳細は **[QUICK_START.md](./QUICK_START.md)** または **[ANTIVIRUS_FIX.md](./ANTIVIRUS_FIX.md)** を参照してください。

### 4. アプリケーションの起動

```bash
npm start
```

## 使い方

### 1. 無料書籍を検索してライブラリに追加

1. 左サイドバーの「🔍 本を検索」をクリック
2. 検索キーワードを入力して「検索」（例: "JavaScript", "Python", "Git"）
3. 検索結果から**「ライブラリに追加」**ボタンをクリック
4. PDFが自動的にダウンロードされ、ライブラリに追加されます

💡 **無料書籍カタログ**: Pro Git、Think Python、Eloquent JavaScript、The Rust Programming Language、Go言語、不思議の国のアリス、シャーロック・ホームズなど多数収録

### 2. 本を読む

1. 左サイドバーの「📖 ライブラリ」をクリック
2. ライブラリから読みたい本のカードをクリック
3. リーダーが開きます
4. 左のサイドバーから章/ページを選択
5. または**ページジャンプ**で特定ページへ移動

### 3. 翻訳機能を使う

1. リーダー画面の上部にある**「英→日翻訳」チェックボックス**をON
2. 全ページが自動的に並列翻訳されます（進捗バー表示）
3. 翻訳完了後、日本語で書籍を閲覧できます
4. チェックボックスをOFFにすると元の英語に戻ります

⚡ **高速翻訳**: 50ページ同時翻訳で超高速処理！

### 4. 自動連続読み上げ

1. 本を開いた状態で「▶」ボタンをクリック
2. 現在のページから音声読み上げが開始されます
3. **ページが終わると自動的に次のページへ進みます**
4. 本の最後まで操作不要で聴き続けられます
5. 「⏸」で一時停止、「⏹」で停止

### 5. リーダー画面でのリアルタイム設定

リーダー画面の上部バーで以下を調整できます:

- **翻訳ON/OFF**: 英→日翻訳チェックボックス
- **速度調整**: スライダーで0.5x〜4.0x（読み上げ中でも調整可能）
- **ページジャンプ**: ページ番号を入力して「移動」ボタン

### 6. 基本設定（設定タブ）

1. 左サイドバーの「⚙️ 設定」をクリック
2. 音声を選択：
   - **macOS**: Kyoko、Otoya（日本語）、Alex、Samantha（英語）など
   - **Windows**: Microsoft Haruka、Sayaka（日本語）、David、Zira（英語）など
   - **Linux**: en、en-us、ja、defaultなど
3. デフォルト読み上げ速度を調整
4. 翻訳のデフォルト設定
5. 「音声をテスト」ボタンで確認

## プロジェクト構造

```
tech-book-reader/
├── main.js                      # Electronメインプロセス
├── preload.js                   # セキュリティブリッジ（IPC通信）
├── package.json                 # プロジェクト設定
├── .gitignore                   # Git除外設定
├── README.md                    # このファイル
├── src/
│   ├── services/
│   │   ├── book-search.js      # 無料書籍検索サービス（カタログ＋API統合）
│   │   ├── library-manager.js  # ライブラリ管理（追加・削除・進捗）
│   │   └── translator.js       # 翻訳サービス（並列翻訳・キャッシュ）
│   ├── views/
│   │   ├── index.html          # メインUI
│   │   └── app.js              # アプリケーションロジック
│   └── styles/
│       └── main.css            # スタイリング
└── downloads/                   # ダウンロードした書籍（.gitignoreで除外）
```

## 技術スタック

### フレームワーク

- **Electron**: デスクトップアプリケーション
- **Node.js**: バックエンドロジック

### ライブラリ

- **epub2**: EPUBファイルのパース
- **pdf-parse**: PDFファイルのテキスト抽出
- **axios**: HTTPリクエスト

### API

- **Open Library API**: 本の検索
- **Internet Archive API**: パブリックドメイン書籍の取得
- **Google Translate API**: 無料翻訳サービス（非公式エンドポイント）

### TTS（Text-to-Speech）

- **macOS**: `say`コマンド（ネイティブ音声読み上げ）
- **Windows**: PowerShell + Windows Speech API (SAPI)
- **Linux**: `espeak`コマンドライン音声合成

## 翻訳の仕組み

### 高速並列翻訳アーキテクチャ

1. **ページレベルの並列化**

   - 最大50ページを同時に翻訳
   - バッチ処理で効率的に実行
2. **チャンクレベルの並列化**

   - 長文を1000文字ごとに分割
   - 各チャンクを並列翻訳
   - `Promise.all()`で同時実行
3. **キャッシュ機構**

   - 翻訳済みテキストをメモリにキャッシュ
   - 同じ書籍を再度開いても瞬時に表示
   - 翻訳ON/OFF切り替えが高速
4. **エラー耐性**

   - 個別ページの翻訳失敗でも全体処理を継続
   - ネットワークエラーに強い設計
   - 翻訳中にユーザー操作しても安全

## 開発

### デバッグモード

[main.js](main.js:25) の以下の行のコメントを外すとDevToolsが開きます：

```javascript
mainWindow.webContents.openDevTools();
```

### ビルド

```bash
npm run build
```

（注：ビルドスクリプトはまだ設定されていません）

## トラブルシューティング

### ⚠️ ウィルス対策ソフトによるブロック（重要！）

**症状:**
- `npm install` 後に `electron.exe` が見つからない
- `EPERM: operation not permitted` エラーが発生
- セットアップが途中で失敗する

**原因:** 
ウィルス対策ソフト（Windows Defender、ノートン、マカフィーなど）がElectronの実行ファイル（`electron.exe`、`ffmpeg.dll` など）を誤検知して削除または隔離している可能性があります。

**解決方法:**

#### 1. ウィルス対策ソフトの除外設定（推奨）

**Windows Defender の場合:**

1. 「Windows セキュリティ」を開く
2. 「ウイルスと脅威の防止」→「ウイルスと脅威の防止の設定の管理」
3. 「除外」→「除外の追加または削除」
4. 「フォルダーを除外」を選択
5. 以下のフォルダーを追加：
   - `C:\Users\<ユーザー名>\Desktop\dev\tech-book-reader\node_modules\electron`
   - `C:\Users\<ユーザー名>\.electron`

**ノートン/マカフィーなどの場合:**

各ソフトウェアの設定画面から「除外設定」または「信頼するファイル」に上記フォルダーを追加してください。

#### 2. 除外設定後の再セットアップ

除外設定を追加したら、以下のコマンドで再セットアップします：

```bash
# distディレクトリをクリア
rmdir /s /q node_modules\electron\dist

# Electronキャッシュをクリア
rmdir /s /q %USERPROFILE%\.electron

# 再インストール
npm install

# 起動
npm start
```

### Electronが起動しない場合

**エラー:** `Electron failed to install correctly`

**原因:** Electronバイナリが正しくセットアップされていません。

**解決方法:**

1. **Windows環境での手動セットアップ:**

```bash
# distディレクトリをクリア
rmdir /s /q node_modules\electron\dist

# 手動でセットアップを実行
node scripts/setup-electron.js

# 起動
npm start
```

2. **Electronを再インストール:**

```bash
# キャッシュをクリア
npm cache clean --force

# 再インストール
npm uninstall electron
npm install --save-dev electron@27.3.11

# 起動
npm start
```

3. **セットアップスクリプトが失敗する場合:**

```bash
# distディレクトリを完全に削除
rm -r node_modules/electron/dist

# 手動でinstall.jsを実行
cd node_modules/electron
node install.js
cd ../..

# 起動
npm start
```

### npmスクリプトが実行されない場合

**エラー:** `npm ERR!`

**解決方法:**

1. Node.jsとnpmのバージョンを確認:

```bash
node --version  # v16.0.0以上が必要
npm --version   # 7.0.0以上が必要
```

2. node_modules を再インストール:

```bash
rm -r node_modules
npm install
```

### 翻訳機能が動作しない場合

Google Translate APIの設定を確認してください。

### 本が読み込めない・テキストが表示されない

- ファイルが破損していないか確認
- EPUB/PDF形式であることを確認
- 再度ダウンロードしてみる

### 翻訳が遅い・エラーになる

- ネットワーク接続を確認
- 翻訳は並列処理（50ページ同時）ですが、ネットワーク速度に依存します
- 一度翻訳した書籍はキャッシュされるため、2回目以降は瞬時に表示されます
- Google Translate APIのレート制限に達した場合は、少し時間をおいて再試行してください

### 読み上げが動作しない・音声が出ない

#### macOS

- 「システム環境設定」→「アクセシビリティ」→「読み上げコンテンツ」を確認
- 選択した音声がインストールされているか確認
- ターミナルで動作確認：`say "テスト"`
- 音量設定を確認

#### Windows

- PowerShellが有効になっているか確認
- Windows Speech API (SAPI)が正常に動作しているか確認
- PowerShellで動作確認：
  ```powershell
  Add-Type -AssemblyName System.Speech
  $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
  $synth.Speak("Test")
  ```
- 「設定」→「時刻と言語」→「音声認識」で音声がインストールされているか確認
- 日本語音声を追加する場合：「設定」→「時刻と言語」→「言語」→「日本語」→「オプション」→「音声合成」からダウンロード

#### Linux

- espeakがインストールされているか確認：`which espeak`
- インストールされていない場合：
  ```bash
  sudo apt-get install espeak  # Ubuntu/Debian
  sudo yum install espeak      # Fedora/CentOS
  ```
- ターミナルで動作確認：`espeak "test"`
- 音量設定とオーディオデバイスを確認

### 自動連続読み上げが止まる

- 一時停止ボタン（⏸）を押していないか確認
- ネットワークエラーで翻訳が失敗している可能性があります
- 停止ボタン（⏹）を押してから再度再生してみてください

### 書籍がダウンロードできない

- インターネット接続を確認
- 一部の書籍はリンク切れの可能性があります
- 別の書籍を試してみてください

## 主な実装済み機能

- ✅ 無料書籍の検索とダウンロード
- ✅ 高速並列翻訳（50ページ同時）
- ✅ 自動連続読み上げ（ページ自動送り）
- ✅ リーダー画面でのリアルタイムコントロール
- ✅ ライブラリ管理（追加・削除）
- ✅ ページジャンプ機能
- ✅ 読書進捗の保存
- ✅ 翻訳キャッシュ

## 今後の機能

- [ ] ブックマーク機能
- [ ] メモ・ハイライト機能
- [ ] 読書統計の表示
- [ ] 他言語への翻訳対応（英→日以外）
- [ ] オフライン翻訳モード
- [ ] カスタムテーマ
- [ ] MOBI形式のサポート
- [ ] 音声ファイルへのエクスポート
- [ ] Windows/Linux向けの高品質TTS音声の追加オプション

## ライセンス

MIT License

## 注意事項

### 重要な制限事項

- このアプリケーションは**無料の書籍のみ**をダウンロードできます
- パブリックドメインまたはオープンライセンスの書籍のみを対象としています
- Google Translate APIの非公式エンドポイントを使用しているため、大量翻訳時にレート制限される可能性があります
- TTS機能は**macOS、Windows、Linux**に対応していますが、プラットフォームごとに音声品質や利用可能な音声が異なります
- ダウンロードした書籍は個人利用の範囲でご使用ください
- 著作権法を遵守してください

### プラットフォーム別の制限

#### macOS

- 最も多くの高品質音声が利用可能（Kyoko、Otoyaなど）
- 速度調整が柔軟（0.5x〜4.0x）

#### Windows

- Windows Speech API (SAPI) を使用
- デフォルトで英語音声のみインストールされている場合があります
- 日本語音声は「設定」→「言語」から追加ダウンロードが必要な場合があります
- 速度調整範囲がmacOSと異なる場合があります

#### Linux

- espeakはシンプルなロボット音声
- 音声品質はmacOS/Windowsに比べて低め
- インストールが別途必要
- 日本語音声の品質に制限あり

### プライバシー

- ユーザーデータはローカルに保存されます
- 翻訳時にGoogle Translate APIにテキストが送信されます
- その他の個人情報は外部に送信されません

## 貢献

プルリクエストを歓迎します！大きな変更の場合は、まずissueを開いて変更内容を議論してください。

### 開発に参加するには

1. このリポジトリをフォーク
2. 新しいブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## サポート

問題が発生した場合は、GitHubのissueを作成してください。

---

**Tech Book Reader**
バージョン: 1.0.0
最終更新: 2025-01-28
