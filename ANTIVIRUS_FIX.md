# ウィルス対策ソフトによるElectronブロックの解決方法

## 問題の症状

- `npm start` で `electron.exe` が見つからない
- `EPERM: operation not permitted` エラー
- セットアップが途中で失敗する

## 原因

ウィルス対策ソフトがElectronの実行ファイルを誤検知して削除しています。

## 解決手順

### 1. ウィルス対策ソフトの除外設定

#### Windows Defender の場合:

1. **Windows セキュリティ**を開く
   - スタートメニューから「Windows セキュリティ」を検索
   
2. **ウイルスと脅威の防止**をクリック

3. **設定の管理**をクリック

4. **除外**セクションの**除外の追加または削除**をクリック

5. **＋ 除外の追加**をクリックし、**フォルダー**を選択

6. 以下の2つのフォルダーを追加：
```
C:\Users\varuv\Desktop\dev\tech-book-reader\node_modules\electron
C:\Users\varuv\.electron
```

#### ノートン/マカフィー/その他のウィルス対策ソフトの場合:

各ソフトウェアの設定画面から「除外設定」または「信頼するファイル」に上記フォルダーを追加してください。

### 2. 隔離されたファイルを復元（オプション）

Windows Defenderの場合、隔離されたファイルを復元できます：

1. **Windows セキュリティ**を開く
2. **ウイルスと脅威の防止**
3. **保護の履歴**
4. `electron.exe` を探して**復元**をクリック

### 3. プロジェクトを再セットアップ

PowerShellまたはコマンドプロンプトで以下を実行：

```powershell
# プロジェクトディレクトリに移動
cd C:\Users\varuv\Desktop\dev\tech-book-reader

# 既存のElectronファイルをクリア
Remove-Item -Path "node_modules\electron\dist" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "$env:USERPROFILE\.electron" -Recurse -Force -ErrorAction SilentlyContinue

# npmキャッシュをクリア
npm cache clean --force

# Electronを再インストール
npm uninstall electron
npm install --save-dev electron@27.3.11

# アプリを起動
npm start
```

## 確認方法

正常にセットアップされた場合、以下のファイルが存在するはずです：

```powershell
Get-Item "node_modules\electron\dist\electron.exe"
```

出力例：
```
    ディレクトリ: C:\Users\varuv\Desktop\dev\tech-book-reader\node_modules\electron\dist

Mode                 LastWriteTime         Length Name
----                 -------------         ------ ----
-a----        2025/01/28     12:00        142234 electron.exe
```

## それでも解決しない場合

1. **ウィルス対策ソフトを一時的に無効化**してから再セットアップ
2. **管理者権限で PowerShell を実行**してから再セットアップ
3. **ウィルス対策ソフトのログ**を確認して、Electronが本当にブロックされているか確認

## 注意事項

- Electronは正規のオープンソースプロジェクトで、安全です
- 誤検知はよくあることで、開発環境では除外設定が推奨されます
- 除外設定後は、定期的にWindows Updateを実行してセキュリティを維持してください



