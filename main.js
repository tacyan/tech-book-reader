const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const { spawn } = require('child_process');

// グローバル変数
let EPUBReaderService;
let PDFReaderService;
let LibraryManager;
let libraryManager = null;
let currentReaders = {}; // bookId -> reader instance
let ttsProcess = null;

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    title: 'Tech Book Reader',
    backgroundColor: '#1a1a1a'
  });

  mainWindow.loadFile('src/views/index.html');

  // 開発時にDevToolsを開く
  // mainWindow.webContents.openDevTools();
}

app.whenReady().then(async () => {
  // サービスをインポート（Electronが起動した後にロード）
  EPUBReaderService = require('./src/services/epub-reader');
  PDFReaderService = require('./src/services/pdf-reader');
  LibraryManager = require('./src/services/library-manager');

  // ライブラリマネージャーを初期化
  const userDataPath = app.getPath('userData');
  const libraryPath = path.join(userDataPath, 'library.json');
  console.log('Library path:', libraryPath);

  libraryManager = new LibraryManager(libraryPath);
  await libraryManager.load();

  console.log('Library loaded with', libraryManager.books.length, 'books');

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ===== IPC ハンドラー =====

// ファイル選択ダイアログ
ipcMain.handle('select-book-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'eBooks', extensions: ['epub', 'pdf'] },
      { name: 'EPUB', extensions: ['epub'] },
      { name: 'PDF', extensions: ['pdf'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return { success: true, filePath: result.filePaths[0] };
  }

  return { success: false };
});

// ファイル読み込み
ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const buffer = await fs.readFile(filePath);
    return { success: true, buffer: Array.from(buffer) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ファイル情報取得
ipcMain.handle('get-file-info', async (event, filePath) => {
  try {
    const stats = await fs.stat(filePath);
    const ext = path.extname(filePath).toLowerCase();

    return {
      success: true,
      info: {
        name: path.basename(filePath),
        path: filePath,
        size: stats.size,
        type: ext === '.epub' ? 'epub' : ext === '.pdf' ? 'pdf' : 'unknown',
        modified: stats.mtime
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ライブラリデータの保存
ipcMain.handle('save-library', async (event, libraryData) => {
  try {
    const userDataPath = app.getPath('userData');
    const libraryPath = path.join(userDataPath, 'library.json');

    await fs.writeFile(libraryPath, JSON.stringify(libraryData, null, 2));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ライブラリデータの読み込み
ipcMain.handle('load-library', async () => {
  try {
    const userDataPath = app.getPath('userData');
    const libraryPath = path.join(userDataPath, 'library.json');

    const data = await fs.readFile(libraryPath, 'utf-8');
    return { success: true, data: JSON.parse(data) };
  } catch (error) {
    // ファイルが存在しない場合は空のライブラリを返す
    if (error.code === 'ENOENT') {
      return { success: true, data: { books: [] } };
    }
    return { success: false, error: error.message };
  }
});

// 設定の保存
ipcMain.handle('save-settings', async (event, settings) => {
  try {
    const userDataPath = app.getPath('userData');
    const settingsPath = path.join(userDataPath, 'settings.json');

    await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 設定の読み込み
ipcMain.handle('load-settings', async () => {
  try {
    const userDataPath = app.getPath('userData');
    const settingsPath = path.join(userDataPath, 'settings.json');

    const data = await fs.readFile(settingsPath, 'utf-8');
    return { success: true, data: JSON.parse(data) };
  } catch (error) {
    // デフォルト設定を返す
    if (error.code === 'ENOENT') {
      return {
        success: true,
        data: {
          voice: 'Kyoko',
          speed: 2.0,
          autoNextChapter: true,
          theme: 'dark'
        }
      };
    }
    return { success: false, error: error.message };
  }
});

// ===== Library管理 =====

// ライブラリの初期化
ipcMain.handle('init-library', async () => {
  try {
    const library = await libraryManager.getLibrary();
    return { success: true, data: library };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ライブラリの取得
ipcMain.handle('get-library', async () => {
  try {
    const library = libraryManager.getLibrary();
    console.log('get-library called, returning', library.books.length, 'books');
    return { success: true, data: library };
  } catch (error) {
    console.error('Error in get-library:', error);
    return { success: false, error: error.message };
  }
});

// 本をライブラリに追加
ipcMain.handle('add-book-to-library', async (event, bookInfo) => {
  try {
    await libraryManager.addBook(bookInfo);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 本をライブラリから削除
ipcMain.handle('remove-book-from-library', async (event, bookId) => {
  try {
    const result = await libraryManager.removeBook(bookId);
    if (result) {
      console.log('Book removed from library:', bookId);
      return { success: true };
    } else {
      return { success: false, error: 'Book not found' };
    }
  } catch (error) {
    console.error('Error removing book:', error);
    return { success: false, error: error.message };
  }
});

// PDFをダウンロードしてライブラリに追加
ipcMain.handle('download-and-add-to-library', async (event, bookData) => {
  try {
    const https = require('https');
    const http = require('http');
    const url = require('url');

    const downloadUrl = bookData.downloadLink;
    const parsedUrl = url.parse(downloadUrl);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;

    // ユーザーデータディレクトリにダウンロード
    const userDataPath = app.getPath('userData');
    const downloadsDir = path.join(userDataPath, 'downloads');

    // ディレクトリが存在しない場合は作成
    try {
      await fs.mkdir(downloadsDir, { recursive: true });
    } catch (err) {
      // ディレクトリが既に存在する場合は無視
    }

    // ファイル名をサニタイズ
    const sanitizedTitle = bookData.title.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '_');
    const fileName = `${sanitizedTitle}.pdf`;
    const filePath = path.join(downloadsDir, fileName);

    // PDFをダウンロード
    await new Promise((resolve, reject) => {
      const file = require('fs').createWriteStream(filePath);

      protocol.get(downloadUrl, (response) => {
        // リダイレクトを処理
        if (response.statusCode === 301 || response.statusCode === 302) {
          const redirectUrl = response.headers.location;
          const redirectProtocol = redirectUrl.startsWith('https') ? https : http;

          redirectProtocol.get(redirectUrl, (redirectResponse) => {
            redirectResponse.pipe(file);
            file.on('finish', () => {
              file.close();
              resolve();
            });
          }).on('error', (err) => {
            require('fs').unlink(filePath, () => {}); // ファイルを削除
            reject(err);
          });
        } else {
          response.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve();
          });
        }
      }).on('error', (err) => {
        require('fs').unlink(filePath, () => {}); // ファイルを削除
        reject(err);
      });
    });

    // ライブラリに追加
    const bookInfo = {
      filePath: filePath,
      fileName: fileName,
      type: 'pdf',
      title: bookData.title,
      authors: bookData.authors || ['Unknown Author'], // 配列形式
      author: bookData.authors ? bookData.authors.join(', ') : 'Unknown Author', // 文字列形式
      publisher: bookData.publisher || '',
      thumbnail: bookData.thumbnail || null,
      metadata: {
        description: bookData.description,
        categories: bookData.categories,
        publishedDate: bookData.publishedDate,
        pageCount: bookData.pageCount
      },
      isFree: true,
      pdfAvailable: true,
      downloadLink: bookData.downloadLink
    };

    const addedBook = await libraryManager.addBook(bookInfo);

    console.log('Book added to library:', addedBook);
    console.log('Current library books count:', libraryManager.books.length);

    // ライブラリを再保存して確実に永続化
    await libraryManager.save();

    return {
      success: true,
      book: addedBook,
      filePath: filePath
    };
  } catch (error) {
    console.error('Download and add to library error:', error);
    return { success: false, error: error.message };
  }
});

// 読書進捗の更新
ipcMain.handle('update-progress', async (event, bookId, progress, currentPosition) => {
  try {
    await libraryManager.updateProgress(bookId, progress, currentPosition);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ===== 本の読み込み =====

// 本を開く
ipcMain.handle('open-book', async (event, filePath) => {
  try {
    // ライブラリから本を検索して無料かどうかをチェック
    const books = libraryManager.getAllBooks();
    const book = books.find(b => b.filePath === filePath);

    if (book && book.isFree === false) {
      return {
        success: false,
        error: 'この本は有料です。無料の本のみダウンロード・閲覧できます。',
        isPaid: true
      };
    }

    const ext = path.extname(filePath).toLowerCase();
    let reader = null;

    if (ext === '.epub') {
      reader = new EPUBReaderService();
      await reader.openBook(filePath);
    } else if (ext === '.pdf') {
      reader = new PDFReaderService();
      await reader.openBook(filePath);
    } else {
      throw new Error('Unsupported file format');
    }

    // リーダーをキャッシュ
    currentReaders[filePath] = reader;

    // メタデータと章リストを返す
    return {
      success: true,
      data: {
        metadata: reader.metadata,
        chapters: reader.chapters || reader.pages || [],
        type: ext === '.epub' ? 'epub' : 'pdf'
      }
    };
  } catch (error) {
    console.error('Error opening book:', error);
    return { success: false, error: error.message };
  }
});

// 章のテキストを取得
ipcMain.handle('get-chapter-text', async (event, filePath, chapterIndex) => {
  try {
    // ライブラリから本を検索して無料かどうかをチェック
    const books = libraryManager.getAllBooks();
    const book = books.find(b => b.filePath === filePath);

    if (book && book.isFree === false) {
      return {
        success: false,
        error: 'この本は有料です。無料の本のみダウンロード・閲覧できます。',
        isPaid: true
      };
    }

    const reader = currentReaders[filePath];
    if (!reader) {
      throw new Error('Book not opened. Please open the book first.');
    }

    let text = '';
    if (reader instanceof EPUBReaderService) {
      const chapter = reader.chapters[chapterIndex];
      if (!chapter) {
        throw new Error('Chapter not found');
      }
      text = await reader.getChapterText(chapter.id);
    } else if (reader instanceof PDFReaderService) {
      const page = reader.pages[chapterIndex];
      if (!page) {
        throw new Error('Page not found');
      }
      text = page.text;
    }

    return { success: true, data: text };
  } catch (error) {
    console.error('Error getting chapter text:', error);
    return { success: false, error: error.message };
  }
});

// ===== TTS機能 =====

// 利用可能な音声リストを取得
ipcMain.handle('get-voices', async () => {
  try {
    if (platform === 'darwin') {
      // macOS: sayコマンドから音声リストを取得
      return new Promise((resolve, reject) => {
        const sayProcess = spawn('say', ['-v', '?']);
        let output = '';

        sayProcess.stdout.on('data', (data) => {
          output += data.toString();
        });

        sayProcess.on('close', (code) => {
          if (code === 0) {
            const voices = output.split('\n')
              .filter(line => line.trim().length > 0)
              .map(line => {
                const match = line.match(/^(\S+)/);
                return match ? match[1] : null;
              })
              .filter(v => v !== null);

            resolve({ success: true, data: voices });
          } else {
            resolve({ success: true, data: ['Kyoko', 'Otoya', 'Alex', 'Samantha'] });
          }
        });

        sayProcess.on('error', (error) => {
          resolve({ success: true, data: ['Kyoko', 'Otoya', 'Alex', 'Samantha'] });
        });
      });

    } else if (platform === 'win32') {
      // Windows: デフォルトの音声リスト（SAPI標準）
      return {
        success: true,
        data: [
          'Microsoft David Desktop',
          'Microsoft Zira Desktop',
          'Microsoft Mark',
          'Microsoft Haruka Desktop', // 日本語
          'Microsoft Sayaka Desktop'  // 日本語
        ]
      };

    } else if (platform === 'linux') {
      // Linux: espeakのデフォルト音声
      return {
        success: true,
        data: [
          'en', 'en-us', 'en-uk',
          'ja', // 日本語
          'default'
        ]
      };
    }

    // フォールバック
    return { success: true, data: ['default'] };

  } catch (error) {
    return { success: false, error: error.message };
  }
});

// TTS設定を取得
ipcMain.handle('get-tts-config', async () => {
  try {
    const result = await ipcMain.handleOnce('load-settings');
    return result;
  } catch (error) {
    return {
      success: true,
      data: {
        voice: 'Kyoko',
        speed: 2.0
      }
    };
  }
});

// TTSを開始
// プラットフォームを検出
const platform = process.platform; // 'darwin', 'win32', 'linux'

ipcMain.handle('start-tts', async (event, text, options = {}) => {
  try {
    // 既存のTTSを停止
    if (ttsProcess) {
      ttsProcess.kill();
      ttsProcess = null;
    }

    const voice = options.voice || 'Kyoko';
    const speed = options.speed || 2.0;

    // プラットフォームに応じてTTSを起動
    if (platform === 'darwin') {
      // macOS: say コマンド
      const rate = Math.round(175 * speed);
      const escapedText = text.replace(/"/g, '\\"');

      ttsProcess = spawn('say', [
        '-v', voice,
        '-r', rate.toString(),
        escapedText
      ]);

    } else if (platform === 'win32') {
      // Windows: PowerShellでSAPI (Speech API) を使用
      const rate = Math.round(speed * 2 - 2); // -10〜10の範囲に変換

      // PowerShellスクリプト
      const psScript = `
        Add-Type -AssemblyName System.Speech;
        $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer;
        $synth.Rate = ${rate};
        $synth.Speak("${text.replace(/"/g, '""').replace(/\n/g, ' ')}");
      `;

      ttsProcess = spawn('powershell.exe', [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        psScript
      ]);

    } else if (platform === 'linux') {
      // Linux: espeak
      const rate = Math.round(175 * speed);
      const escapedText = text.replace(/"/g, '\\"');

      ttsProcess = spawn('espeak', [
        '-s', rate.toString(),
        escapedText
      ]);
    }

    if (ttsProcess) {
      ttsProcess.on('close', (code) => {
        console.log(`TTS finished with code: ${code} on ${platform}`);
        ttsProcess = null;
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('tts-finished');
        }
      });

      ttsProcess.on('error', (error) => {
        console.error('TTS error:', error);
        ttsProcess = null;
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('tts-error', error.message);
        }
      });
    }

    return { success: true, platform: platform };
  } catch (error) {
    console.error('Error starting TTS:', error);
    return { success: false, error: error.message };
  }
});

// TTSを一時停止（macOSのsayコマンドは一時停止非対応のため停止）
ipcMain.handle('pause-tts', async () => {
  try {
    if (ttsProcess) {
      ttsProcess.kill();
      ttsProcess = null;
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// TTSを停止
ipcMain.handle('stop-tts', async () => {
  try {
    if (ttsProcess) {
      ttsProcess.kill();
      ttsProcess = null;
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// TTSのステータスを取得
ipcMain.handle('get-tts-status', async () => {
  try {
    const isPlaying = ttsProcess !== null && !ttsProcess.killed;
    return {
      success: true,
      data: {
        isPlaying: isPlaying
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

console.log('Tech Book Reader - Main process started');
