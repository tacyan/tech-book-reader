# 🛡️ Norton 除外設定の追加方法

## 📋 概要

Tech Book Readerを動作させるには、Nortonの除外設定に以下のフォルダーを追加する必要があります：

```
C:\Users\varuv\.tech-book-reader
```

---

## 🔧 **方法1: Norton GUI（推奨）**

### ステップ1: Nortonを開く

1. タスクバーの**Nortonアイコン**（黄色い丸）をダブルクリック
2. または、スタートメニューから「**Norton**」を検索

### ステップ2: 設定を開く

1. メインウィンドウの右上にある「**設定**」（⚙️歯車アイコン）をクリック

### ステップ3: ウイルス対策の設定

**Norton 360 / Norton Security の場合：**

1. 左側のメニューから「**ウイルス対策**」をクリック
2. 「**スキャンとリスク**」タブをクリック
3. 「**除外/対象外**」の行にある「**設定**」をクリック

**Norton AntiVirus Plus の場合：**

1. 「**詳細設定**」をクリック
2. 「**ウイルス対策**」→「**除外**」をクリック

### ステップ4: 除外項目を追加

1. 「**除外するアイテムの設定**」をクリック
2. 「**追加**」ボタンをクリック
3. ドロップダウンメニューから「**フォルダー**」を選択

### ステップ5: フォルダーパスを入力

#### 方法A: 直接入力

1. フォルダーパスを入力：
   ```
   C:\Users\varuv\.tech-book-reader
   ```
2. 「**OK**」をクリック

#### 方法B: 参照して選択

1. 「**参照**」ボタンをクリック
2. `C:\Users\varuv\` に移動
3. `.tech-book-reader` フォルダーを選択（存在しない場合は先に作成）
4. 「**OK**」をクリック

### ステップ6: 設定を保存

1. 「**適用**」をクリック
2. 「**OK**」または「**閉じる**」をクリック

### ステップ7: 確認

除外リストに以下が表示されていればOK：
```
C:\Users\varuv\.tech-book-reader
```

---

## 🔧 **方法2: Norton Autoprotect の除外設定**

Nortonには複数の保護機能があるため、以下も確認してください：

### Auto-Protect の除外設定

1. Norton設定を開く
2. 「**ウイルス対策**」→「**Auto-Protect**」
3. 「**除外**」タブ
4. 上記と同じ手順でフォルダーを追加

### SONAR の除外設定

1. Norton設定を開く
2. 「**ウイルス対策**」→「**SONAR**」
3. 「**除外**」タブ
4. 上記と同じ手順でフォルダーを追加

---

## 🧪 **除外設定後のテスト**

### ステップ1: フォルダーを作成（まだ存在しない場合）

PowerShellで実行：

```powershell
New-Item -Path "$env:USERPROFILE\.tech-book-reader" -ItemType Directory -Force
```

### ステップ2: テストスクリプトを実行

```powershell
cd C:\Users\varuv\Desktop\dev\tech-book-reader
powershell -ExecutionPolicy Bypass -File .\test-antivirus.ps1
```

### ステップ3: 期待される結果

```
SUCCESS! Exclusion is working!
```

✅ この表示が出れば成功！

### ステップ4: アプリを起動

```powershell
npm start
```

---

## ❌ **トラブルシューティング**

### 問題1: 除外設定を追加したのに削除される

**原因：**
- Norton の複数の保護機能が動作している
- Auto-Protect、SONAR、ダウンロードインテリジェンスなど

**解決方法：**
すべての保護機能に除外設定を追加：

1. **Auto-Protect** → 除外
2. **SONAR** → 除外
3. **ダウンロードインテリジェンス** → 除外
4. **侵入防止** → 除外

### 問題2: `.tech-book-reader` フォルダーが見つからない

**原因：**
- フォルダーがまだ作成されていない
- 隠しフォルダーが表示されていない

**解決方法A: フォルダーを作成**

PowerShellで実行：
```powershell
New-Item -Path "$env:USERPROFILE\.tech-book-reader" -ItemType Directory -Force
```

**解決方法B: 隠しフォルダーを表示**

1. エクスプローラーを開く
2. 「表示」タブ → 「隠しファイル」にチェック

### 問題3: 除外設定が見つからない

**Nortonのバージョンによって場所が異なります：**

**Norton 360 (最新版):**
- 設定 → ウイルス対策 → スキャンとリスク → 除外/対象外

**Norton Security:**
- 設定 → ウイルス対策 → 除外

**Norton AntiVirus Plus:**
- 詳細設定 → ウイルス対策 → 除外

### 問題4: 管理者パスワードを要求される

**原因：**
- Nortonの設定変更には管理者権限が必要

**解決方法：**
- 管理者パスワードを入力
- または、管理者アカウントでログインして設定

---

## 📋 **完全な手順まとめ**

### 1. Nortonに除外設定を追加

```
Norton設定 → ウイルス対策 → 除外 → フォルダーを追加
C:\Users\varuv\.tech-book-reader
```

### 2. すべての保護機能に追加

- Auto-Protect
- SONAR
- ダウンロードインテリジェンス

### 3. フォルダーを作成

```powershell
New-Item -Path "$env:USERPROFILE\.tech-book-reader" -ItemType Directory -Force
```

### 4. テスト

```powershell
cd C:\Users\varuv\Desktop\dev\tech-book-reader
powershell -ExecutionPolicy Bypass -File .\test-antivirus.ps1
```

### 5. 起動

```powershell
npm start
```

---

## 💡 **重要なポイント**

1. **Nortonは複数の保護機能を持っています**
   - すべての保護機能に除外設定を追加する必要があります

2. **除外設定は永続的**
   - 一度追加すれば、次回以降は不要

3. **Windows Defenderは無効**
   - Nortonが有効な場合、Windows Defenderは自動的に無効化されます
   - Windows Defenderの除外設定は不要です

4. **フォルダーを先に作成**
   - 除外設定を追加する前に、フォルダーを作成しておくと選択しやすい

---

## 🆘 **それでも解決しない場合**

### オプション1: Norton を一時的に無効化してテスト

**⚠️ 注意：セキュリティリスクがあります**

1. Nortonアイコンを右クリック
2. 「無効にする」または「オフにする」
3. 期間を選択（15分など）
4. テストスクリプトを実行
5. 成功したら、Nortonを再度有効化

### オプション2: Nortonサポートに問い合わせ

- Norton公式サポート: https://support.norton.com/
- チャット、電話、メールでサポート可能

### オプション3: 別の場所にインストール

Nortonの監視が緩い場所にインストール：
- `D:\tech-book-reader\` など

---

## 📞 **参考リンク**

- [Norton 公式：除外設定の追加方法](https://support.norton.com/sp/ja/jp/home/current/solutions/v15471961)
- [Norton コミュニティフォーラム](https://community.norton.com/)

---

**まずはNortonに除外設定を追加してください！** 🚀

