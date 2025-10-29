#!/usr/bin/env node

/**
 * @file Electron実行ファイルに署名するスクリプト
 * @description 
 * 自己署名証明書を使ってElectronの実行ファイルに署名し、
 * Windows Defenderなどのウィルス対策ソフトに信頼されるようにします。
 * 
 * 必要条件:
 * - Windows環境
 * - PowerShellが利用可能
 * - 事前に create-certificate.ps1 で証明書を作成済み
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

// 証明書のパスワード（create-certificate.ps1と同じ）
const CERT_PASSWORD = 'TechBookReader2024';

/**
 * メイン処理
 */
async function main() {
  console.log('🔐 Electronバイナリに署名中...\n');

  // Windowsでない場合はスキップ
  if (os.platform() !== 'win32') {
    console.log('ℹ️  Windows環境でのみ署名が必要です');
    console.log('✓ 署名をスキップしました\n');
    return;
  }

  // 証明書のパスを取得
  const certDir = path.join(os.homedir(), '.tech-book-reader', 'certificate');
  const pfxPath = path.join(certDir, 'TechBookReader.pfx');
  const thumbprintPath = path.join(certDir, 'thumbprint.txt');

  // 証明書が存在するか確認
  if (!fs.existsSync(pfxPath)) {
    console.error('❌ 証明書が見つかりません\n');
    console.error(`予想されるパス: ${pfxPath}\n`);
    console.error('💡 以下のコマンドで証明書を作成してください:\n');
    console.error('   powershell -ExecutionPolicy Bypass -File scripts/create-certificate.ps1\n');
    process.exit(1);
  }

  console.log(`✓ 証明書を検出: ${pfxPath}\n`);

  // Electronのパスを取得
  const electronPath = path.join(os.homedir(), '.tech-book-reader', 'electron', '27.3.11', 'electron.exe');

  if (!fs.existsSync(electronPath)) {
    console.error('❌ Electronバイナリが見つかりません\n');
    console.error(`予想されるパス: ${electronPath}\n`);
    console.error('💡 以下のコマンドでElectronをインストールしてください:\n');
    console.error('   npm run install-electron\n');
    process.exit(1);
  }

  console.log(`✓ Electronバイナリを検出: ${electronPath}\n`);

  // 署名ツール（signtool.exe）のパスを検索
  const signtoolPath = findSignTool();

  if (!signtoolPath) {
    console.error('❌ signtool.exeが見つかりません\n');
    console.error('💡 Windows SDKをインストールしてください:\n');
    console.error('   https://developer.microsoft.com/ja-jp/windows/downloads/windows-sdk/\n');
    console.error('または、以下の代替方法を使用してください:\n');
    console.error('   npm run sign-electron-powershell\n');
    
    // PowerShellで署名を試行
    return signWithPowerShell(electronPath, pfxPath);
  }

  console.log(`✓ 署名ツールを検出: ${signtoolPath}\n`);

  // 署名を実行
  try {
    console.log('🔨 署名を実行中...\n');

    const signCommand = `"${signtoolPath}" sign /f "${pfxPath}" /p "${CERT_PASSWORD}" /fd SHA256 /tr http://timestamp.digicert.com /td SHA256 /v "${electronPath}"`;

    execSync(signCommand, {
      stdio: 'inherit',
      shell: true
    });

    console.log('\n✓ 署名が完了しました！\n');
    console.log('🎉 Electronバイナリが署名されました\n');
    console.log('   npm start でアプリを起動できます\n');

  } catch (error) {
    console.error(`\n❌ 署名に失敗しました: ${error.message}\n`);
    
    // PowerShellで署名を試行
    console.log('⚠️  PowerShellでの署名を試行します...\n');
    return signWithPowerShell(electronPath, pfxPath);
  }
}

/**
 * signtool.exeのパスを検索
 */
function findSignTool() {
  const possiblePaths = [
    'C:\\Program Files (x86)\\Windows Kits\\10\\bin\\*\\x64\\signtool.exe',
    'C:\\Program Files (x86)\\Windows Kits\\10\\bin\\x64\\signtool.exe',
    'C:\\Program Files (x86)\\Microsoft SDKs\\Windows\\v10.0A\\bin\\NETFX 4.8 Tools\\x64\\signtool.exe',
    'C:\\Program Files (x86)\\Microsoft SDKs\\Windows\\v10.0A\\bin\\NETFX 4.8 Tools\\signtool.exe'
  ];

  for (const pathPattern of possiblePaths) {
    try {
      if (pathPattern.includes('*')) {
        // ワイルドカードを含むパスを検索
        const result = execSync(`powershell -Command "Get-ChildItem '${pathPattern}' -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName"`, {
          encoding: 'utf8',
          stdio: 'pipe'
        }).trim();
        
        if (result && fs.existsSync(result)) {
          return result;
        }
      } else {
        if (fs.existsSync(pathPattern)) {
          return pathPattern;
        }
      }
    } catch (e) {
      // 続行
    }
  }

  return null;
}

/**
 * PowerShellで署名（signtoolが見つからない場合のフォールバック）
 */
function signWithPowerShell(electronPath, pfxPath) {
  console.log('📦 PowerShellで署名を実行中...\n');

  try {
    const psScript = `
      $cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2("${pfxPath.replace(/\\/g, '\\\\')}", "${CERT_PASSWORD}")
      Set-AuthenticodeSignature -FilePath "${electronPath.replace(/\\/g, '\\\\')}" -Certificate $cert -TimestampServer "http://timestamp.digicert.com"
    `;

    execSync(`powershell -NoProfile -Command "${psScript}"`, {
      stdio: 'inherit',
      shell: true
    });

    console.log('\n✓ PowerShellでの署名が完了しました！\n');
    console.log('🎉 Electronバイナリが署名されました\n');
    console.log('   npm start でアプリを起動できます\n');

  } catch (error) {
    console.error(`\n❌ PowerShellでの署名に失敗しました: ${error.message}\n`);
    console.error('💡 手動で署名してください:\n');
    console.error(`   1. 証明書: ${pfxPath}`);
    console.error(`   2. ファイル: ${electronPath}`);
    console.error(`   3. パスワード: ${CERT_PASSWORD}\n`);
    process.exit(1);
  }
}

// 実行
main().catch((error) => {
  console.error(`\n❌ エラー: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
});



