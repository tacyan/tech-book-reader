const { contextBridge, ipcRenderer } = require('electron');

// レンダラープロセスに安全にAPIを公開
contextBridge.exposeInMainWorld('bookReaderAPI', {
  // ファイル操作
  selectBookFile: async () => {
    const result = await ipcRenderer.invoke('select-book-file');
    return result.success ? result.filePath : null;
  },
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  getFileInfo: (filePath) => ipcRenderer.invoke('get-file-info', filePath),

  // ライブラリ管理
  initLibrary: async () => {
    const result = await ipcRenderer.invoke('init-library');
    return result.success ? result.data : { books: [] };
  },
  getLibrary: async () => {
    const result = await ipcRenderer.invoke('get-library');
    return result.success ? result.data : { books: [] };
  },
  addBookToLibrary: async (bookInfo) => {
    const result = await ipcRenderer.invoke('add-book-to-library', bookInfo);
    if (!result.success) throw new Error(result.error);
    return result;
  },
  downloadAndAddToLibrary: async (bookData) => {
    const result = await ipcRenderer.invoke('download-and-add-to-library', bookData);
    if (!result.success) throw new Error(result.error);
    return result;
  },
  removeBookFromLibrary: async (bookId) => {
    const result = await ipcRenderer.invoke('remove-book-from-library', bookId);
    if (!result.success) throw new Error(result.error);
    return result;
  },
  updateProgress: async (bookId, progress, currentPosition) => {
    const result = await ipcRenderer.invoke('update-progress', bookId, progress, currentPosition);
    if (!result.success) throw new Error(result.error);
    return result;
  },

  // 本の読み込み
  openBook: async (filePath) => {
    const result = await ipcRenderer.invoke('open-book', filePath);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },
  getChapterText: async (filePath, chapterIndex) => {
    const result = await ipcRenderer.invoke('get-chapter-text', filePath, chapterIndex);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },

  // TTS機能
  getVoices: async () => {
    const result = await ipcRenderer.invoke('get-voices');
    return result.success ? result.data : ['Kyoko', 'Otoya', 'Alex', 'Samantha'];
  },
  getTTSConfig: async () => {
    const result = await ipcRenderer.invoke('get-tts-config');
    return result.success ? result.data : { voice: 'Kyoko', speed: 2.0 };
  },
  startTTS: async (text, options) => {
    const result = await ipcRenderer.invoke('start-tts', text, options);
    if (!result.success) throw new Error(result.error);
    return result;
  },
  pauseTTS: async () => {
    const result = await ipcRenderer.invoke('pause-tts');
    if (!result.success) throw new Error(result.error);
    return result;
  },
  stopTTS: async () => {
    const result = await ipcRenderer.invoke('stop-tts');
    if (!result.success) throw new Error(result.error);
    return result;
  },
  getTTSStatus: async () => {
    const result = await ipcRenderer.invoke('get-tts-status');
    if (!result.success) throw new Error(result.error);
    return result.data;
  },

  // 設定管理
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  loadSettings: () => ipcRenderer.invoke('load-settings'),

  // イベントリスナー
  onTTSFinished: (callback) => ipcRenderer.on('tts-finished', callback),
  onTTSError: (callback) => ipcRenderer.on('tts-error', (event, error) => callback(error))
});

console.log('Tech Book Reader - Preload script loaded');
