# Windows完全セットアップガイド

## 🎯 この手順を実行すれば、Tech Book Readerが完璧に動作します

所要時間：**5〜10分**

---

## ステップ1: Windows Defenderの除外設定（必須）⭐️

### 1-1. Windows セキュリティを開く

1. **スタートメニュー**をクリック
2. 「**Windows セキュリティ**」と入力して検索
3. **Windows セキュリティ**アプリを開く

### 1-2. 除外設定を追加

1. 左メニューから「**ウイルスと脅威の防止**」をクリック
2. 下にスクロールして「**ウイルスと脅威の防止の設定**」をクリック
3. さらに下にスクロールして「**除外**」セクションを見つける
4. 「**除外の追加または削除**」をクリック
5. 「**+ 除外の追加**」をクリック
6. 「**フォルダー**」を選択
7. 以下のフォルダーパスを入力（コピー＆ペースト推奨）：

```
C:\Users\あなたのユーザー名\.tech-book-reader
```

**重要：** `あなたのユーザー名` の部分を、実際のWindowsユーザー名に置き換えてください。

**例：**
- ユーザー名が `varuv` の場合：
  ```
  C:\Users\varuv\.tech-book-reader
  ```

8. 「**フォルダーの選択**」をクリック
9. 「**追加**」をクリック

### 1-3. 確認

除外リストに以下が表示されていればOKです：
```
C:\Users\あなたのユーザー名\.tech-book-reader
```

---

## ステップ2: プロジェクトのセットアップ

### 2-1. プロジェクトディレクトリに移動

PowerShellまたはコマンドプロンプトを開いて、以下を実行：

```powershell
cd C:\Users\あなたのユーザー名\Desktop\dev\tech-book-reader
```

**または**、プロジェクトフォルダを右クリック → 「**ターミナルで開く**」

### 2-2. 既存ファイルをクリア（念のため）

```powershell
# Electronディレクトリを削除
Remove-Item -Path "$env:USERPROFILE\.tech-book-reader" -Recurse -Force -ErrorAction SilentlyContinue

# node_modulesをクリア（オプション）
Remove-Item -Path "node_modules" -Recurse -Force -ErrorAction SilentlyContinue
```

### 2-3. 証明書を作成

```powershell
powershell -ExecutionPolicy Bypass -File scripts/create-certificate.ps1
```

**表示される内容：**
```
Creating self-signed certificate for Tech Book Reader...
Certificate created successfully
...
Certificate added to trusted store
```

✅ 「Certificate added to trusted store」が表示されればOK

### 2-4. 依存関係をインストール

```powershell
npm install
```

**この時点で自動的に以下が実行されます：**
1. Electronのダウンロード
2. ホームディレクトリへの展開
3. **即座に署名**（ウィルス対策ソフトに削除される前）

**表示される内容：**
```
> tech-book-reader@1.0.0 postinstall
> npm run setup

🚀 Tech Book Reader用Electronインストーラー
📦 Electronバージョン: 27.3.11
📥 Electronをダウンロード中...
✓ ダウンロード完了
📦 Electronを展開中...
✓ 展開完了
🔐 Electronバイナリに署名中...
✓ 署名完了
🎉 Electronのインストールが完了しました！
```

---

## ステップ3: アプリを起動

```powershell
npm start
```

**成功メッセージ：**
```
🚀 Tech Book Reader を起動中...
✓ Electronパスを取得: C:\Users\...\electron.exe
📦 Electronを起動中...
Tech Book Reader - Main process started
```

🎉 **アプリケーションウィンドウが開きます！**

---

## ❌ トラブルシューティング

### 問題1: electron.exeが見つからない

**症状：**
```
❌ Electronバイナリが見つかりません
```

**原因：** ウィルス対策ソフトが削除した

**解決方法：**

1. **除外設定を再確認**
   - Windows セキュリティ → 除外
   - `C:\Users\あなたのユーザー名\.tech-book-reader` が追加されているか？

2. **再インストール**
   ```powershell
   Remove-Item -Path "$env:USERPROFILE\.tech-book-reader" -Recurse -Force
   npm run install-electron
   npm start
   ```

### 問題2: 署名に失敗

**症状：**
```
⚠️ 署名に失敗: ...
```

**原因：** 証明書が作成されていない

**解決方法：**
```powershell
powershell -ExecutionPolicy Bypass -File scripts/create-certificate.ps1
npm run install-electron
npm start
```

### 問題3: 依存関係のエラー

**症状：**
```
npm ERR! ...
```

**解決方法：**
```powershell
# キャッシュをクリア
npm cache clean --force

# 再インストール
Remove-Item -Path "node_modules" -Recurse -Force
npm install
npm start
```

### 問題4: PowerShellの実行ポリシーエラー

**症状：**
```
このシステムではスクリプトの実行が無効になっています
```

**解決方法：**
```powershell
# 一時的に実行ポリシーを変更
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# その後、再実行
npm start
```

---

## 📋 完全な手順まとめ（コピー＆ペースト用）

**1. Windows Defenderの除外設定を追加（手動）**
```
Windows セキュリティ → ウイルスと脅威の防止 → 除外 → フォルダーを追加
C:\Users\あなたのユーザー名\.tech-book-reader
```

**2. PowerShellで以下を順番に実行**

```powershell
# プロジェクトディレクトリに移動
cd C:\Users\あなたのユーザー名\Desktop\dev\tech-book-reader

# クリーンアップ
Remove-Item -Path "$env:USERPROFILE\.tech-book-reader" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "node_modules" -Recurse -Force -ErrorAction SilentlyContinue

# 証明書作成
powershell -ExecutionPolicy Bypass -File scripts/create-certificate.ps1

# インストール
npm install

# 起動
npm start
```

**これで完璧に動作します！** 🎉

---

## 💡 よくある質問

### Q1: 除外設定は安全ですか？

**A:** はい、安全です。

- Electronは正規のオープンソースプロジェクトです
- VSCode、Slack、Discordなども同じElectronを使用
- 開発環境では標準的な対応方法です

### Q2: 毎回セットアップが必要ですか？

**A:** いいえ、初回のみです。

- 除外設定：1回のみ（永続的）
- 証明書作成：1回のみ（10年間有効）
- npm install：依存関係更新時のみ

次回以降は `npm start` だけで起動できます。

### Q3: 他のPCでも同じ手順が必要ですか？

**A:** はい、必要です。

- 除外設定はPC毎に設定
- 証明書もPC毎に作成

ただし、手順は同じです（5分で完了）。

### Q4: 公式証明書を使いたい場合は？

**A:** CODE_SIGNING_EXPLAINED.md を参照してください。

年間$200〜500で公式のコード署名証明書を購入できます。
配布用アプリを作る場合はこちらを推奨します。

---

## 📞 サポート

それでも動作しない場合：

1. [ANTIVIRUS_FIX.md](./ANTIVIRUS_FIX.md) を参照
2. [CODE_SIGNING_EXPLAINED.md](./CODE_SIGNING_EXPLAINED.md) を参照
3. GitHubのIssuesで質問

---

**Tech Book Reader チーム**

最終更新: 2025-10-28



