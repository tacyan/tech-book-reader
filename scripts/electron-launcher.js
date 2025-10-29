#!/usr/bin/env node

/**
 * @file Electron起動スクリプト（ウィルス対策ソフト対応版）
 * @description 
 * ウィルス対策ソフトによるブロックを回避するため、
 * Electronバイナリを一時ディレクトリにコピーして実行します。
 * 
 * 主な機能:
 * - Electronバイナリを一時的な場所にコピー
 * - ウィルス対策ソフトのブロック回避
 * - クロスプラットフォーム対応
 */

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

/**
 * Electronバイナリを安全な場所から実行
 */
async function startElectronFromTemp() {
  console.log('🚀 Tech Book Reader を起動中...\n');

  const projectRoot = path.join(__dirname, '..');
  const appArgs = process.argv.slice(2);
  
  // まず、path.txtからElectronのパスを読み取る
  const electronModulePath = path.join(projectRoot, 'node_modules', 'electron');
  const pathTxtPath = path.join(electronModulePath, 'path.txt');
  
  let electronPath;
  
  if (fs.existsSync(pathTxtPath)) {
    // path.txtが存在する場合はそこからパスを読み取る
    electronPath = fs.readFileSync(pathTxtPath, 'utf8').trim();
    console.log(`✓ Electronパスを取得: ${electronPath}\n`);
  } else {
    // path.txtが存在しない場合は、従来の場所を確認
    if (process.platform === 'win32') {
      electronPath = path.join(electronModulePath, 'dist', 'electron.exe');
    } else if (process.platform === 'darwin') {
      electronPath = path.join(electronModulePath, 'dist', 'Electron.app', 'Contents', 'MacOS', 'Electron');
    } else {
      electronPath = path.join(electronModulePath, 'dist', 'electron');
    }
  }
  
  // electron.exeが存在しない場合は、インストールを促す
  if (!fs.existsSync(electronPath)) {
    console.error('\n❌ Electronバイナリが見つかりません\n');
    console.error(`予想されるパス: ${electronPath}\n`);
    console.error('💡 Electronをインストールする必要があります\n');
    console.error('📋 以下のコマンドを実行してください:\n');
    console.error('   node scripts/install-electron.js\n');
    console.error('または:\n');
    console.error('   npm run install-electron\n');
    process.exit(1);
  }
  
  // Electronを直接起動
  console.log('📦 Electronを起動中...\n');
  
  const electronArgs = [
    projectRoot,
    '--no-sandbox',
    '--disable-gpu-sandbox'
  ].concat(appArgs);
  
  const electronProcess = spawn(electronPath, electronArgs, {
    stdio: 'inherit',
    cwd: projectRoot,
    env: {
      ...process.env
    }
  });

  electronProcess.on('error', (error) => {
    console.error(`\n❌ Electron起動失敗: ${error.message}\n`);
    console.error('💡 以下を試してください:');
    console.error('1. node scripts/install-electron.js');
    console.error('2. 詳細は QUICK_START.md を参照\n');
    process.exit(1);
  });

  electronProcess.on('exit', (code, signal) => {
    if (signal) {
      console.log(`\n⚠️  Electronがシグナルで終了: ${signal}\n`);
    }
    if (code && code !== 0) {
      console.log(`\n⚠️  Electronが終了しました (コード: ${code})\n`);
    }
    process.exit(code || 0);
  });
}


// エラーハンドリング
process.on('uncaughtException', (error) => {
  console.error(`\n❌ 予期しないエラー: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(`\n❌ 未処理のPromise拒否:`, reason);
  process.exit(1);
});

// 起動
try {
  startElectronFromTemp();
} catch (error) {
  console.error(`\n❌ エラー: ${error.message}`);
  process.exit(1);
}

