# Norton一時無効化テスト手順

## ⚠️ 注意事項

この手順は、Nortonの除外設定が正しく機能するかテストするためのものです。
一時的にセキュリティ保護が無効になるため、インターネット接続を切断することを推奨します。

---

## 📋 手順

### ステップ1: インターネット接続を切断（推奨）

1. タスクバーのネットワークアイコンをクリック
2. Wi-Fiまたは有線接続を「**切断**」

### ステップ2: Nortonを一時的に無効化

1. タスクバーの**Nortonアイコン**（黄色い丸）を右クリック
2. 「**自動保護を無効にする**」または「**オフにする**」を選択
3. 期間を選択：
   - **15分間** を選択（推奨）
4. 「**OK**」をクリック

### ステップ3: Electronをインストール

PowerShellで実行：

```powershell
cd C:\Users\varuv\Desktop\dev\tech-book-reader

# 既存を削除
Remove-Item -Path "$env:USERPROFILE\.tech-book-reader\electron" -Recurse -Force -ErrorAction SilentlyContinue

# 再インストール
npm run install-electron
```

### ステップ4: 5秒待機して確認

```powershell
Start-Sleep -Seconds 5
Test-Path "$env:USERPROFILE\.tech-book-reader\electron\27.3.11\electron.exe"
```

**期待される結果：** `True`

### ステップ5: アプリを起動

```powershell
npm start
```

### ステップ6: Nortonを再度有効化

1. タスクバーの**Nortonアイコン**を右クリック
2. 「**自動保護を有効にする**」または「**オンにする**」を選択

### ステップ7: インターネット接続を再接続

---

## ✅ 成功した場合

アプリが起動した場合：

1. **Norton除外設定が不完全**である証拠
2. すべての保護機能（Auto-Protect、SONAR、ダウンロードインテリジェンス）に除外設定を追加
3. 次回以降は `npm start` だけで起動可能

---

## ❌ 失敗した場合

それでも削除される場合：

1. Nortonの設定が保存されていない
2. 管理者権限が必要
3. Nortonのバージョンが古い

---

## 💡 推奨：すべての保護機能に除外設定を追加

Norton無効化テストで成功した場合、以下をすべて除外設定に追加してください：

### 追加する場所：

1. **ウイルス対策** → **除外** （既に追加済み ✅）
2. **Auto-Protect** → **除外**
3. **SONAR** → **除外**
4. **ダウンロードインテリジェンス** → **除外**

### 追加するパス：

```
C:\Users\varuv\.tech-book-reader
```

---

## 🚀 完全な手順（まとめ）

```powershell
# 1. インターネット切断
# 2. Norton一時無効化（15分）

# 3. Electronインストール
cd C:\Users\varuv\Desktop\dev\tech-book-reader
Remove-Item -Path "$env:USERPROFILE\.tech-book-reader\electron" -Recurse -Force -ErrorAction SilentlyContinue
npm run install-electron

# 4. 確認
Start-Sleep -Seconds 5
Test-Path "$env:USERPROFILE\.tech-book-reader\electron\27.3.11\electron.exe"

# 5. 起動
npm start

# 6. Norton再有効化
# 7. インターネット再接続
```

