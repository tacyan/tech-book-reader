#!/usr/bin/env node

/**
 * @file カスタムElectronインストールスクリプト
 * @description 
 * ウィルス対策ソフトを回避するため、Electronを安全な場所にインストールします。
 * 
 * 戦略:
 * 1. Electronをユーザーのホームディレクトリにダウンロード
 * 2. node_modules/electronには実行可能ファイルではなく、パス情報のみを配置
 * 3. 起動時にホームディレクトリから実行
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');
const { execSync } = require('child_process');

// Electronのバージョン
const ELECTRON_VERSION = '27.3.11';
const PLATFORM = process.platform;
const ARCH = process.arch;

// 安全なインストール先（ウィルス対策ソフトの監視外）
const HOME_DIR = os.homedir();
const SAFE_ELECTRON_DIR = path.join(HOME_DIR, '.tech-book-reader', 'electron', ELECTRON_VERSION);

/**
 * メイン処理
 */
async function main() {
  console.log('🚀 Tech Book Reader用Electronインストーラー\n');
  console.log(`📦 Electronバージョン: ${ELECTRON_VERSION}`);
  console.log(`💾 インストール先: ${SAFE_ELECTRON_DIR}\n`);

  // 既にインストール済みか確認
  let electronExePath;
  if (PLATFORM === 'win32') {
    electronExePath = path.join(SAFE_ELECTRON_DIR, 'electron.exe');
  } else if (PLATFORM === 'darwin') {
    electronExePath = path.join(SAFE_ELECTRON_DIR, 'Electron.app', 'Contents', 'MacOS', 'Electron');
  } else {
    electronExePath = path.join(SAFE_ELECTRON_DIR, 'electron');
  }

  if (fs.existsSync(electronExePath)) {
    console.log('✓ Electronは既にインストールされています');
    console.log(`  パス: ${electronExePath}\n`);
    createLinkFile(electronExePath);
    return;
  }

  // ダウンロードURL
  const zipName = getZipName();
  const downloadUrl = `https://github.com/electron/electron/releases/download/v${ELECTRON_VERSION}/${zipName}`;
  
  console.log(`📥 Electronをダウンロード中...`);
  console.log(`  URL: ${downloadUrl}\n`);

  // ダウンロード先
  const downloadDir = path.join(HOME_DIR, '.tech-book-reader', 'downloads');
  fs.mkdirSync(downloadDir, { recursive: true });
  const zipPath = path.join(downloadDir, zipName);

  try {
    // ダウンロード
    await downloadFile(downloadUrl, zipPath);
    console.log('✓ ダウンロード完了\n');

    // 展開
    console.log('📦 Electronを展開中...\n');
    fs.mkdirSync(SAFE_ELECTRON_DIR, { recursive: true });
    
    if (PLATFORM === 'win32') {
      // Windowsの場合：PowerShellで展開
      extractZipWindows(zipPath, SAFE_ELECTRON_DIR);
    } else {
      // macOS/Linuxの場合：unzipコマンドで展開
      extractZipUnix(zipPath, SAFE_ELECTRON_DIR);
    }

    console.log('✓ 展開完了\n');

    // 展開されたファイルを確認
    const extractedFiles = fs.readdirSync(SAFE_ELECTRON_DIR);
    console.log(`📁 展開されたファイル数: ${extractedFiles.length}`);
    if (extractedFiles.length === 0) {
      throw new Error('展開されたファイルが0個です。展開に失敗しています。');
    }
    console.log(`   主要ファイル: ${extractedFiles.slice(0, 5).join(', ')}...\n`);

    // electron.exeが存在するか即座に確認
    if (!fs.existsSync(electronExePath)) {
      console.error(`❌ electron.exeが見つかりません: ${electronExePath}`);
      console.error(`   展開されたファイル一覧:`);
      extractedFiles.forEach(f => console.error(`     - ${f}`));
      throw new Error('electron.exeの展開に失敗しました');
    }
    console.log(`✓ electron.exe確認: ${electronExePath}\n`);

    // zipファイルは保持（デバッグ用）
    // fs.unlinkSync(zipPath);

    // **重要：ウィルス対策ソフトに削除される前に即座に署名**
    console.log('🔐 Electronバイナリに署名中（ウィルス対策ソフト対策）...\n');
    try {
      signElectronImmediately(electronExePath);
      console.log('✓ 署名完了\n');
    } catch (signError) {
      console.warn(`⚠️  署名に失敗: ${signError.message}`);
      console.warn('   アプリは動作しない可能性があります\n');
    }

    // リンクファイルを作成
    createLinkFile(electronExePath);

    console.log('🎉 Electronのインストールが完了しました！\n');
    console.log(`✓ Electron実行ファイル: ${electronExePath}`);
    console.log(`✓ npm start でアプリを起動できます\n`);

  } catch (error) {
    console.error(`\n❌ インストール失敗: ${error.message}\n`);
    console.error('💡 解決方法:');
    console.error('1. インターネット接続を確認してください');
    console.error('2. 管理者権限で実行してみてください');
    console.error('3. 手動ダウンロード:');
    console.error(`   ${downloadUrl}`);
    console.error(`   → ${SAFE_ELECTRON_DIR} に展開\n`);
    process.exit(1);
  }
}

/**
 * ファイルをダウンロード
 */
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    
    const request = https.get(url, (response) => {
      // リダイレクトに対応
      if (response.statusCode === 302 || response.statusCode === 301) {
        file.close();
        fs.unlinkSync(destPath);
        return downloadFile(response.headers.location, destPath)
          .then(resolve)
          .catch(reject);
      }

      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(destPath);
        return reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
      }

      const totalSize = parseInt(response.headers['content-length'], 10);
      let downloaded = 0;
      let lastPercent = 0;

      response.on('data', (chunk) => {
        downloaded += chunk.length;
        const percent = Math.floor((downloaded / totalSize) * 100);
        
        if (percent > lastPercent && percent % 10 === 0) {
          process.stdout.write(`  進捗: ${percent}%\r`);
          lastPercent = percent;
        }
      });

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        process.stdout.write('\n');
        resolve();
      });
    });

    request.on('error', (err) => {
      file.close();
      fs.unlinkSync(destPath);
      reject(err);
    });

    file.on('error', (err) => {
      file.close();
      fs.unlinkSync(destPath);
      reject(err);
    });
  });
}

/**
 * zipファイル名を取得
 */
function getZipName() {
  if (PLATFORM === 'win32') {
    return `electron-v${ELECTRON_VERSION}-win32-${ARCH === 'x64' ? 'x64' : 'ia32'}.zip`;
  } else if (PLATFORM === 'darwin') {
    return `electron-v${ELECTRON_VERSION}-darwin-${ARCH}.zip`;
  } else {
    return `electron-v${ELECTRON_VERSION}-linux-${ARCH}.zip`;
  }
}

/**
 * Windows用zip展開
 */
function extractZipWindows(zipPath, destPath) {
  // 方法1: PowerShellで展開（最も確実）
  try {
    const psScript = `Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::ExtractToDirectory('${zipPath.replace(/\\/g, '\\\\')}', '${destPath.replace(/\\/g, '\\\\')}')`;
    
    execSync(`powershell -NoProfile -Command "${psScript}"`, {
      stdio: 'inherit',
      shell: true,
      timeout: 120000 // 2分タイムアウト
    });
    return; // 成功
  } catch (error) {
    console.log(`⚠️  PowerShell展開失敗: ${error.message}`);
    console.log('   tarコマンドで試行中...\n');
  }
  
  // 方法2: tarコマンド
  try {
    execSync(`tar -xf "${zipPath}" -C "${destPath}"`, {
      stdio: 'inherit',
      shell: true,
      timeout: 120000
    });
    return; // 成功
  } catch (error) {
    console.log(`⚠️  tar展開失敗: ${error.message}\n`);
  }
  
  throw new Error('すべての展開方法が失敗しました');
}

/**
 * macOS/Linux用zip展開
 */
function extractZipUnix(zipPath, destPath) {
  execSync(`unzip -q "${zipPath}" -d "${destPath}"`, {
    stdio: 'inherit',
    shell: true
  });
}

/**
 * node_modules/electronにリンクファイルを作成
 */
function createLinkFile(electronExePath) {
  const projectRoot = path.join(__dirname, '..');
  const electronModuleDir = path.join(projectRoot, 'node_modules', 'electron');
  
  // node_modules/electronディレクトリを作成
  fs.mkdirSync(electronModuleDir, { recursive: true });
  
  // path.txtファイルを作成（Electronのパスを記録）
  const pathTxtPath = path.join(electronModuleDir, 'path.txt');
  fs.writeFileSync(pathTxtPath, electronExePath, 'utf8');
  
  console.log(`✓ リンクファイルを作成: ${pathTxtPath}`);
}

/**
 * Electronに即座に署名（ウィルス対策ソフト対策）
 */
function signElectronImmediately(electronExePath) {
  const certDir = path.join(os.homedir(), '.tech-book-reader', 'certificate');
  const pfxPath = path.join(certDir, 'TechBookReader.pfx');
  const certPassword = 'TechBookReader2024';

  if (!fs.existsSync(pfxPath)) {
    throw new Error('証明書が見つかりません。create-certificate.ps1を実行してください');
  }

  // PowerShellで署名
  const psScript = `
    $cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2("${pfxPath.replace(/\\/g, '\\\\')}", "${certPassword}")
    $result = Set-AuthenticodeSignature -FilePath "${electronExePath.replace(/\\/g, '\\\\')}" -Certificate $cert -TimestampServer "http://timestamp.digicert.com"
    if ($result.Status -ne 'Valid') {
      throw "署名に失敗しました: $($result.Status)"
    }
  `;

  execSync(`powershell -NoProfile -Command "${psScript}"`, {
    stdio: 'pipe',
    shell: true
  });
}

// 実行
main().catch((error) => {
  console.error(`\n❌ エラー: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
});

