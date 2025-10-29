# 🚀 Tech Book Reader - スタートガイド

## 👋 ようこそ！

Tech Book Readerを選んでいただきありがとうございます。

## 📖 Windows ユーザーの方

### ⭐️ まず読んでください ⭐️

**[WINDOWS_SETUP.md](./WINDOWS_SETUP.md)**

このガイドに従えば、**5〜10分で完璧に動作します**。

### なぜ特別な手順が必要なのか？

Electronの実行ファイル（`.exe`）がウィルス対策ソフトに誤検知されるため、除外設定が必要です。

**これは正常な動作です**。VSCode、Slack、Discordなども同じElectronを使用しており、開発環境では一般的な対応です。

---

## 🍎 macOS / 🐧 Linux ユーザーの方

通常の手順でOKです：

```bash
# インストール
npm install

# 起動
npm start
```

---

## 📚 ドキュメント一覧

### Windows向け（必読）
- **[WINDOWS_SETUP.md](./WINDOWS_SETUP.md)** ⭐️ - 完全セットアップガイド（推奨）
- [QUICK_START.md](./QUICK_START.md) - 簡易版手順
- [SETUP_REQUIRED.md](./SETUP_REQUIRED.md) - なぜ設定が必要か
- [CODE_SIGNING_EXPLAINED.md](./CODE_SIGNING_EXPLAINED.md) - コード署名の説明
- [ANTIVIRUS_FIX.md](./ANTIVIRUS_FIX.md) - トラブルシューティング

### 全プラットフォーム共通
- [README.md](./README.md) - プロジェクト概要と機能説明

---

## ❓ よくある質問

**Q: セットアップにどのくらい時間がかかりますか？**

A: Windows環境で5〜10分、macOS/Linuxで2〜3分です。

**Q: 除外設定は安全ですか？**

A: はい、安全です。Electronは正規のオープンソースプロジェクトで、多くの有名アプリで使用されています。

**Q: 次回起動時も同じ手順が必要ですか？**

A: いいえ、初回のみです。次回以降は `npm start` だけで起動できます。

---

## 🎯 今すぐ始める

1. **Windowsの場合** → [WINDOWS_SETUP.md](./WINDOWS_SETUP.md) を開く
2. **macOS/Linuxの場合** → `npm install` → `npm start`

---

**Tech Book Reader チーム**

ご質問・問題報告は GitHubのIssuesまでお願いします。



