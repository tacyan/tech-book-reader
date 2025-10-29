# コード署名についての説明

## 🔐 実験結果

Tech Book Readerで**自己署名証明書**を使った実験を行いました。

### 実施したこと

1. ✅ **自己署名証明書の作成** - 成功
   - 10年間有効な証明書を作成
   - Windowsの信頼されたルート証明機関に追加

2. ✅ **Electronバイナリへの署名** - 成功
   - PowerShellの`Set-AuthenticodeSignature`で署名
   - 署名ステータス: Valid

3. ❌ **ウィルス対策ソフトによる削除** - 防げない
   - 署名直後でもelectron.exeが削除される
   - 自己署名証明書は「信頼されていない発行者」として扱われる

### なぜ自己署名証明書では不十分なのか？

**Windowsの信頼ストアに追加しても、ウィルス対策ソフトは独自の判断基準を持っています：**

- ❌ **自己署名証明書** → 誰でも作成できるため信頼されない
- ✅ **公式CA発行の証明書** → DigiCert、Sectigo等の認証局が発行
- ✅ **大手企業の証明書** → Microsoft、Google、Appleなど

**ウィルス対策ソフトの判断基準：**
1. 証明書の発行元（CA）が信頼されているか
2. 証明書の評判（Reputation-based Protection）
3. ファイルのハッシュが既知のマルウェアと一致しないか
4. 実行ファイルの挙動（ヒューリスティック分析）

**自己署名証明書では「1. 証明書の発行元」で失格となります。**

## 💡 実際の解決方法

### 方法1: 公式のコード署名証明書を購入（プロダクション向け）

**対象：**
- 本番環境でアプリを配布する場合
- エンタープライズ向けアプリケーション
- 商用ソフトウェア

**手順：**
1. DigiCert、Sectigo、GlobalSignなどから証明書を購入
2. 企業・個人の身元確認が必要（数日〜数週間）
3. 年間 $200〜$500程度のコスト
4. 取得した証明書でElectronに署名

**メリット：**
- ✅ すべてのウィルス対策ソフトで信頼される
- ✅ ユーザーが追加設定不要
- ✅ プロフェッショナルな対応

**デメリット：**
- ❌ コストがかかる
- ❌ 身元確認に時間がかかる
- ❌ 年間更新が必要

### 方法2: ウィルス対策ソフトの除外設定（開発環境向け）⭐️推奨

**対象：**
- 開発環境
- 個人利用
- テスト環境

**手順：**
1. Windows Defenderの除外設定を開く
2. 以下のフォルダーを追加：
   ```
   C:\Users\<ユーザー名>\.tech-book-reader
   ```
3. Electronを再インストール：
   ```
   npm run install-electron
   npm start
   ```

**メリット：**
- ✅ 無料で即座に対応可能
- ✅ 開発環境では標準的な方法
- ✅ 設定は1回のみ

**デメリット：**
- ❌ 初回セットアップ時に手動設定が必要
- ❌ 他のPCでは再設定が必要

**詳細な手順：**
- [QUICK_START.md](./QUICK_START.md) - セットアップ手順
- [ANTIVIRUS_FIX.md](./ANTIVIRUS_FIX.md) - トラブルシューティング
- [SETUP_REQUIRED.md](./SETUP_REQUIRED.md) - なぜ必要か

### 方法3: Electron Builderでインストーラーを作成

**対象：**
- 配布用パッケージを作成する場合
- 複数のユーザーに配布する場合

**手順：**
1. `electron-builder`をインストール
2. インストーラーを作成（.exe または .msi）
3. インストーラーを署名（公式証明書が必要）
4. ユーザーはインストーラーを実行

**メリット：**
- ✅ Program Filesにインストール
- ✅ スタートメニューにアイコン追加
- ✅ アンインストーラーも自動生成

**デメリット：**
- ❌ インストーラーの署名には公式証明書が必要
- ❌ ビルド設定が複雑

## 📊 比較表

| 方法 | コスト | 信頼性 | セットアップ | 配布 |
|------|--------|--------|--------------|------|
| **公式証明書** | $200〜500/年 | ⭐️⭐️⭐️⭐️⭐️ | 複雑 | 簡単 |
| **除外設定** | 無料 | ⭐️⭐️⭐️⭐️ | 簡単 | 各PC必要 |
| **Electron Builder** | 証明書次第 | ⭐️⭐️⭐️⭐️⭐️ | 複雑 | 簡単 |
| **自己署名証明書** | 無料 | ⭐️ | 簡単 | ❌動作しない |

## 🎯 推奨事項

### 開発・個人利用の場合
→ **ウィルス対策ソフトの除外設定**
- 最も簡単で効果的
- コストゼロ
- 5分でセットアップ完了

### 本番・配布の場合
→ **公式のコード署名証明書** + **Electron Builder**
- プロフェッショナルな対応
- ユーザーが設定不要
- 信頼性が最も高い

## 📚 参考リンク

- [Microsoft: コード署名について](https://docs.microsoft.com/ja-jp/windows/security/threat-protection/windows-defender-application-control/use-code-signing-to-simplify-application-control-for-classic-windows-applications)
- [Electron Builder: Code Signing](https://www.electron.build/code-signing)
- [DigiCert Code Signing](https://www.digicert.com/signing/code-signing-certificates)

---

**Tech Book Reader チーム**

ご質問は GitHubのIssuesまでお願いします。



