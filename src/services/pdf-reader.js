/**
 * PDFリーダーサービス
 * PDFファイルからテキストを抽出
 */

const pdfParse = require('pdf-parse');
const fs = require('fs').promises;

class PDFReaderService {
  constructor() {
    this.currentBook = null;
    this.pages = [];
    this.metadata = {};
  }

  /**
   * PDFファイルを開く
   */
  async openBook(filePath) {
    try {
      const dataBuffer = await fs.readFile(filePath);
      const data = await pdfParse(dataBuffer);

      this.currentBook = data;

      // メタデータを取得
      this.metadata = {
        title: data.info?.Title || 'Unknown Title',
        creator: data.info?.Author || 'Unknown Author',
        publisher: data.info?.Producer || 'Unknown',
        language: 'en',
        description: '',
        creationDate: data.info?.CreationDate || '',
        pageCount: data.numpages
      };

      // ページごとにテキストを分割
      await this.loadPages(data);

      return {
        success: true,
        metadata: this.metadata,
        pages: this.pages.map((p, i) => ({
          pageNumber: i + 1,
          textLength: p.text.length
        }))
      };
    } catch (error) {
      console.error('Error opening PDF:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ページを読み込み
   */
  async loadPages(data) {
    this.pages = [];

    // PDFのテキスト全体
    const fullText = data.text;

    // ページ数で分割（概算）
    const pageCount = data.numpages;
    const avgCharsPerPage = Math.ceil(fullText.length / pageCount);

    // 簡易的にページ分割
    for (let i = 0; i < pageCount; i++) {
      const start = i * avgCharsPerPage;
      const end = Math.min((i + 1) * avgCharsPerPage, fullText.length);
      const pageText = fullText.substring(start, end);

      this.pages.push({
        pageNumber: i + 1,
        text: pageText.trim()
      });
    }
  }

  /**
   * 指定されたページのテキストを取得
   */
  async getPageText(pageNumber) {
    if (!this.currentBook) {
      throw new Error('No book opened');
    }

    if (pageNumber < 1 || pageNumber > this.pages.length) {
      throw new Error('Invalid page number');
    }

    const page = this.pages[pageNumber - 1];

    return {
      success: true,
      text: page.text,
      pageNumber: page.pageNumber
    };
  }

  /**
   * すべてのページのテキストを取得
   */
  async getAllPagesText() {
    return this.pages.map(page => ({
      pageNumber: page.pageNumber,
      text: page.text
    }));
  }

  /**
   * 範囲指定でページを取得
   */
  async getPageRange(startPage, endPage) {
    if (!this.currentBook) {
      throw new Error('No book opened');
    }

    const start = Math.max(1, startPage);
    const end = Math.min(this.pages.length, endPage);

    const results = [];

    for (let i = start; i <= end; i++) {
      const page = this.pages[i - 1];
      results.push({
        pageNumber: page.pageNumber,
        text: page.text
      });
    }

    return results;
  }

  /**
   * テキスト全体を取得
   */
  async getFullText() {
    if (!this.currentBook) {
      throw new Error('No book opened');
    }

    return this.currentBook.text;
  }

  /**
   * 本を閉じる
   */
  closeBook() {
    this.currentBook = null;
    this.pages = [];
    this.metadata = {};
  }

  /**
   * メタデータを取得
   */
  getMetadata() {
    return this.metadata;
  }

  /**
   * ページ数を取得
   */
  getPageCount() {
    return this.pages.length;
  }

  /**
   * 次のページを取得
   */
  getNextPage(currentPage) {
    if (currentPage >= this.pages.length) {
      return null;
    }
    return currentPage + 1;
  }

  /**
   * 前のページを取得
   */
  getPreviousPage(currentPage) {
    if (currentPage <= 1) {
      return null;
    }
    return currentPage - 1;
  }
}

module.exports = PDFReaderService;
