# クイックスタートガイド

## 🚨 重要：初回セットアップ

**Windows環境では、ウィルス対策ソフトの設定が必要です！**

### ステップ1: ウィルス対策ソフトの除外設定

#### Windows Defender の場合:

1. **スタートメニュー** → 「Windows セキュリティ」を検索して開く

2. 「**ウイルスと脅威の防止**」をクリック

3. 「**設定の管理**」をクリック

4. 下にスクロールして「**除外**」セクションを見つける

5. 「**除外の追加または削除**」をクリック

6. 「**＋ 除外の追加**」→「**フォルダー**」を選択

7. 以下の2つのフォルダーを追加:

```
C:\Users\<ユーザー名>\Desktop\dev\tech-book-reader\node_modules\electron
```

```
C:\Users\<ユーザー名>\.electron
```

**注意**: `<ユーザー名>` は自分のWindowsユーザー名に置き換えてください

#### その他のウィルス対策ソフト（ノートン、マカフィーなど）:

各ソフトウェアの「除外設定」または「信頼するフォルダー」に上記フォルダーを追加してください。

### ステップ2: Electronの再インストール

除外設定を追加したら、PowerShellまたはコマンドプロンプトで以下を実行:

```powershell
# プロジェクトディレクトリに移動
cd C:\Users\<ユーザー名>\Desktop\dev\tech-book-reader

# 既存のElectronファイルを削除
Remove-Item -Path "node_modules\electron" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "$env:USERPROFILE\.electron" -Recurse -Force -ErrorAction SilentlyContinue

# キャッシュをクリア
npm cache clean --force

# Electronを再インストール
npm install electron

# アプリを起動
npm start
```

### ステップ3: 起動確認

正常にセットアップされると、以下のメッセージが表示されます:

```
🚀 Tech Book Reader を起動中...
📦 Method 1: Electronをnode経由で起動中...
✓ Electronバージョン: 27.3.11
✓ Electronパス: C:\Users\...\electron.exe
```

## 📝 通常の使用方法

初回セットアップ後は、以下のコマンドだけで起動できます:

```bash
npm start
```

## ❓ よくある質問

### Q: 除外設定をしないとダメですか？

A: はい、Windows環境では必須です。Electronの実行ファイルがウィルス対策ソフトに誤検知されて削除されるため、除外設定なしでは動作しません。

### Q: セキュリティは大丈夫ですか？

A: Electronは正規のオープンソースプロジェクトで、GitHubやVSCodeなど多くの有名アプリで使用されています。開発環境では除外設定が推奨されます。

### Q: それでも起動しない場合は？

A: `ANTIVIRUS_FIX.md` を参照してください。詳細なトラブルシューティング手順が記載されています。

### Q: macOSやLinuxでも必要ですか？

A: いいえ、macOSとLinuxでは通常この問題は発生しません。

## 🎉 起動後の使い方

アプリが起動したら:

1. **書籍を検索**: 検索タブで無料の技術書を探す
2. **本を追加**: ダウンロードしてライブラリに追加
3. **読書開始**: ライブラリから本を選んで読む
4. **翻訳**: 英語の本を日本語に自動翻訳
5. **音声読み上げ**: 再生ボタンで自動読み上げ

詳細な使い方は `README.md` を参照してください。

---

**困ったときは**: `ANTIVIRUS_FIX.md` または `README.md` のトラブルシューティングセクションを参照してください。



