/**
 * 翻訳サービス
 * 英語テキストを日本語に翻訳
 */

class TranslatorService {
  constructor() {
    this.cache = new Map(); // 翻訳キャッシュ
  }

  /**
   * Google Translate APIを使用して翻訳（無料版）
   * @param {string} text - 翻訳するテキスト
   * @param {string} sourceLang - ソース言語（デフォルト: 'en'）
   * @param {string} targetLang - ターゲット言語（デフォルト: 'ja'）
   */
  async translateWithGoogle(text, sourceLang = 'en', targetLang = 'ja') {
    try {
      // キャッシュをチェック
      const cacheKey = `${sourceLang}-${targetLang}-${text}`;
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }

      // Google Translate の無料API（非公式）を使用
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;

      const response = await fetch(url);
      const data = await response.json();

      // レスポンスから翻訳テキストを抽出
      let translatedText = '';
      if (data && data[0]) {
        for (const item of data[0]) {
          if (item[0]) {
            translatedText += item[0];
          }
        }
      }

      // キャッシュに保存
      this.cache.set(cacheKey, translatedText);

      return translatedText;
    } catch (error) {
      console.error('Translation error:', error);
      throw new Error('翻訳に失敗しました: ' + error.message);
    }
  }

  /**
   * テキストをチャンクに分割して翻訳（高速並列版）
   * @param {string} text - 翻訳するテキスト
   * @param {number} chunkSize - チャンクサイズ（文字数）
   */
  async translateLongText(text, chunkSize = 1000) {
    try {
      // 短いテキストはそのまま翻訳
      if (text.length <= chunkSize) {
        return await this.translateWithGoogle(text);
      }

      // テキストを文ごとに分割
      const sentences = text.match(/[^.!?。！？]+[.!?。！？]+/g) || [text];
      const chunks = [];
      let currentChunk = '';

      for (const sentence of sentences) {
        if ((currentChunk + sentence).length > chunkSize && currentChunk.length > 0) {
          chunks.push(currentChunk);
          currentChunk = sentence;
        } else {
          currentChunk += sentence;
        }
      }

      if (currentChunk) {
        chunks.push(currentChunk);
      }

      // 各チャンクを並列翻訳（待機時間なし、高速化）
      const translationPromises = chunks.map((chunk, index) => {
        return this.translateWithGoogle(chunk).catch(error => {
          console.error(`Error translating chunk ${index + 1}:`, error);
          return chunk; // エラー時は元のテキストを返す
        });
      });

      const translatedChunks = await Promise.all(translationPromises);
      return translatedChunks.join(' ');
    } catch (error) {
      console.error('Long text translation error:', error);
      throw error;
    }
  }

  /**
   * 言語を検出
   * @param {string} text - 検出するテキスト
   */
  async detectLanguage(text) {
    try {
      // 簡易的な言語検出（ASCII文字の割合で判定）
      const asciiCount = (text.match(/[a-zA-Z]/g) || []).length;
      const totalChars = text.replace(/\s/g, '').length;
      const asciiRatio = asciiCount / totalChars;

      // ASCII文字が50%以上なら英語と判定
      if (asciiRatio > 0.5) {
        return 'en';
      } else {
        return 'ja';
      }
    } catch (error) {
      console.error('Language detection error:', error);
      return 'en'; // デフォルトは英語
    }
  }

  /**
   * 必要に応じて翻訳
   * @param {string} text - テキスト
   * @param {boolean} forceTranslate - 強制的に翻訳
   */
  async translateIfNeeded(text, forceTranslate = false) {
    try {
      if (forceTranslate) {
        return await this.translateLongText(text);
      }

      const lang = await this.detectLanguage(text);

      if (lang === 'en') {
        return await this.translateLongText(text);
      } else {
        return text; // すでに日本語
      }
    } catch (error) {
      console.error('Translation if needed error:', error);
      return text; // エラー時は元のテキストを返す
    }
  }

  /**
   * キャッシュをクリア
   */
  clearCache() {
    this.cache.clear();
  }
}

// ブラウザ環境でも使えるようにする
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TranslatorService;
}
