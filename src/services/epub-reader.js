/**
 * EPUBリーダーサービス
 * EPUBファイルからテキストを抽出し、章ごとに読み上げ可能にする
 */

const EPub = require('epub2');
const { promisify } = require('util');

class EPUBReaderService {
  constructor() {
    this.currentBook = null;
    this.chapters = [];
    this.metadata = {};
  }

  /**
   * EPUBファイルを開く
   */
  async openBook(filePath) {
    try {
      return new Promise((resolve, reject) => {
        const epub = new EPub(filePath);

        epub.on('end', async () => {
          this.currentBook = epub;

          // メタデータを取得
          this.metadata = {
            title: epub.metadata.title || 'Unknown Title',
            creator: epub.metadata.creator || 'Unknown Author',
            publisher: epub.metadata.publisher || 'Unknown',
            language: epub.metadata.language || 'en',
            description: epub.metadata.description || '',
            cover: epub.metadata.cover || null,
            isbn: epub.metadata.ISBN || ''
          };

          // 章のリストを取得
          await this.loadChapters();

          resolve({
            success: true,
            metadata: this.metadata,
            chapters: this.chapters.map(ch => ({
              id: ch.id,
              title: ch.title,
              order: ch.order
            }))
          });
        });

        epub.on('error', (error) => {
          reject(error);
        });

        epub.parse();
      });
    } catch (error) {
      console.error('Error opening EPUB:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 章のリストを読み込み
   */
  async loadChapters() {
    if (!this.currentBook) {
      throw new Error('No book opened');
    }

    this.chapters = [];

    // TOC（目次）から章を取得
    const toc = this.currentBook.toc || [];

    if (toc.length > 0) {
      // TOCがある場合
      for (let i = 0; i < toc.length; i++) {
        const item = toc[i];
        this.chapters.push({
          id: item.id,
          title: item.title,
          href: item.href,
          order: item.order || i,
          level: item.level || 0
        });
      }
    } else {
      // TOCがない場合は spine（読み順）から取得
      const flow = this.currentBook.flow || [];
      for (let i = 0; i < flow.length; i++) {
        const item = flow[i];
        this.chapters.push({
          id: item.id,
          title: item.title || `Chapter ${i + 1}`,
          href: item.href,
          order: i,
          level: 0
        });
      }
    }

    // 順序でソート
    this.chapters.sort((a, b) => a.order - b.order);
  }

  /**
   * 指定された章のテキストを取得
   */
  async getChapterText(chapterId) {
    if (!this.currentBook) {
      throw new Error('No book opened');
    }

    return new Promise((resolve, reject) => {
      this.currentBook.getChapter(chapterId, (error, text) => {
        if (error) {
          reject(error);
          return;
        }

        // HTMLタグを除去してプレーンテキストに変換
        const plainText = this.stripHTML(text);

        resolve({
          success: true,
          text: plainText,
          html: text
        });
      });
    });
  }

  /**
   * すべての章のテキストを取得
   */
  async getAllChaptersText() {
    const results = [];

    for (const chapter of this.chapters) {
      try {
        const result = await this.getChapterText(chapter.id);
        results.push({
          chapter: chapter.title,
          order: chapter.order,
          text: result.text
        });
      } catch (error) {
        console.error(`Error getting chapter ${chapter.title}:`, error);
        results.push({
          chapter: chapter.title,
          order: chapter.order,
          text: '',
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * HTMLタグを除去してプレーンテキストに変換
   */
  stripHTML(html) {
    // HTMLタグを除去
    let text = html.replace(/<[^>]*>/g, ' ');

    // HTMLエンティティをデコード
    text = this.decodeHTMLEntities(text);

    // 複数の空白を1つに
    text = text.replace(/\s+/g, ' ');

    // 前後の空白を削除
    text = text.trim();

    return text;
  }

  /**
   * HTMLエンティティをデコード
   */
  decodeHTMLEntities(text) {
    const entities = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
      '&nbsp;': ' ',
      '&mdash;': '-',
      '&ndash;': '-',
      '&ldquo;': '"',
      '&rdquo;': '"',
      '&lsquo;': "'",
      '&rsquo;': "'"
    };

    return text.replace(/&[a-z]+;|&#\d+;/gi, (match) => {
      return entities[match] || match;
    });
  }

  /**
   * カバー画像を取得
   */
  async getCoverImage() {
    if (!this.currentBook || !this.metadata.cover) {
      return null;
    }

    return new Promise((resolve, reject) => {
      this.currentBook.getImage(this.metadata.cover, (error, data, mimeType) => {
        if (error) {
          reject(error);
          return;
        }

        // Base64エンコード
        const base64 = Buffer.from(data).toString('base64');
        const dataUrl = `data:${mimeType};base64,${base64}`;

        resolve(dataUrl);
      });
    });
  }

  /**
   * 本を閉じる
   */
  closeBook() {
    this.currentBook = null;
    this.chapters = [];
    this.metadata = {};
  }

  /**
   * メタデータを取得
   */
  getMetadata() {
    return this.metadata;
  }

  /**
   * 章のリストを取得
   */
  getChapters() {
    return this.chapters;
  }

  /**
   * 次の章を取得
   */
  getNextChapter(currentChapterId) {
    const currentIndex = this.chapters.findIndex(ch => ch.id === currentChapterId);
    if (currentIndex === -1 || currentIndex === this.chapters.length - 1) {
      return null;
    }
    return this.chapters[currentIndex + 1];
  }

  /**
   * 前の章を取得
   */
  getPreviousChapter(currentChapterId) {
    const currentIndex = this.chapters.findIndex(ch => ch.id === currentChapterId);
    if (currentIndex === -1 || currentIndex === 0) {
      return null;
    }
    return this.chapters[currentIndex - 1];
  }
}

module.exports = EPUBReaderService;
