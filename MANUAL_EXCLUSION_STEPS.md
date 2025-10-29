# 🛡️ Windows Defender 除外設定の追加方法（詳細版）

## 🚨 この設定を追加しないと、アプリは絶対に動作しません

---

## 方法A: PowerShellで自動追加（推奨）⭐️

### ステップ1: 管理者権限のPowerShellを開く

1. **スタートメニュー**を右クリック
2. 「**Windows PowerShell (管理者)**」または「**ターミナル (管理者)**」を選択
3. 「このアプリがデバイスに変更を加えることを許可しますか？」→ **はい**をクリック

### ステップ2: スクリプトを実行

```powershell
cd C:\Users\varuv\Desktop\dev\tech-book-reader
.\add-exclusion.ps1
```

### ステップ3: 結果を確認

✅ 「🎉 完了！」が表示されればOK

---

## 方法B: 手動で追加（GUIを使用）

### ステップ1: Windows セキュリティを開く

1. **スタートメニュー**をクリック
2. 検索ボックスに「**Windows セキュリティ**」と入力
3. **Windows セキュリティ**アプリをクリックして開く

### ステップ2: ウイルスと脅威の防止に移動

1. 左側のメニューから「**ウイルスと脅威の防止**」（盾のアイコン）をクリック

### ステップ3: 設定を開く

1. 「**ウイルスと脅威の防止の設定**」セクションを見つける
2. 「**設定の管理**」をクリック

### ステップ4: 除外設定を開く

1. 下にスクロールして「**除外**」セクションを見つける
2. 「**除外の追加または削除**」をクリック

### ステップ5: フォルダーを追加

1. 「**+ 除外の追加**」をクリック
2. ドロップダウンメニューから「**フォルダー**」を選択

### ステップ6: パスを入力

1. フォルダー選択ダイアログが開く
2. アドレスバーに以下を**正確に**入力（コピー＆ペースト推奨）：

```
C:\Users\varuv\.tech-book-reader
```

**重要：**
- `.tech-book-reader` の前のドット（`.`）を忘れずに
- 大文字小文字は区別されません
- スペースは含まれません

3. **Enter**キーを押す
4. 「**フォルダーの選択**」ボタンをクリック

### ステップ7: 確認

除外リストに以下が表示されていればOK：

```
C:\Users\varuv\.tech-book-reader
```

---

## 方法C: コマンドで追加（管理者PowerShell）

管理者権限のPowerShellで以下を**1行で**実行：

```powershell
Add-MpPreference -ExclusionPath "$env:USERPROFILE\.tech-book-reader"
```

### 確認コマンド：

```powershell
Get-MpPreference | Select-Object -ExpandProperty ExclusionPath
```

**期待される出力：**
```
C:\Users\varuv\.tech-book-reader
```

---

## ✅ 除外設定が追加されたか確認

### PowerShellで確認：

```powershell
$exclusionPath = "$env:USERPROFILE\.tech-book-reader"
$exclusions = (Get-MpPreference).ExclusionPath
if ($exclusions -contains $exclusionPath) {
    Write-Host "✅ 除外設定が追加されています" -ForegroundColor Green
} else {
    Write-Host "❌ 除外設定が見つかりません" -ForegroundColor Red
}
```

---

## 🧪 除外設定追加後のテスト

除外設定を追加したら、以下を実行してテストしてください：

```powershell
.\test-antivirus.ps1
```

### 期待される結果：

```
✅ electron.exe が残っています！
🎉 成功！除外設定が機能しています！
```

---

## ❌ トラブルシューティング

### 問題1: 「管理者権限が必要です」エラー

**症状：**
```
Add-MpPreference : アクセスが拒否されました
```

**解決方法：**
- PowerShellを**管理者権限**で開き直す
- スタートメニュー右クリック → 「Windows PowerShell (管理者)」

### 問題2: 除外設定を追加したのに削除される

**原因：**
- 他のウィルス対策ソフトが動作している
- Windows Defender以外のセキュリティソフト（ノートン、マカフィーなど）

**確認方法：**
```powershell
Get-CimInstance -Namespace root/SecurityCenter2 -ClassName AntivirusProduct | Select-Object displayName
```

**解決方法：**
- 表示されたすべてのウィルス対策ソフトに除外設定を追加

### 問題3: 除外設定が表示されない

**原因：**
- PowerShellが管理者権限で実行されていない
- Windows Defenderが無効化されている

**解決方法：**
```powershell
# Windows Defenderの状態を確認
Get-MpComputerStatus | Select-Object AntivirusEnabled, RealTimeProtectionEnabled
```

両方が `True` であることを確認してください。

### 問題4: フォルダーが見つからない

**症状：**
```
指定されたパスが見つかりません
```

**原因：**
- `.tech-book-reader` フォルダーがまだ作成されていない

**解決方法：**
```powershell
# フォルダーを手動で作成
New-Item -Path "$env:USERPROFILE\.tech-book-reader" -ItemType Directory -Force
```

その後、除外設定を追加してください。

---

## 📋 完全な手順まとめ

### 1. 除外設定を追加（3つから選択）

**A. 自動（推奨）：**
```powershell
.\add-exclusion.ps1
```

**B. 手動（GUI）：**
Windows セキュリティ → 除外 → フォルダーを追加

**C. コマンド：**
```powershell
Add-MpPreference -ExclusionPath "$env:USERPROFILE\.tech-book-reader"
```

### 2. 確認

```powershell
Get-MpPreference | Select-Object -ExpandProperty ExclusionPath
```

### 3. テスト

```powershell
.\test-antivirus.ps1
```

### 4. 起動

```powershell
npm start
```

---

## 💡 重要なポイント

1. **除外設定は1回だけ**
   - 一度追加すれば永続的に有効
   - PCを再起動しても有効

2. **管理者権限が必要**
   - PowerShellでの追加には管理者権限が必須
   - GUIでの追加には管理者権限は不要

3. **即座に反映される**
   - 除外設定は追加後すぐに有効
   - PCの再起動は不要

4. **複数のウィルス対策ソフト**
   - Windows Defender以外のソフトがある場合、それぞれに除外設定が必要

---

## 🆘 それでも解決しない場合

1. PCを再起動
2. Windows Updateを実行
3. [ANTIVIRUS_FIX.md](./ANTIVIRUS_FIX.md) を参照
4. GitHubのIssuesで質問

---

**まずは除外設定を追加してください！これなしでは絶対に動作しません。** 🚨

