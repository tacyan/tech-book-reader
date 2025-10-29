# 🚨 緊急修正：electron.exeが削除される問題

## 現在の状況

✅ Electronのインストールは成功しています
❌ しかし、**ウィルス対策ソフトが数秒後にelectron.exeを削除**しています

**これは除外設定が追加されていないためです。**

---

## 🛡️ 解決方法（3ステップ）

### ステップ1: Windows Defenderの除外設定を追加（必須）

#### 手順：

1. **スタートメニュー**をクリック
2. 「**Windows セキュリティ**」と入力して開く
3. 左メニューから「**ウイルスと脅威の防止**」をクリック
4. 「**ウイルスと脅威の防止の設定**」セクションの「**設定の管理**」をクリック
5. 下にスクロールして「**除外**」セクションを見つける
6. 「**除外の追加または削除**」をクリック
7. 「**+ 除外の追加**」をクリック
8. 「**フォルダー**」を選択
9. 以下のパスを入力：

```
C:\Users\varuv\.tech-book-reader
```

10. 「**フォルダーの選択**」をクリック
11. 「**追加**」をクリック

#### 確認：

除外リストに以下が表示されていればOK：
```
C:\Users\varuv\.tech-book-reader
```

---

### ステップ2: 既存のElectronを削除

PowerShellで以下を実行：

```powershell
Remove-Item -Path "$env:USERPROFILE\.tech-book-reader\electron" -Recurse -Force -ErrorAction SilentlyContinue
```

---

### ステップ3: Electronを再インストール

```powershell
npm run install-electron
```

---

### ステップ4: 5秒待機してから確認

```powershell
Start-Sleep -Seconds 5
Test-Path "$env:USERPROFILE\.tech-book-reader\electron\27.3.11\electron.exe"
```

**期待される結果：** `True`

- `True` → ✅ 成功！除外設定が機能しています
- `False` → ❌ まだ削除されています。ステップ1をもう一度確認してください

---

### ステップ5: アプリを起動

```powershell
npm start
```

🎉 **アプリケーションウィンドウが開きます！**

---

## 📋 コピー＆ペースト用（ステップ1の後に実行）

```powershell
# ステップ2: 削除
Remove-Item -Path "$env:USERPROFILE\.tech-book-reader\electron" -Recurse -Force -ErrorAction SilentlyContinue

# ステップ3: 再インストール
npm run install-electron

# ステップ4: 5秒待機して確認
Start-Sleep -Seconds 5
Test-Path "$env:USERPROFILE\.tech-book-reader\electron\27.3.11\electron.exe"

# ステップ5: 起動
npm start
```

---

## ⚠️ それでもダメな場合

### 他のウィルス対策ソフトを使用している場合

**ノートン、マカフィー、アバスト、カスペルスキーなど**をインストールしている場合は、それぞれの除外設定も必要です。

詳細は [ANTIVIRUS_FIX.md](./ANTIVIRUS_FIX.md) を参照してください。

### Windows Defender以外のウィルス対策ソフトの確認方法

PowerShellで以下を実行：

```powershell
Get-CimInstance -Namespace root/SecurityCenter2 -ClassName AntivirusProduct | Select-Object displayName, productState
```

**表示される製品すべて**に除外設定を追加する必要があります。

---

## 💡 なぜ除外設定が必須なのか？

**理由：**

1. Electronは署名されていない実行ファイルとして認識される
2. ウィルス対策ソフトは未知の実行ファイルを「脅威」と判断
3. 自己署名証明書は公的な認証局が発行したものではないため、信頼されない
4. **結果：** 自動的に削除される

**詳細：** [SETUP_REQUIRED.md](./SETUP_REQUIRED.md)

---

## ✅ チェックリスト

- [ ] Windows Defenderの除外設定を追加（`C:\Users\varuv\.tech-book-reader`）
- [ ] 他のウィルス対策ソフトがある場合、そちらの除外設定も追加
- [ ] 既存のElectronを削除
- [ ] Electronを再インストール
- [ ] 5秒待機して `electron.exe` の存在を確認（`Test-Path` で `True`）
- [ ] `npm start` でアプリを起動

---

**すべてのチェックが完了したら、アプリは完璧に動作します！** 🎉


