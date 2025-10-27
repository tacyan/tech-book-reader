/**
 * ライブラリ管理サービス
 * 本のコレクション、お気に入り、読書進捗を管理
 */

const fs = require('fs').promises;
const path = require('path');

class LibraryManager {
  constructor(libraryPath) {
    this.libraryPath = libraryPath;
    this.books = [];
    this.currentBook = null;
  }

  /**
   * ライブラリを初期化（ファイルから読み込み）
   */
  async load() {
    try {
      const data = await fs.readFile(this.libraryPath, 'utf-8');
      const libraryData = JSON.parse(data);
      this.books = libraryData.books || [];
    } catch (error) {
      // ファイルが存在しない場合は空の配列
      if (error.code === 'ENOENT') {
        this.books = [];
      } else {
        throw error;
      }
    }
  }

  /**
   * ライブラリをファイルに保存
   */
  async save() {
    const data = {
      books: this.books,
      lastModified: new Date().toISOString()
    };
    await fs.writeFile(this.libraryPath, JSON.stringify(data, null, 2));
  }

  /**
   * 本を追加
   */
  async addBook(bookInfo) {
    // authorsが配列の場合とauthorが文字列の場合の両方に対応
    let authorValue = 'Unknown Author';
    let authorsArray = ['Unknown Author'];

    if (bookInfo.authors && Array.isArray(bookInfo.authors)) {
      authorsArray = bookInfo.authors;
      authorValue = bookInfo.authors.join(', ');
    } else if (bookInfo.author) {
      authorValue = bookInfo.author;
      authorsArray = [bookInfo.author];
    }

    const newBook = {
      id: this.generateId(),
      filePath: bookInfo.filePath,
      fileName: bookInfo.fileName,
      type: bookInfo.type, // 'epub' or 'pdf'
      title: bookInfo.title || bookInfo.fileName,
      author: authorValue, // 文字列形式（後方互換性のため）
      authors: authorsArray, // 配列形式（UIで使用）
      publisher: bookInfo.publisher || '',
      addedDate: new Date().toISOString(),
      lastReadDate: null,
      progress: 0, // 0-100%
      currentChapter: null,
      currentPage: null,
      bookmark: [],
      favorite: false,
      notes: [],
      metadata: bookInfo.metadata || {},
      isFree: bookInfo.isFree !== undefined ? bookInfo.isFree : true, // デフォルトは無料として扱う
      pdfAvailable: bookInfo.pdfAvailable || false,
      epubAvailable: bookInfo.epubAvailable || false,
      downloadLink: bookInfo.downloadLink || null,
      thumbnail: bookInfo.thumbnail || null // サムネイルも保存
    };

    this.books.push(newBook);
    await this.save();

    return newBook;
  }

  /**
   * 本を削除
   */
  async removeBook(bookId) {
    const index = this.books.findIndex(b => b.id === bookId);

    if (index !== -1) {
      this.books.splice(index, 1);
      await this.save();
      return true;
    }

    return false;
  }

  /**
   * 本を取得
   */
  getBook(bookId) {
    return this.books.find(b => b.id === bookId);
  }

  /**
   * すべての本を取得
   */
  getAllBooks() {
    return this.books;
  }

  /**
   * ライブラリ全体を取得（フロントエンド用）
   */
  getLibrary() {
    return {
      books: this.books,
      lastModified: new Date().toISOString()
    };
  }

  /**
   * お気に入りの本を取得
   */
  getFavoriteBooks() {
    return this.books.filter(b => b.favorite);
  }

  /**
   * 最近読んだ本を取得
   */
  getRecentBooks(limit = 10) {
    return [...this.books]
      .filter(b => b.lastReadDate)
      .sort((a, b) => new Date(b.lastReadDate) - new Date(a.lastReadDate))
      .slice(0, limit);
  }

  /**
   * 読書中の本を取得
   */
  getCurrentlyReading() {
    return this.books.filter(b => b.progress > 0 && b.progress < 100);
  }

  /**
   * 本の進捗を更新
   */
  async updateProgress(bookId, progress, currentPosition) {
    const book = this.getBook(bookId);

    if (book) {
      book.progress = Math.min(100, Math.max(0, progress));
      book.lastReadDate = new Date().toISOString();

      if (currentPosition.chapter) {
        book.currentChapter = currentPosition.chapter;
      }

      if (currentPosition.page) {
        book.currentPage = currentPosition.page;
      }

      await this.save();
      return true;
    }

    return false;
  }

  /**
   * お気に入りをトグル
   */
  async toggleFavorite(bookId) {
    const book = this.getBook(bookId);

    if (book) {
      book.favorite = !book.favorite;
      await this.save();
      return book.favorite;
    }

    return false;
  }

  /**
   * しおりを追加
   */
  async addBookmark(bookId, position, note = '') {
    const book = this.getBook(bookId);

    if (book) {
      const bookmark = {
        id: this.generateId(),
        position,
        note,
        createdDate: new Date().toISOString()
      };

      book.bookmark.push(bookmark);
      await this.save();
      return bookmark;
    }

    return null;
  }

  /**
   * しおりを削除
   */
  async removeBookmark(bookId, bookmarkId) {
    const book = this.getBook(bookId);

    if (book) {
      const index = book.bookmark.findIndex(b => b.id === bookmarkId);

      if (index !== -1) {
        book.bookmark.splice(index, 1);
        await this.save();
        return true;
      }
    }

    return false;
  }

  /**
   * メモを追加
   */
  async addNote(bookId, content, position) {
    const book = this.getBook(bookId);

    if (book) {
      const note = {
        id: this.generateId(),
        content,
        position,
        createdDate: new Date().toISOString()
      };

      book.notes.push(note);
      await this.save();
      return note;
    }

    return null;
  }

  /**
   * メモを削除
   */
  async removeNote(bookId, noteId) {
    const book = this.getBook(bookId);

    if (book) {
      const index = book.notes.findIndex(n => n.id === noteId);

      if (index !== -1) {
        book.notes.splice(index, 1);
        await this.save();
        return true;
      }
    }

    return false;
  }

  /**
   * 検索
   */
  searchBooks(query) {
    const lowerQuery = query.toLowerCase();

    return this.books.filter(book => {
      return (
        book.title.toLowerCase().includes(lowerQuery) ||
        book.author.toLowerCase().includes(lowerQuery) ||
        book.fileName.toLowerCase().includes(lowerQuery)
      );
    });
  }

  /**
   * タイプでフィルタ
   */
  filterByType(type) {
    return this.books.filter(b => b.type === type);
  }

  /**
   * 無料の本のみを取得
   */
  getFreeBooks() {
    return this.books.filter(b => b.isFree === true);
  }

  /**
   * 本が無料かどうかを確認
   */
  isBookFree(bookId) {
    const book = this.getBook(bookId);
    return book ? book.isFree === true : false;
  }

  /**
   * ソート
   */
  sortBooks(by = 'addedDate', order = 'desc') {
    return [...this.books].sort((a, b) => {
      let aVal = a[by];
      let bVal = b[by];

      if (by === 'addedDate' || by === 'lastReadDate') {
        aVal = aVal ? new Date(aVal) : new Date(0);
        bVal = bVal ? new Date(bVal) : new Date(0);
      }

      if (order === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
  }

  /**
   * 統計情報を取得
   */
  getStatistics() {
    return {
      totalBooks: this.books.length,
      epubBooks: this.filterByType('epub').length,
      pdfBooks: this.filterByType('pdf').length,
      favoriteBooks: this.getFavoriteBooks().length,
      currentlyReading: this.getCurrentlyReading().length,
      completedBooks: this.books.filter(b => b.progress === 100).length,
      totalBookmarks: this.books.reduce((sum, b) => sum + b.bookmark.length, 0),
      totalNotes: this.books.reduce((sum, b) => sum + b.notes.length, 0)
    };
  }


  /**
   * IDを生成
   */
  generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 現在開いている本を設定
   */
  setCurrentBook(bookId) {
    this.currentBook = this.getBook(bookId);
    return this.currentBook;
  }

  /**
   * 現在開いている本を取得
   */
  getCurrentBook() {
    return this.currentBook;
  }
}

// ブラウザ環境でも使えるようにする
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LibraryManager;
}
