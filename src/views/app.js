/**
 * Tech Book Reader - Main Application
 * メインアプリケーションロジック
 */

// サービスのインスタンスを初期化
const bookSearchService = new BookSearchService();
const translatorService = new TranslatorService();
let libraryManager = null;
let currentBook = null;
let ttsEngine = null;
let currentReader = null; // EPUBReaderまたはPDFReader
let currentBookData = null; // 現在開いている本のデータ
let translatedBookCache = {}; // 翻訳済みの本をキャッシュ
let isAutoReading = false; // 自動読み上げ中かどうか
let isProcessingPageTransition = false; // ページ遷移処理中フラグ（二重実行防止）
let currentSettings = {
  translateToJapanese: false
};

// アプリケーション初期化
async function initApp() {
  console.log('Initializing Tech Book Reader...');

  try {
    // ライブラリマネージャーを初期化
    libraryManager = await window.bookReaderAPI.initLibrary();
    console.log('Library loaded:', libraryManager);

    // TTSエンジンを初期化
    const ttsConfig = await window.bookReaderAPI.getTTSConfig();
    console.log('TTS Config:', ttsConfig);

    // UIイベントリスナーを設定
    setupEventListeners();

    // 人気トピックと出版社タグを表示
    renderPopularTopics();
    renderPublishers();

    // ライブラリビューを更新
    await updateLibraryView();

    // 設定から音声リストを読み込み
    await loadVoicesList();

    // 設定を読み込み
    loadSettings();

    // TTS完了・エラーイベントを購読（連続再生の確実化）
    if (window.bookReaderAPI && typeof window.bookReaderAPI.onTTSFinished === 'function') {
      window.bookReaderAPI.onTTSFinished(async () => {
        try {
          if (isAutoReading) {
            await moveToNextPageAndContinue();
          }
        } catch (e) {
          console.error('onTTSFinished handler error:', e);
        }
      });
    }

    if (window.bookReaderAPI && typeof window.bookReaderAPI.onTTSError === 'function') {
      window.bookReaderAPI.onTTSError((error) => {
        console.error('TTS error event:', error);
        isAutoReading = false;
        try {
          document.getElementById('ttsPlayBtn').style.display = 'inline-block';
          document.getElementById('ttsPauseBtn').style.display = 'none';
        } catch (_) {}
        alert('音声再生エラー: ' + error);
      });
    }

    console.log('App initialized successfully');
  } catch (error) {
    console.error('Error initializing app:', error);
    alert('アプリケーションの初期化に失敗しました: ' + error.message);
  }
}

// イベントリスナーを設定
function setupEventListeners() {
  // ナビゲーション
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const viewName = btn.dataset.view;
      switchView(viewName);
    });
  });

  // ライブラリビュー
  document.getElementById('addBookBtn').addEventListener('click', addBookToLibrary);
  document.getElementById('librarySearch').addEventListener('input', filterLibrary);
  document.getElementById('sortBy').addEventListener('change', sortLibrary);
  document.getElementById('filterType').addEventListener('change', filterLibrary);

  // 検索ビュー
  document.getElementById('searchBtn').addEventListener('click', searchBooks);
  document.getElementById('bookSearch').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchBooks();
  });

  // リーダー
  document.getElementById('closeReaderBtn').addEventListener('click', closeReader);
  document.getElementById('ttsPlayBtn').addEventListener('click', startReading);
  document.getElementById('ttsPauseBtn').addEventListener('click', pauseReading);
  document.getElementById('ttsStopBtn').addEventListener('click', stopReading);
  document.getElementById('prevChapterBtn').addEventListener('click', prevChapter);
  document.getElementById('nextChapterBtn').addEventListener('click', nextChapter);

  // リーダーコントロール
  document.getElementById('readerTranslateToggle').addEventListener('change', async (e) => {
    currentSettings.translateToJapanese = e.target.checked;

    // 翻訳が有効になった場合、全ページを翻訳
    if (e.target.checked && currentBook && currentBookData) {
      await translateEntireBook(currentBook.filePath, currentBookData);
      // 現在のページを再表示して翻訳版を表示
      await displayChapter(currentBook.currentChapter || 0);
    } else if (!e.target.checked && currentBook && currentBookData) {
      // 翻訳が無効になった場合、キャッシュをクリアして元のテキストを表示
      delete translatedBookCache[currentBook.filePath];
      await displayChapter(currentBook.currentChapter || 0);
    }
  });
  document.getElementById('readerSpeedSlider').addEventListener('input', (e) => {
    const speed = parseFloat(e.target.value);
    currentSettings.speed = speed;
    document.getElementById('readerSpeedValue').textContent = speed.toFixed(1);
    document.getElementById('currentSpeed').textContent = speed.toFixed(1) + 'x';
  });
  document.getElementById('pageJumpBtn').addEventListener('click', jumpToPage);
  document.getElementById('downloadTranslatedBtn').addEventListener('click', downloadTranslatedBook);

  // 設定
  document.getElementById('voiceSelect').addEventListener('change', saveSettings);
  document.getElementById('speedSlider').addEventListener('input', (e) => {
    document.getElementById('speedValue').textContent = e.target.value;
    saveSettings();
  });
  document.getElementById('autoNextChapter').addEventListener('change', saveSettings);
  document.getElementById('translateToJapanese').addEventListener('change', saveSettings);
  document.getElementById('themeSelect').addEventListener('change', saveSettings);
  document.getElementById('testVoiceBtn').addEventListener('click', testVoice);
}

// ビューを切り替え
function switchView(viewName) {
  // すべてのビューを非表示
  document.querySelectorAll('.view').forEach(view => {
    view.classList.remove('active');
  });

  // ナビゲーションボタンのアクティブ状態をリセット
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.remove('active');
  });

  // 指定されたビューを表示
  document.getElementById(`${viewName}-view`).classList.add('active');
  document.querySelector(`[data-view="${viewName}"]`).classList.add('active');

  // ビュー固有の処理
  if (viewName === 'library') {
    updateLibraryView();
  } else if (viewName === 'reading') {
    updateReadingView();
  } else if (viewName === 'favorites') {
    updateFavoritesView();
  } else if (viewName === 'settings') {
    updateLibraryStats();
  }
}

// ===== ライブラリビュー =====

async function addBookToLibrary() {
  try {
    const filePath = await window.bookReaderAPI.selectBookFile();
    if (!filePath) return;

    console.log('Selected file:', filePath);

    // ファイルを読み込む
    const fileData = await window.bookReaderAPI.readFile(filePath);
    const fileType = filePath.toLowerCase().endsWith('.epub') ? 'epub' : 'pdf';

    // 本をライブラリに追加
    const bookInfo = {
      filePath: filePath,
      type: fileType,
      addedDate: new Date().toISOString()
    };

    await window.bookReaderAPI.addBookToLibrary(bookInfo);

    alert('本をライブラリに追加しました！');
    await updateLibraryView();
  } catch (error) {
    console.error('Error adding book:', error);
    alert('本の追加に失敗しました: ' + error.message);
  }
}

async function updateLibraryView() {
  try {
    const library = await window.bookReaderAPI.getLibrary();
    console.log('Library data received:', library);

    const books = library.books || [];
    console.log('Updating library view with', books.length, 'books');

    if (books.length > 0) {
      console.log('First book:', books[0]);
    }

    const grid = document.getElementById('booksGrid');

    if (books.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📚</div>
          <h3>本がありません</h3>
          <p>「本を追加」ボタンからEPUBまたはPDFファイルを追加してください</p>
        </div>
      `;
      updateBookStats(0, 0);
      return;
    }

    // 本のカードを表示
    grid.innerHTML = books.map(book => createBookCard(book)).join('');

    // カードにクリックイベントを追加
    document.querySelectorAll('.book-card').forEach(card => {
      card.addEventListener('click', () => {
        const bookId = card.dataset.bookId;
        openBook(bookId);
      });
    });

    // 統計を更新
    const readingCount = books.filter(b => b.progress > 0 && b.progress < 100).length;
    updateBookStats(books.length, readingCount);
  } catch (error) {
    console.error('Error updating library:', error);
  }
}

function createBookCard(book) {
  const progress = book.progress || 0;
  const title = book.title || 'Unknown Title';

  // authorsが配列の場合とauthorが文字列の場合の両方に対応
  let author = 'Unknown Author';
  if (book.authors && Array.isArray(book.authors) && book.authors.length > 0) {
    author = book.authors.join(', ');
  } else if (book.author) {
    author = book.author;
  }

  const coverUrl = book.thumbnail || '';
  const isFree = book.isFree !== false; // デフォルトは無料として扱う
  const freeLabel = isFree ? '<span class="free-badge">無料</span>' : '<span class="paid-badge">有料</span>';

  // ダウンロードボタンのHTML（無料でダウンロードリンクがある場合のみ）
  const downloadButton = (isFree && book.downloadLink)
    ? `<button class="btn-download" onclick="event.stopPropagation(); window.open('${book.downloadLink}', '_blank')">⬇️</button>`
    : '';

  return `
    <div class="book-card ${!isFree ? 'paid-book' : ''}" data-book-id="${book.id}">
      <div class="book-cover">
        ${coverUrl ? `<img src="${coverUrl}" alt="${title}" onerror="this.style.display='none'; this.parentElement.innerHTML='<div style=\\'font-size: 4rem;\\'>📖</div>' + this.parentElement.innerHTML.replace(/<img[^>]*>/g, '')">` : '<div style="font-size: 4rem;">📖</div>'}
        ${freeLabel}
        ${downloadButton}
        <button class="btn-delete" onclick="event.stopPropagation(); deleteBook('${book.id}')">🗑️</button>
      </div>
      <div class="book-title">${title}</div>
      <div class="book-author">${author}</div>
      <div class="book-progress">
        <div class="book-progress-fill" style="width: ${progress}%"></div>
      </div>
    </div>
  `;
}

// 本を削除
async function deleteBook(bookId) {
  try {
    if (!confirm('この本をライブラリから削除しますか？')) {
      return;
    }

    await window.bookReaderAPI.removeBookFromLibrary(bookId);
    alert('本を削除しました');

    // ライブラリビューを更新
    await updateLibraryView();
  } catch (error) {
    console.error('Error deleting book:', error);
    alert(`削除エラー: ${error.message}`);
  }
}

function updateBookStats(total, reading) {
  document.getElementById('totalBooks').textContent = total;
  document.getElementById('readingBooks').textContent = reading;
}

async function filterLibrary() {
  const searchText = document.getElementById('librarySearch').value.toLowerCase();
  const filterType = document.getElementById('filterType').value;

  const library = await window.bookReaderAPI.getLibrary();
  let books = library.books || [];

  // タイプでフィルター
  if (filterType !== 'all') {
    books = books.filter(book => book.type === filterType);
  }

  // テキストでフィルター
  if (searchText) {
    books = books.filter(book => {
      const title = (book.title || '').toLowerCase();
      const author = (book.authors || []).join(' ').toLowerCase();
      return title.includes(searchText) || author.includes(searchText);
    });
  }

  // 表示を更新
  const grid = document.getElementById('booksGrid');
  if (books.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <h3>本が見つかりません</h3>
        <p>検索条件を変更してください</p>
      </div>
    `;
  } else {
    grid.innerHTML = books.map(book => createBookCard(book)).join('');
    document.querySelectorAll('.book-card').forEach(card => {
      card.addEventListener('click', () => {
        const bookId = card.dataset.bookId;
        openBook(bookId);
      });
    });
  }
}

async function sortLibrary() {
  const sortBy = document.getElementById('sortBy').value;
  const library = await window.bookReaderAPI.getLibrary();
  let books = library.books || [];

  switch (sortBy) {
    case 'title':
      books.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      break;
    case 'author':
      books.sort((a, b) => {
        const authorA = (a.authors || [])[0] || '';
        const authorB = (b.authors || [])[0] || '';
        return authorA.localeCompare(authorB);
      });
      break;
    case 'lastReadDate':
      books.sort((a, b) => {
        const dateA = new Date(a.lastReadDate || 0);
        const dateB = new Date(b.lastReadDate || 0);
        return dateB - dateA;
      });
      break;
    case 'addedDate':
    default:
      books.sort((a, b) => {
        const dateA = new Date(a.addedDate || 0);
        const dateB = new Date(b.addedDate || 0);
        return dateB - dateA;
      });
      break;
  }

  // 表示を更新
  const grid = document.getElementById('booksGrid');
  grid.innerHTML = books.map(book => createBookCard(book)).join('');
  document.querySelectorAll('.book-card').forEach(card => {
    card.addEventListener('click', () => {
      const bookId = card.dataset.bookId;
      openBook(bookId);
    });
  });
}

// ===== 検索ビュー =====

function renderPopularTopics() {
  const topics = bookSearchService.getPopularTopics();
  const container = document.getElementById('topicTags');

  container.innerHTML = topics.map(topic =>
    `<span class="tag" data-query="${topic.query}">${topic.name}</span>`
  ).join('');

  container.querySelectorAll('.tag').forEach(tag => {
    tag.addEventListener('click', () => {
      document.getElementById('bookSearch').value = tag.dataset.query;
      searchBooks();
    });
  });
}

function renderPublishers() {
  const publishers = bookSearchService.getPublishers();
  const container = document.getElementById('publisherTags');

  container.innerHTML = publishers.map(pub =>
    `<span class="tag" data-query="${pub.query}">${pub.name}</span>`
  ).join('');

  container.querySelectorAll('.tag').forEach(tag => {
    tag.addEventListener('click', () => {
      document.getElementById('bookSearch').value = tag.dataset.query;
      searchBooks();
    });
  });
}

// 検索状態を保持
let currentSearchResults = [];
let currentPage = 1;
const RESULTS_PER_PAGE = 10;
let currentCategory = 'all'; // 'all', 'tech', 'general'

async function searchBooks() {
  const query = document.getElementById('bookSearch').value.trim();
  if (!query) {
    alert('検索キーワードを入力してください');
    return;
  }

  const resultsContainer = document.getElementById('searchResults');
  resultsContainer.innerHTML = '<div class="empty-state"><p>検索中...</p></div>';

  try {
    console.log('Searching for:', query);

    // まずキュレートされたPDFカタログから即座に検索
    const freePdfs = bookSearchService.searchFreePdfs(query);

    // 最初の10件をすぐに表示
    if (freePdfs.length > 0) {
      currentSearchResults = freePdfs;
      currentPage = 1;
      displaySearchResults();
    }

    // バックグラウンドでAPI検索を実行
    const [openLibraryResult, gutenbergResult, internetArchiveResult] = await Promise.all([
      bookSearchService.searchOpenLibrary(query, { limit: 20 }).catch(() => ({ success: false, books: [] })),
      bookSearchService.searchGutenberg(query, { limit: 20 }).catch(() => ({ success: false, books: [] })),
      bookSearchService.searchInternetArchive(query, { limit: 20 }).catch(() => ({ success: false, books: [] }))
    ]);

    // API結果を統合
    const allBooks = [...freePdfs];

    if (openLibraryResult.success && openLibraryResult.books.length > 0) {
      allBooks.push(...openLibraryResult.books.map(b => ({ ...b, source: 'Open Library' })));
    }

    if (gutenbergResult.success && gutenbergResult.books.length > 0) {
      allBooks.push(...gutenbergResult.books.map(b => ({ ...b, source: 'Project Gutenberg' })));
    }

    if (internetArchiveResult.success && internetArchiveResult.books.length > 0) {
      allBooks.push(...internetArchiveResult.books.map(b => ({ ...b, source: 'Internet Archive' })));
    }

    // 重複を除去
    const uniqueBooks = bookSearchService.removeDuplicates(allBooks);

    if (uniqueBooks.length > 0) {
      currentSearchResults = uniqueBooks;
      currentPage = 1;
      displaySearchResults();
    } else {
      resultsContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">❌</div>
          <h3>検索結果が見つかりません</h3>
          <p>別のキーワードで検索してください</p>
        </div>
      `;
    }
  } catch (error) {
    console.error('Search error:', error);
    resultsContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <h3>検索エラー</h3>
        <p>${error.message}</p>
      </div>
    `;
  }
}

function displaySearchResults() {
  const resultsContainer = document.getElementById('searchResults');

  // カテゴリフィルタリング
  let filteredResults = currentSearchResults;
  if (currentCategory === 'tech') {
    filteredResults = currentSearchResults.filter(book => isTechBook(book));
  } else if (currentCategory === 'general') {
    filteredResults = currentSearchResults.filter(book => !isTechBook(book));
  }

  const totalResults = filteredResults.length;
  const totalPages = Math.ceil(totalResults / RESULTS_PER_PAGE);
  const startIndex = (currentPage - 1) * RESULTS_PER_PAGE;
  const endIndex = Math.min(startIndex + RESULTS_PER_PAGE, totalResults);
  const pageResults = filteredResults.slice(startIndex, endIndex);

  if (pageResults.length === 0) {
    resultsContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">❌</div>
        <h3>このカテゴリに結果がありません</h3>
        <p>別のカテゴリまたはキーワードで検索してください</p>
      </div>
    `;
    return;
  }

  // カテゴリフィルタUIを追加
  const categoryFilter = `
    <div class="category-filter">
      <button class="category-btn ${currentCategory === 'all' ? 'active' : ''}" onclick="filterCategory('all')">
        すべて (${currentSearchResults.length})
      </button>
      <button class="category-btn ${currentCategory === 'tech' ? 'active' : ''}" onclick="filterCategory('tech')">
        技術書 (${currentSearchResults.filter(b => isTechBook(b)).length})
      </button>
      <button class="category-btn ${currentCategory === 'general' ? 'active' : ''}" onclick="filterCategory('general')">
        一般書籍 (${currentSearchResults.filter(b => !isTechBook(b)).length})
      </button>
    </div>
  `;

  // ページネーションUI
  const pagination = totalPages > 1 ? `
    <div class="pagination">
      <button class="pagination-btn" onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
        ← 前へ
      </button>
      <span class="pagination-info">
        ${startIndex + 1}〜${endIndex}件 / 全${totalResults}件 (ページ ${currentPage}/${totalPages})
      </span>
      <button class="pagination-btn" onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
        次へ →
      </button>
    </div>
  ` : '';

  resultsContainer.innerHTML = categoryFilter + pagination +
    pageResults.map(book => createSearchResultCard(book)).join('') +
    pagination;

  // 「ライブラリに追加」ボタンにイベントリスナーを追加
  document.querySelectorAll('.btn-download-to-library').forEach(button => {
    button.addEventListener('click', async (e) => {
      const card = e.target.closest('.result-card');
      const bookJson = card.dataset.bookJson;
      const book = JSON.parse(bookJson.replace(/&quot;/g, '"'));
      await downloadAndAddToLibrary(book);
    });
  });
}

function isTechBook(book) {
  const techKeywords = [
    'programming', 'software', 'computer', 'algorithm', 'data',
    'web', 'javascript', 'python', 'java', 'development',
    'engineering', 'machine learning', 'ai', 'devops', 'cloud',
    'database', 'react', 'node', 'typescript', 'rust', 'go',
    'docker', 'kubernetes', 'linux', 'html', 'css', 'sql'
  ];

  const searchText = `${book.title} ${book.categories.join(' ')} ${book.description}`.toLowerCase();
  return techKeywords.some(keyword => searchText.includes(keyword.toLowerCase()));
}

function filterCategory(category) {
  currentCategory = category;
  currentPage = 1;
  displaySearchResults();
}

function changePage(page) {
  const filteredResults = currentCategory === 'all' ? currentSearchResults :
                          currentCategory === 'tech' ? currentSearchResults.filter(b => isTechBook(b)) :
                          currentSearchResults.filter(b => !isTechBook(b));
  const totalPages = Math.ceil(filteredResults.length / RESULTS_PER_PAGE);

  if (page < 1 || page > totalPages) return;

  currentPage = page;
  displaySearchResults();

  // トップにスクロール
  document.getElementById('searchResults').scrollIntoView({ behavior: 'smooth' });
}

// PDFをダウンロードしてライブラリに追加
async function downloadAndAddToLibrary(book) {
  try {
    if (!confirm(`「${book.title}」をライブラリに追加してダウンロードしますか？`)) {
      return;
    }

    // ローディング表示
    const resultsContainer = document.getElementById('searchResults');
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'loading-overlay';
    loadingOverlay.innerHTML = `
      <div class="loading-content">
        <div class="spinner"></div>
        <p>PDFをダウンロード中...</p>
        <p class="loading-title">${book.title}</p>
      </div>
    `;
    resultsContainer.appendChild(loadingOverlay);

    // PDFをダウンロードしてライブラリに追加
    const result = await window.bookReaderAPI.downloadAndAddToLibrary(book);

    // ローディング削除
    loadingOverlay.remove();

    if (result.success) {
      alert(`「${book.title}」をライブラリに追加しました！\nライブラリビューから開いて音声読み上げができます。`);

      // ライブラリビューを更新
      await updateLibraryView();

      // ライブラリビューに切り替え
      switchView('library');
    } else {
      // ダウンロードエラーの詳細メッセージ
      let errorMsg = 'ダウンロードに失敗しました。';

      if (result.error.includes('ステータスコード')) {
        errorMsg = 'ダウンロードリンクが無効です。この本は現在ダウンロードできません。';
      } else if (result.error.includes('PDFファイルではありません')) {
        errorMsg = 'ダウンロードしたファイルはPDFではありません。';
      } else if (result.error.includes('有効なPDFではありません')) {
        errorMsg = 'ダウンロードしたファイルは破損しているか、無効なPDFです。';
      } else if (result.error.includes('小さすぎます')) {
        errorMsg = 'ダウンロードしたPDFファイルが破損している可能性があります。';
      } else {
        errorMsg = `エラー: ${result.error}`;
      }

      alert(errorMsg + '\n\n別の本を試してください。');
    }
  } catch (error) {
    console.error('Download and add to library error:', error);
    alert(`ダウンロードエラー: ${error.message}\n\n別の本を試してください。`);
  } finally {
    // ローディングが残っていれば削除
    const loadingOverlay = document.querySelector('.loading-overlay');
    if (loadingOverlay) {
      loadingOverlay.remove();
    }
  }
}

function createSearchResultCard(book) {
  const thumbnail = book.thumbnail || '';
  const description = book.description || '説明がありません';
  const authors = (book.authors || []).join(', ');
  const categories = (book.categories || []).slice(0, 3).join(', ');
  const isFree = book.isFree === true;
  const isCuratedPdf = book.source === 'Curated Free PDFs';
  const freeLabel = isFree ? '<span class="free-badge">無料</span>' : '<span class="paid-badge">有料</span>';

  // ダウンロードリンクがある場合のみダウンロードボタンを表示
  const hasDownloadLink = book.downloadLink && book.downloadLink !== null;

  // Internet ArchiveのページへのリンクがあればInternet Archiveページを表示
  const iaPageLink = book.iaId ? `https://archive.org/details/${book.iaId}` : null;

  // JSONをエスケープしてdata属性に格納
  const bookJsonEscaped = JSON.stringify(book).replace(/"/g, '&quot;');

  return `
    <div class="result-card ${!isFree ? 'paid-book' : ''} ${isCuratedPdf ? 'curated-pdf' : ''}" data-book-json="${bookJsonEscaped}">
      <div class="result-cover">
        ${thumbnail ? `<img src="${thumbnail}" alt="${book.title}" onerror="this.style.display='none'; this.parentElement.innerHTML='<div style=\\'font-size: 3rem; display: flex; align-items: center; justify-content: center; height: 100%;\\'>📖</div>' + this.parentElement.innerHTML.replace(/<img[^>]*>/g, '')">` : '<div style="font-size: 3rem; display: flex; align-items: center; justify-content: center; height: 100%;">📖</div>'}
        ${freeLabel}
        ${isCuratedPdf ? '<span class="verified-badge">✓ 検証済み</span>' : ''}
      </div>
      <div class="result-info">
        <div class="result-title">${book.title}</div>
        <div class="result-author">${authors}</div>
        <div class="result-description">${description}</div>
        <div class="result-meta">
          <span>📅 ${book.publishedDate}</span>
          <span>📚 ${categories}</span>
          ${book.pageCount ? `<span>📄 ${book.pageCount}ページ</span>` : ''}
          ${book.rating ? `<span>⭐ ${book.rating} (${book.ratingsCount})</span>` : ''}
          ${hasDownloadLink ? `<span style="color: #22c55e; font-weight: 600;">✓ 直接ダウンロード可能</span>` : ''}
        </div>
        <div class="result-actions">
          ${isFree && hasDownloadLink ? `<button class="btn btn-primary btn-download-to-library">📥 ライブラリに追加して読む</button>` : ''}
          ${isFree && iaPageLink ? `<button class="btn btn-secondary" onclick="window.open('${iaPageLink}', '_blank')">📖 Internet Archiveで見る</button>` : ''}
          ${isFree && !hasDownloadLink && book.previewLink ? `<button class="btn btn-secondary" onclick="window.open('${book.previewLink}', '_blank')">プレビュー</button>` : ''}
          ${isFree && !hasDownloadLink && !iaPageLink && book.infoLink ? `<button class="btn btn-primary" onclick="window.open('${book.infoLink}', '_blank')">詳細を見る</button>` : ''}
          ${!isFree ? `<span class="paid-notice">※ この本は有料です</span>` : ''}
        </div>
      </div>
    </div>
  `;
}

// ===== 読書中ビュー =====

async function updateReadingView() {
  const library = await window.bookReaderAPI.getLibrary();
  const books = (library.books || []).filter(book => book.progress > 0 && book.progress < 100);

  const grid = document.getElementById('readingGrid');

  if (books.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📗</div>
        <h3>読書中の本がありません</h3>
        <p>ライブラリから本を開いて読書を始めましょう</p>
      </div>
    `;
  } else {
    grid.innerHTML = books.map(book => createBookCard(book)).join('');
    document.querySelectorAll('.book-card').forEach(card => {
      card.addEventListener('click', () => {
        const bookId = card.dataset.bookId;
        openBook(bookId);
      });
    });
  }
}

// ===== お気に入りビュー =====

async function updateFavoritesView() {
  const library = await window.bookReaderAPI.getLibrary();
  const books = (library.books || []).filter(book => book.favorite);

  const grid = document.getElementById('favoritesGrid');

  if (books.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⭐</div>
        <h3>お気に入りの本がありません</h3>
        <p>本をお気に入りに追加しましょう</p>
      </div>
    `;
  } else {
    grid.innerHTML = books.map(book => createBookCard(book)).join('');
    document.querySelectorAll('.book-card').forEach(card => {
      card.addEventListener('click', () => {
        const bookId = card.dataset.bookId;
        openBook(bookId);
      });
    });
  }
}

// ===== リーダー機能 =====

async function openBook(bookId) {
  try {
    const library = await window.bookReaderAPI.getLibrary();
    const book = library.books.find(b => b.id === bookId);

    if (!book) {
      alert('本が見つかりません');
      return;
    }

    // 無料の本かどうかをチェック
    if (book.isFree === false) {
      alert('この本は有料です。無料の本のみダウンロード・閲覧できます。');
      return;
    }

    currentBook = book;
    console.log('Opening book:', book);

    // リーダーモーダルを表示
    document.getElementById('readerModal').style.display = 'flex';
    document.getElementById('readerTitle').textContent = book.title || '読み込み中...';
    document.getElementById('readerText').innerHTML = '<p>本を読み込んでいます...</p>';

    // リーダーコントロールを初期化
    const settings = loadSettings();
    const speed = parseFloat(settings.speed) || 2.0;
    document.getElementById('readerTranslateToggle').checked = settings.translateToJapanese || false;
    document.getElementById('readerSpeedSlider').value = speed;
    document.getElementById('readerSpeedValue').textContent = speed.toFixed(1);
    document.getElementById('currentSpeed').textContent = speed.toFixed(1) + 'x';
    currentSettings.translateToJapanese = settings.translateToJapanese || false;
    currentSettings.speed = speed;

    // 本を読み込み
    const bookData = await window.bookReaderAPI.openBook(book.filePath);
    console.log('Book opened:', bookData);
    currentBookData = bookData;

    // 翻訳が有効な場合は、全ページを翻訳
    if (currentSettings.translateToJapanese) {
      await translateEntireBook(book.filePath, bookData);
    }

    // 章リストを表示
    renderChapterList(bookData);

    // 最初の章を表示（または前回の続きから）
    const startChapter = book.currentChapter || 0;
    await displayChapter(startChapter);

  } catch (error) {
    console.error('Error opening book:', error);

    // エラーの種類に応じてメッセージを表示
    let errorMessage = '本を開けませんでした: ' + error.message;

    if (error.corrupted) {
      errorMessage = 'このPDFは破損しているか、対応していない形式です。ライブラリから削除されました。\n別の本を試してください。';
      // ライブラリを再読み込み
      await loadLibraryBooks();
    } else if (error.fileNotFound) {
      errorMessage = 'ファイルが見つかりません。削除された可能性があります。';
      // ライブラリを再読み込み
      await loadLibraryBooks();
    }

    alert(errorMessage);
    closeReader();
  }
}

async function translateEntireBook(filePath, bookData) {
  // すでに翻訳済みの場合はスキップ
  if (translatedBookCache[filePath]) {
    console.log('Book already translated, using cache');
    return;
  }

  try {
    const chapters = bookData.chapters || bookData.pages || [];
    const totalChapters = chapters.length;

    console.log(`Starting translation of ${totalChapters} pages...`);

    // 翻訳中の表示
    const readerText = document.getElementById('readerText');
    const translationHTML = `
      <div id="translationContainer" style="text-align: center; padding: 40px;">
        <p style="font-size: 24px; margin-bottom: 20px;">📚 本を翻訳しています...</p>
        <p style="color: #888; margin-bottom: 10px;">全 ${totalChapters} ページを高速並列翻訳中</p>
        <div style="width: 100%; max-width: 400px; margin: 20px auto; background: #333; border-radius: 10px; overflow: hidden;">
          <div id="translationProgress" style="width: 0%; height: 8px; background: linear-gradient(90deg, #4a90e2, #357abd); transition: width 0.3s;"></div>
        </div>
        <p id="translationStatus" style="color: #4a90e2;">準備中...</p>
        <p style="color: #666; font-size: 12px; margin-top: 10px;">⚡ 並列処理で高速翻訳中...</p>
      </div>
    `;
    readerText.innerHTML = translationHTML;

    // 翻訳済みテキストを保存（初期化）
    const translationResults = new Array(totalChapters);
    let completedCount = 0;

    // 進捗を更新する関数
    const updateProgress = () => {
      const container = document.getElementById('translationContainer');
      if (!container) return; // UIが削除された場合は何もしない

      const progress = (completedCount / totalChapters) * 100;
      const progressBar = document.getElementById('translationProgress');
      const statusText = document.getElementById('translationStatus');

      if (progressBar) progressBar.style.width = `${progress}%`;
      if (statusText) statusText.textContent = `完了: ${completedCount} / ${totalChapters} ページ`;
    };

    // 並列翻訳タスクを作成（50並列で実行 - 最大限高速化）
    const BATCH_SIZE = 50;
    const batches = [];

    for (let i = 0; i < totalChapters; i += BATCH_SIZE) {
      const batchPromises = [];

      for (let j = i; j < Math.min(i + BATCH_SIZE, totalChapters); j++) {
        const pageIndex = j;

        const translateTask = async () => {
          try {
            const text = await window.bookReaderAPI.getChapterText(filePath, pageIndex);

            if (text && text.trim().length > 0) {
              const translatedText = await translatorService.translateIfNeeded(text, true);
              translationResults[pageIndex] = translatedText;
            } else {
              translationResults[pageIndex] = '';
            }

            completedCount++;
            updateProgress();
          } catch (error) {
            console.error(`Error translating page ${pageIndex}:`, error);
            translationResults[pageIndex] = ''; // エラーの場合は空文字
            completedCount++;
            updateProgress();
          }
        };

        batchPromises.push(translateTask());
      }

      batches.push(Promise.all(batchPromises));
    }

    // すべてのバッチを順次実行（バッチ内は並列）
    for (const batch of batches) {
      await batch;
    }

    // 結果をキャッシュに保存
    translatedBookCache[filePath] = {};
    for (let i = 0; i < totalChapters; i++) {
      translatedBookCache[filePath][i] = translationResults[i] || '';
    }

    console.log('Translation completed for all pages');

    // 翻訳完了後、ダウンロードボタンを表示
    const downloadBtn = document.getElementById('downloadTranslatedBtn');
    if (downloadBtn) {
      downloadBtn.style.display = 'inline-block';
    }

  } catch (error) {
    console.error('Error translating book:', error);
    alert('本の翻訳中にエラーが発生しました: ' + error.message);
  }
}

function renderChapterList(bookData) {
  const chapterList = document.getElementById('chapterList');
  const chapters = bookData.chapters || bookData.pages || [];

  chapterList.innerHTML = chapters.map((chapter, index) => `
    <button class="chapter-item" data-chapter-index="${index}">
      ${chapter.title || chapter.label || `ページ ${index + 1}`}
    </button>
  `).join('');

  // 章をクリックしたときのイベント
  chapterList.querySelectorAll('.chapter-item').forEach(item => {
    item.addEventListener('click', () => {
      const index = parseInt(item.dataset.chapterIndex);
      displayChapter(index);
    });
  });
}

async function displayChapter(chapterIndex) {
  try {
    console.log('Displaying chapter:', chapterIndex);

    let text;

    // 翻訳済みキャッシュがあればそれを使用
    if (translatedBookCache[currentBook.filePath] && translatedBookCache[currentBook.filePath][chapterIndex] !== undefined) {
      text = translatedBookCache[currentBook.filePath][chapterIndex];
      console.log('Using translated text from cache, length:', text ? text.length : 0);
    } else {
      // キャッシュがなければ元のテキストを取得
      text = await window.bookReaderAPI.getChapterText(currentBook.filePath, chapterIndex);
      console.log('Chapter text received, length:', text ? text.length : 0);
    }

    if (!text || text.trim().length === 0) {
      console.warn('Empty text received for chapter:', chapterIndex);
      document.getElementById('readerText').innerHTML = '<p style="color: #888;">このページにはテキストがありません</p>';
      return;
    }

    // テキストを表示（HTMLエスケープして安全に表示）
    const escapedText = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n\n+/g, '</p><p>')
      .replace(/\n/g, '<br>');

    document.getElementById('readerText').innerHTML = `<p>${escapedText}</p>`;

    // 章情報を更新
    const bookData = await window.bookReaderAPI.openBook(currentBook.filePath);
    const chapters = bookData.chapters || bookData.pages || [];
    const currentChapter = chapters[chapterIndex];

    document.getElementById('currentChapterInfo').textContent =
      currentChapter?.title || currentChapter?.label || `ページ ${chapterIndex + 1}`;

    // 進捗を計算
    const progress = ((chapterIndex + 1) / chapters.length) * 100;
    document.getElementById('progressFill').style.width = `${progress}%`;

    // アクティブな章をハイライト
    document.querySelectorAll('.chapter-item').forEach((item, index) => {
      if (index === chapterIndex) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // 進捗を保存
    await window.bookReaderAPI.updateProgress(currentBook.id, progress, chapterIndex);

    // 現在の章を記録
    currentBook.currentChapter = chapterIndex;
    currentBook.progress = progress;

  } catch (error) {
    console.error('Error displaying chapter:', error);
    alert('章の読み込みに失敗しました: ' + error.message);
  }
}

async function prevChapter() {
  if (!currentBook) return;

  const currentChapter = currentBook.currentChapter || 0;
  if (currentChapter > 0) {
    await displayChapter(currentChapter - 1);
  }
}

async function nextChapter() {
  if (!currentBook) return;

  const bookData = await window.bookReaderAPI.openBook(currentBook.filePath);
  const totalChapters = (bookData.chapters || bookData.pages || []).length;
  const currentChapter = currentBook.currentChapter || 0;

  if (currentChapter < totalChapters - 1) {
    await displayChapter(currentChapter + 1);
  }
}

async function jumpToPage() {
  if (!currentBook) return;

  const pageInput = document.getElementById('pageJumpInput');
  const pageNumber = parseInt(pageInput.value);

  if (isNaN(pageNumber) || pageNumber < 1) {
    alert('有効なページ番号を入力してください');
    return;
  }

  const bookData = await window.bookReaderAPI.openBook(currentBook.filePath);
  const totalChapters = (bookData.chapters || bookData.pages || []).length;

  if (pageNumber > totalChapters) {
    alert(`ページ番号は1〜${totalChapters}の範囲で指定してください`);
    return;
  }

  await displayChapter(pageNumber - 1);
  pageInput.value = '';
}

function closeReader() {
  // 読み上げを停止
  stopReading();

  // モーダルを閉じる
  document.getElementById('readerModal').style.display = 'none';

  // ダウンロードボタンを非表示
  const downloadBtn = document.getElementById('downloadTranslatedBtn');
  if (downloadBtn) {
    downloadBtn.style.display = 'none';
  }

  // リーダーをリセット
  currentBook = null;
  currentReader = null;
}

// ===== TTS機能 =====

async function startReading() {
  try {
    if (!currentBook) {
      alert('本を開いてください');
      return;
    }

    // 自動読み上げモードを有効化
    isAutoReading = true;

    // 現在のページから読み上げを開始
    await readCurrentPage();

  } catch (error) {
    console.error('Error starting TTS:', error);
    alert('読み上げの開始に失敗しました: ' + error.message);
    isAutoReading = false;
  }
}

async function readCurrentPage() {
  try {
    if (!isAutoReading) return;

    // 表示中のテキストを取得
    const readerText = document.getElementById('readerText');
    const text = readerText.innerText;

    if (!text || text.trim().length === 0) {
      console.warn('No text to read on this page, moving to next page');
      await moveToNextPageAndContinue();
      return;
    }

    console.log('Reading page with text length:', text.length);

    // TTSを開始（リーダービューの設定を使用）
    const settings = loadSettings();
    await window.bookReaderAPI.startTTS(text, {
      voice: settings.voice,
      speed: parseFloat(currentSettings.speed)
    });

    // UIを更新
    document.getElementById('ttsPlayBtn').style.display = 'none';
    document.getElementById('ttsPauseBtn').style.display = 'inline-block';

    console.log('TTS started for current page');

    // 注意：TTS完了後の処理は onTTSFinished イベントハンドラーで行われます
    // ここでは waitForTTSCompletion() を呼ばず、イベント駆動で次のページに進みます

  } catch (error) {
    console.error('Error reading page:', error);
    isAutoReading = false;
    throw error;
  }
}

// 注意：この関数は現在使用されていません（イベント駆動方式に変更）
// async function waitForTTSCompletion() {
//   // TTSの完了を待つ（ポーリング方式）
//   return new Promise((resolve) => {
//     const checkInterval = setInterval(async () => {
//       try {
//         const status = await window.bookReaderAPI.getTTSStatus();
//         if (!status.isPlaying) {
//           clearInterval(checkInterval);
//           resolve();
//         }
//       } catch (error) {
//         console.error('Error checking TTS status:', error);
//         clearInterval(checkInterval);
//         resolve();
//       }
//     }, 500); // 500msごとにチェック
//   });
// }

async function moveToNextPageAndContinue() {
  // 二重実行を防止
  if (isProcessingPageTransition) {
    console.log('Page transition already in progress, skipping...');
    return;
  }

  if (!currentBook || !currentBookData) return;

  isProcessingPageTransition = true;

  try {
    const totalChapters = (currentBookData.chapters || currentBookData.pages || []).length;
    const currentChapter = currentBook.currentChapter || 0;

    if (currentChapter < totalChapters - 1) {
      // 次のページへ
      console.log(`Moving to next page: ${currentChapter} -> ${currentChapter + 1}`);
      await displayChapter(currentChapter + 1);

      // 少し待ってから次のページを読み上げ
      await new Promise(resolve => setTimeout(resolve, 500));

      if (isAutoReading) {
        await readCurrentPage();
      }
    } else {
      // 最後のページに到達
      console.log('Reached the end of the book');
      isAutoReading = false;
      document.getElementById('ttsPlayBtn').style.display = 'inline-block';
      document.getElementById('ttsPauseBtn').style.display = 'none';
      alert('本の最後まで読み上げました');
    }
  } finally {
    isProcessingPageTransition = false;
  }
}

async function pauseReading() {
  try {
    // 自動読み上げモードを停止
    isAutoReading = false;
    isProcessingPageTransition = false; // フラグをリセット

    await window.bookReaderAPI.pauseTTS();

    // UIを更新
    document.getElementById('ttsPlayBtn').style.display = 'inline-block';
    document.getElementById('ttsPauseBtn').style.display = 'none';
  } catch (error) {
    console.error('Error pausing TTS:', error);
  }
}

async function stopReading() {
  try {
    // 自動読み上げモードを停止
    isAutoReading = false;
    isProcessingPageTransition = false; // フラグをリセット

    await window.bookReaderAPI.stopTTS();

    // UIを更新
    document.getElementById('ttsPlayBtn').style.display = 'inline-block';
    document.getElementById('ttsPauseBtn').style.display = 'none';
  } catch (error) {
    console.error('Error stopping TTS:', error);
  }
}

// ===== 設定 =====

async function loadVoicesList() {
  try {
    const voices = await window.bookReaderAPI.getVoices();
    const select = document.getElementById('voiceSelect');

    // 現在の選択肢をクリア
    select.innerHTML = '';

    // プラットフォーム別に音声を分類
    const japaneseVoices = voices.filter(v =>
      v.includes('Kyoko') || v.includes('Otoya') ||
      v.includes('Haruka') || v.includes('Sayaka')
    );

    const englishVoices = voices.filter(v =>
      v.includes('Alex') || v.includes('Samantha') ||
      v.includes('David') || v.includes('Zira') || v.includes('Mark') ||
      v.includes('en-') || v === 'en'
    );

    const otherVoices = voices.filter(v =>
      !japaneseVoices.includes(v) && !englishVoices.includes(v)
    );

    // 日本語音声グループ
    if (japaneseVoices.length > 0) {
      const japGroup = document.createElement('optgroup');
      japGroup.label = '日本語音声';
      japaneseVoices.forEach(voice => {
        const option = document.createElement('option');
        option.value = voice;
        option.textContent = voice;
        japGroup.appendChild(option);
      });
      select.appendChild(japGroup);
    }

    // 英語音声グループ
    if (englishVoices.length > 0) {
      const engGroup = document.createElement('optgroup');
      engGroup.label = 'English Voices';
      englishVoices.forEach(voice => {
        const option = document.createElement('option');
        option.value = voice;
        option.textContent = voice;
        engGroup.appendChild(option);
      });
      select.appendChild(engGroup);
    }

    // その他の音声
    if (otherVoices.length > 0) {
      const otherGroup = document.createElement('optgroup');
      otherGroup.label = 'その他';
      otherVoices.slice(0, 10).forEach(voice => {
        const option = document.createElement('option');
        option.value = voice;
        option.textContent = voice;
        otherGroup.appendChild(option);
      });
      select.appendChild(otherGroup);
    }

  } catch (error) {
    console.error('Error loading voices:', error);
  }
}

function loadSettings() {
  const settings = {
    voice: localStorage.getItem('tts_voice') || '', // プラットフォームに応じた最初の音声を使用
    speed: localStorage.getItem('tts_speed') || '2.0',
    autoNext: localStorage.getItem('auto_next') === 'true',
    theme: localStorage.getItem('theme') || 'dark',
    translateToJapanese: localStorage.getItem('translate_to_japanese') === 'true'
  };

  // UIに反映
  const voiceSelect = document.getElementById('voiceSelect');
  if (settings.voice && voiceSelect.querySelector(`option[value="${settings.voice}"]`)) {
    voiceSelect.value = settings.voice;
  } else if (voiceSelect.options.length > 0) {
    // 保存された音声がない場合は最初の音声を選択
    voiceSelect.selectedIndex = 0;
  }

  document.getElementById('speedSlider').value = settings.speed;
  document.getElementById('speedValue').textContent = settings.speed;
  document.getElementById('autoNextChapter').checked = settings.autoNext;
  document.getElementById('themeSelect').value = settings.theme;
  document.getElementById('translateToJapanese').checked = settings.translateToJapanese;
  document.getElementById('currentSpeed').textContent = `${settings.speed}x`;

  // グローバル設定に保存
  currentSettings.translateToJapanese = settings.translateToJapanese;

  return settings;
}

function saveSettings() {
  const voice = document.getElementById('voiceSelect').value;
  const speed = document.getElementById('speedSlider').value;
  const autoNext = document.getElementById('autoNextChapter').checked;
  const theme = document.getElementById('themeSelect').value;
  const translateToJapanese = document.getElementById('translateToJapanese').checked;

  localStorage.setItem('tts_voice', voice);
  localStorage.setItem('tts_speed', speed);
  localStorage.setItem('auto_next', autoNext.toString());
  localStorage.setItem('theme', theme);
  localStorage.setItem('translate_to_japanese', translateToJapanese.toString());

  // 読み上げ速度表示を更新
  document.getElementById('currentSpeed').textContent = `${speed}x`;

  // グローバル設定に保存
  currentSettings.translateToJapanese = translateToJapanese;

  console.log('Settings saved');
}

async function testVoice() {
  const voice = document.getElementById('voiceSelect').value;
  const speed = parseFloat(document.getElementById('speedSlider').value);

  const testText = '音声のテストです。これは技術書リーダーの読み上げ機能です。';

  try {
    await window.bookReaderAPI.startTTS(testText, { voice, speed });
  } catch (error) {
    console.error('Error testing voice:', error);
    alert('音声テストに失敗しました: ' + error.message);
  }
}

async function updateLibraryStats() {
  const library = await window.bookReaderAPI.getLibrary();
  const books = library.books || [];

  const totalBooks = books.length;
  const epubBooks = books.filter(b => b.type === 'epub').length;
  const pdfBooks = books.filter(b => b.type === 'pdf').length;
  const completedBooks = books.filter(b => b.progress >= 100).length;
  const favoriteBooks = books.filter(b => b.favorite).length;

  const statsContainer = document.getElementById('libraryStats');
  statsContainer.innerHTML = `
    <div class="stat-card">
      <div class="stat-card-value">${totalBooks}</div>
      <div class="stat-card-label">総数</div>
    </div>
    <div class="stat-card">
      <div class="stat-card-value">${epubBooks}</div>
      <div class="stat-card-label">EPUB</div>
    </div>
    <div class="stat-card">
      <div class="stat-card-value">${pdfBooks}</div>
      <div class="stat-card-label">PDF</div>
    </div>
    <div class="stat-card">
      <div class="stat-card-value">${completedBooks}</div>
      <div class="stat-card-label">読了</div>
    </div>
    <div class="stat-card">
      <div class="stat-card-value">${favoriteBooks}</div>
      <div class="stat-card-label">お気に入り</div>
    </div>
  `;
}

// 翻訳済みの本をダウンロード
async function downloadTranslatedBook() {
  if (!currentBook || !currentBookData) {
    alert('本が開かれていません');
    return;
  }

  const filePath = currentBook.filePath;
  const translatedText = translatedBookCache[filePath];

  if (!translatedText) {
    alert('翻訳がまだ完了していません。翻訳を有効にして完了するまでお待ちください。');
    return;
  }

  try {
    // 翻訳済みテキストをHTML形式で結合
    const chapters = currentBookData.chapters || currentBookData.pages || [];
    let htmlContent = '';

    // ヘッダー情報
    htmlContent += `<h1>${currentBook.title}</h1>\n`;
    htmlContent += `<div class="metadata">\n`;
    htmlContent += `<p>著者: ${currentBook.authors ? currentBook.authors.join(', ') : currentBook.author || 'Unknown'}</p>\n`;
    htmlContent += `<p>翻訳日: ${new Date().toLocaleDateString('ja-JP')}</p>\n`;
    htmlContent += `</div>\n`;
    htmlContent += `<div class="separator"></div>\n`;

    // 各章を追加
    for (let i = 0; i < chapters.length; i++) {
      const chapter = chapters[i];
      const chapterTitle = chapter.title || chapter.label || `ページ ${i + 1}`;
      const translatedContent = translatedText[i] || '';

      if (translatedContent) {
        htmlContent += `<h2>${chapterTitle}</h2>\n`;

        // テキストを段落に分割
        const paragraphs = translatedContent.split('\n').filter(p => p.trim());
        paragraphs.forEach(para => {
          htmlContent += `<p>${para.trim()}</p>\n`;
        });

        if (i < chapters.length - 1) {
          htmlContent += `<div class="separator"></div>\n`;
        }
      }
    }

    // ファイル名を生成
    const sanitizedTitle = currentBook.title.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '_');
    const defaultFileName = `${sanitizedTitle}_翻訳版.pdf`;

    // メインプロセスにPDF保存を依頼
    const result = await window.bookReaderAPI.saveTranslatedPDF(htmlContent, defaultFileName);

    if (result.success) {
      alert(result.message);
    } else if (result.canceled) {
      // キャンセルされた場合は何もしない
      console.log('Save dialog was canceled');
    } else {
      throw new Error(result.error || '保存に失敗しました');
    }

  } catch (error) {
    console.error('Error downloading translated book:', error);
    alert('ダウンロード中にエラーが発生しました: ' + error.message);
  }
}

// アプリケーションを初期化
document.addEventListener('DOMContentLoaded', initApp);
