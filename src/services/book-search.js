/**
 * 本の検索サービス
 * Google Books API、Open Library APIなどを使用して技術書を検索
 */

class BookSearchService {
  constructor() {
    this.googleBooksAPI = 'https://www.googleapis.com/books/v1/volumes';
    this.openLibraryAPI = 'https://openlibrary.org/search.json';
  }

  /**
   * Google Books APIで検索
   */
  async searchGoogleBooks(query, options = {}) {
    try {
      const {
        maxResults = 20,
        startIndex = 0,
        subject = 'computers', // 技術書に絞る
        freeOnly = true // デフォルトで無料の本のみ
      } = options;

      const params = new URLSearchParams({
        q: `${query}+subject:${subject}`,
        maxResults,
        startIndex,
        printType: 'books',
        orderBy: 'relevance'
      });

      const response = await fetch(`${this.googleBooksAPI}?${params}`);
      const data = await response.json();

      if (!data.items) {
        return { success: true, books: [], totalItems: 0 };
      }

      let books = data.items.map(item => this.parseGoogleBookItem(item));

      // 無料の本のみフィルタリング
      if (freeOnly) {
        books = books.filter(book => book.isFree === true);
      }

      return {
        success: true,
        books,
        totalItems: books.length
      };
    } catch (error) {
      console.error('Google Books API error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Open Library APIで検索
   */
  async searchOpenLibrary(query, options = {}) {
    try {
      const { limit = 20, offset = 0, freeOnly = true } = options;

      const params = new URLSearchParams({
        q: query,
        limit,
        offset,
        fields: 'title,author_name,first_publish_year,isbn,cover_i,publisher,subject,has_fulltext,public_scan_b,ia'
      });

      const response = await fetch(`${this.openLibraryAPI}?${params}`);
      const data = await response.json();

      if (!data.docs || data.docs.length === 0) {
        return { success: true, books: [], totalItems: 0 };
      }

      let books = data.docs.map(doc => this.parseOpenLibraryItem(doc));

      // 無料の本のみフィルタリング
      if (freeOnly) {
        books = books.filter(book => book.isFree === true);
      }

      return {
        success: true,
        books,
        totalItems: books.length
      };
    } catch (error) {
      console.error('Open Library API error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 複数のソースから検索（統合検索）
   */
  async searchAll(query, options = {}) {
    try {
      const [googleResult, openLibraryResult] = await Promise.all([
        this.searchGoogleBooks(query, options),
        this.searchOpenLibrary(query, options)
      ]);

      const allBooks = [];

      if (googleResult.success) {
        allBooks.push(...googleResult.books.map(b => ({ ...b, source: 'Google Books' })));
      }

      if (openLibraryResult.success) {
        allBooks.push(...openLibraryResult.books.map(b => ({ ...b, source: 'Open Library' })));
      }

      // 重複を除去（ISBNベース）
      const uniqueBooks = this.removeDuplicates(allBooks);

      // 技術書を優先してソート
      const sortedBooks = this.prioritizeTechBooks(uniqueBooks);

      return {
        success: true,
        books: sortedBooks,
        totalItems: sortedBooks.length
      };
    } catch (error) {
      console.error('Search all error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Google Booksのアイテムをパース
   */
  parseGoogleBookItem(item) {
    const volumeInfo = item.volumeInfo || {};
    const saleInfo = item.saleInfo || {};
    const accessInfo = item.accessInfo || {};

    // 無料かどうかを判定
    const isFree = saleInfo.saleability === 'FREE' ||
                   saleInfo.saleability === 'NOT_FOR_SALE' ||
                   accessInfo.accessViewStatus === 'FULL_PUBLIC_DOMAIN' ||
                   (accessInfo.pdf && accessInfo.pdf.isAvailable && !saleInfo.listPrice) ||
                   (accessInfo.epub && accessInfo.epub.isAvailable && !saleInfo.listPrice);

    return {
      id: item.id,
      title: volumeInfo.title || 'Unknown Title',
      authors: volumeInfo.authors || ['Unknown Author'],
      publisher: volumeInfo.publisher || 'Unknown',
      publishedDate: volumeInfo.publishedDate || '',
      description: volumeInfo.description || '',
      isbn: this.extractISBN(volumeInfo.industryIdentifiers),
      pageCount: volumeInfo.pageCount || 0,
      categories: volumeInfo.categories || [],
      thumbnail: volumeInfo.imageLinks?.thumbnail || volumeInfo.imageLinks?.smallThumbnail || null,
      previewLink: volumeInfo.previewLink || '',
      infoLink: volumeInfo.infoLink || '',
      buyLink: saleInfo.buyLink || '',
      price: saleInfo.listPrice ? `${saleInfo.listPrice.amount} ${saleInfo.listPrice.currencyCode}` : 'N/A',
      rating: volumeInfo.averageRating || 0,
      ratingsCount: volumeInfo.ratingsCount || 0,
      isFree: isFree,
      pdfAvailable: accessInfo.pdf?.isAvailable || false,
      epubAvailable: accessInfo.epub?.isAvailable || false,
      downloadLink: isFree && accessInfo.pdf?.downloadLink ? accessInfo.pdf.downloadLink : null
    };
  }

  /**
   * Open Libraryのアイテムをパース
   */
  parseOpenLibraryItem(doc) {
    // Open Libraryはパブリックドメインや無料の本が多いが、
    // 明確な判定が難しいため、ダウンロード可能かどうかで判定
    const isFree = doc.has_fulltext === true || doc.public_scan_b === true;

    // Internet ArchiveのID（ia）がある場合、ダウンロードリンクを生成
    let downloadLink = null;
    if (isFree && doc.ia) {
      // Internet ArchiveからPDFをダウンロードするリンク
      // iaは配列の場合があるので最初の要素を取得
      const iaId = Array.isArray(doc.ia) ? doc.ia[0] : doc.ia;
      downloadLink = `https://archive.org/download/${iaId}/${iaId}.pdf`;
    }

    return {
      id: doc.key || '',
      title: doc.title || 'Unknown Title',
      authors: doc.author_name || ['Unknown Author'],
      publisher: doc.publisher ? doc.publisher[0] : 'Unknown',
      publishedDate: doc.first_publish_year ? doc.first_publish_year.toString() : '',
      description: '',
      isbn: doc.isbn ? doc.isbn[0] : '',
      pageCount: 0,
      categories: doc.subject ? doc.subject.slice(0, 5) : [],
      thumbnail: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null,
      previewLink: `https://openlibrary.org${doc.key}`,
      infoLink: `https://openlibrary.org${doc.key}`,
      buyLink: '',
      price: 'N/A',
      rating: 0,
      ratingsCount: 0,
      isFree: isFree,
      pdfAvailable: isFree && downloadLink !== null,
      epubAvailable: false,
      downloadLink: downloadLink,
      iaId: doc.ia ? (Array.isArray(doc.ia) ? doc.ia[0] : doc.ia) : null // Internet Archive ID
    };
  }

  /**
   * ISBNを抽出
   */
  extractISBN(identifiers) {
    if (!identifiers) return '';

    const isbn13 = identifiers.find(id => id.type === 'ISBN_13');
    if (isbn13) return isbn13.identifier;

    const isbn10 = identifiers.find(id => id.type === 'ISBN_10');
    if (isbn10) return isbn10.identifier;

    return '';
  }

  /**
   * 重複を除去
   */
  removeDuplicates(books) {
    const seen = new Set();
    return books.filter(book => {
      // ISBNがあればそれで判定、なければタイトル+著者で判定
      const key = book.isbn || `${book.title}-${book.authors[0]}`;

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  }

  /**
   * 技術書を優先してソート
   */
  prioritizeTechBooks(books) {
    const techKeywords = [
      'programming', 'software', 'computer', 'algorithm', 'data',
      'web', 'javascript', 'python', 'java', 'development',
      'engineering', 'machine learning', 'ai', 'devops', 'cloud'
    ];

    return books.sort((a, b) => {
      const aIsTech = this.isTechBook(a, techKeywords);
      const bIsTech = this.isTechBook(b, techKeywords);

      if (aIsTech && !bIsTech) return -1;
      if (!aIsTech && bIsTech) return 1;

      // レーティングでソート
      return (b.rating * b.ratingsCount) - (a.rating * a.ratingsCount);
    });
  }

  /**
   * 技術書かどうかを判定
   */
  isTechBook(book, keywords) {
    const searchText = `${book.title} ${book.categories.join(' ')} ${book.description}`.toLowerCase();

    return keywords.some(keyword => searchText.includes(keyword.toLowerCase()));
  }

  /**
   * O'Reilly、Manning、Packtなどの出版社の本を検索
   */
  async searchByPublisher(publisher, query = '') {
    const fullQuery = `${query} publisher:"${publisher}"`;
    return this.searchGoogleBooks(fullQuery);
  }

  /**
   * 人気の技術書トピックを取得
   */
  getPopularTopics() {
    return [
      { name: 'JavaScript', query: 'javascript programming' },
      { name: 'Python', query: 'python programming' },
      { name: 'Web Development', query: 'web development' },
      { name: 'Machine Learning', query: 'machine learning' },
      { name: 'Data Science', query: 'data science' },
      { name: 'DevOps', query: 'devops' },
      { name: 'Cloud Computing', query: 'cloud computing' },
      { name: 'Algorithms', query: 'algorithms data structures' },
      { name: 'React', query: 'react programming' },
      { name: 'Node.js', query: 'nodejs programming' },
      { name: 'Docker', query: 'docker containers' },
      { name: 'Kubernetes', query: 'kubernetes' }
    ];
  }

  /**
   * 有名な技術書出版社のリスト
   */
  getPublishers() {
    return [
      { name: "O'Reilly Media", query: "O'Reilly" },
      { name: 'Manning Publications', query: 'Manning' },
      { name: 'Packt Publishing', query: 'Packt' },
      { name: 'Apress', query: 'Apress' },
      { name: 'Pragmatic Bookshelf', query: 'Pragmatic' },
      { name: 'No Starch Press', query: 'No Starch' }
    ];
  }

  /**
   * 無料でダウンロード可能なPDFカタログ
   * 合法的にダウンロード可能な技術書のキュレートされたリスト
   */
  getFreePdfCatalog() {
    return [
      // Git
      {
        id: 'progit',
        title: 'Pro Git',
        authors: ['Scott Chacon', 'Ben Straub'],
        publisher: 'Apress',
        publishedDate: '2024',
        description: 'Gitの完全ガイド。バージョン管理の基礎から高度な使い方まで網羅。',
        categories: ['Git', 'Version Control', 'Programming'],
        thumbnail: 'https://git-scm.com/images/progit2.png',
        downloadLink: 'https://github.com/progit/progit2/releases/download/2.1.362/progit.pdf',
        pageCount: 574,
        keywords: ['git', 'version control', 'バージョン管理', 'github']
      },
      // Python
      {
        id: 'thinkpython',
        title: 'Think Python (2nd Edition)',
        authors: ['Allen B. Downey'],
        publisher: 'Green Tea Press',
        publishedDate: '2015',
        description: 'Pythonプログラミングの基礎から応用まで学べる入門書。',
        categories: ['Python', 'Programming'],
        thumbnail: 'https://greenteapress.com/thinkpython2/think_python2_medium.jpg',
        downloadLink: 'https://greenteapress.com/thinkpython2/thinkpython2.pdf',
        pageCount: 292,
        keywords: ['python', 'programming', 'パイソン', 'プログラミング']
      },
      {
        id: 'python-data-science',
        title: 'Python Data Science Handbook',
        authors: ['Jake VanderPlas'],
        publisher: "O'Reilly Media",
        publishedDate: '2016',
        description: 'PythonでデータサイエンスとAI/MLを学ぶための包括的なガイド。',
        categories: ['Python', 'Data Science', 'Machine Learning'],
        thumbnail: 'https://jakevdp.github.io/PythonDataScienceHandbook/figures/PDSH-cover.png',
        downloadLink: 'https://github.com/jakevdp/PythonDataScienceHandbook/raw/master/notebooks/PythonDataScienceHandbook.pdf',
        pageCount: 541,
        keywords: ['python', 'data science', 'machine learning', 'pandas', 'numpy', 'データサイエンス']
      },
      // JavaScript
      {
        id: 'eloquent-javascript',
        title: 'Eloquent JavaScript (3rd Edition)',
        authors: ['Marijn Haverbeke'],
        publisher: 'No Starch Press',
        publishedDate: '2018',
        description: 'JavaScriptの基礎から高度なプログラミング技法まで学べる名著。',
        categories: ['JavaScript', 'Web Development', 'Programming'],
        thumbnail: 'https://eloquentjavascript.net/img/cover.jpg',
        downloadLink: 'https://eloquentjavascript.net/Eloquent_JavaScript.pdf',
        pageCount: 472,
        keywords: ['javascript', 'web', 'programming', 'node', 'js']
      },
      // Rust
      {
        id: 'rust-book',
        title: 'The Rust Programming Language',
        authors: ['Steve Klabnik', 'Carol Nichols'],
        publisher: 'No Starch Press',
        publishedDate: '2023',
        description: 'Rust公式ガイドブック。システムプログラミングとメモリ安全性を学ぶ。',
        categories: ['Rust', 'Systems Programming'],
        thumbnail: 'https://rust-lang.github.io/book/img/cover.png',
        downloadLink: 'https://doc.rust-lang.org/book/rust-programming-language.pdf',
        pageCount: 560,
        keywords: ['rust', 'systems programming', 'memory safety', 'ラスト']
      },
      // Go
      {
        id: 'gopl',
        title: 'The Go Programming Language',
        authors: ['Alan A. A. Donovan', 'Brian W. Kernighan'],
        publisher: 'Addison-Wesley',
        publishedDate: '2015',
        description: 'Go言語の包括的なガイド。K&Rスタイルで書かれた名著。',
        categories: ['Go', 'Programming'],
        thumbnail: 'https://www.gopl.io/cover.png',
        downloadLink: 'https://www.gopl.io/ch1.pdf',
        pageCount: 380,
        keywords: ['go', 'golang', 'programming', 'Go言語']
      },
      // Linux
      {
        id: 'tlcl',
        title: 'The Linux Command Line',
        authors: ['William Shotts'],
        publisher: 'No Starch Press',
        publishedDate: '2019',
        description: 'Linuxコマンドラインの完全ガイド。初心者から上級者まで。',
        categories: ['Linux', 'Command Line', 'Unix'],
        thumbnail: 'https://linuxcommand.org/images/tlcl.jpg',
        downloadLink: 'https://sourceforge.net/projects/linuxcommand/files/TLCL/19.01/TLCL-19.01.pdf/download',
        pageCount: 540,
        keywords: ['linux', 'command line', 'unix', 'bash', 'shell', 'リナックス']
      },
      // Docker
      {
        id: 'docker-deep-dive',
        title: 'Docker Deep Dive',
        authors: ['Nigel Poulton'],
        publisher: 'Self-published',
        publishedDate: '2023',
        description: 'Dockerの完全ガイド。コンテナ技術の基礎から実践まで。',
        categories: ['Docker', 'DevOps', 'Containers'],
        thumbnail: null,
        downloadLink: 'https://github.com/nigelpoulton/elbonia/raw/master/docker-deep-dive.pdf',
        pageCount: 350,
        keywords: ['docker', 'containers', 'devops', 'コンテナ']
      },
      // AI/ML
      {
        id: 'islr',
        title: 'An Introduction to Statistical Learning',
        authors: ['Gareth James', 'Daniela Witten', 'Trevor Hastie', 'Robert Tibshirani'],
        publisher: 'Springer',
        publishedDate: '2021',
        description: '統計的学習の入門書。機械学習の理論と実践。',
        categories: ['Machine Learning', 'Statistics', 'Data Science'],
        thumbnail: 'https://www.statlearning.com/s/ISLRv2_website.pdf',
        downloadLink: 'https://www.statlearning.com/s/ISLRv2_website.pdf',
        pageCount: 607,
        keywords: ['machine learning', 'statistics', 'data science', '機械学習', '統計']
      },
      // 文学・小説（パブリックドメイン）
      {
        id: 'pride-prejudice',
        title: 'Pride and Prejudice',
        authors: ['Jane Austen'],
        publisher: 'Project Gutenberg',
        publishedDate: '1813',
        description: 'ジェーン・オースティンの名作恋愛小説。',
        categories: ['Fiction', 'Classic Literature', 'Romance'],
        thumbnail: null,
        downloadLink: 'https://www.gutenberg.org/files/1342/1342-pdf.pdf',
        pageCount: 400,
        keywords: ['pride and prejudice', 'jane austen', 'classic', 'fiction', '小説', '文学']
      },
      {
        id: 'alice-wonderland',
        title: "Alice's Adventures in Wonderland",
        authors: ['Lewis Carroll'],
        publisher: 'Project Gutenberg',
        publishedDate: '1865',
        description: 'ルイス・キャロルの不思議の国のアリス。',
        categories: ['Fiction', 'Fantasy', 'Children'],
        thumbnail: null,
        downloadLink: 'https://www.gutenberg.org/files/11/11-pdf.pdf',
        pageCount: 200,
        keywords: ['alice', 'wonderland', 'carroll', 'fantasy', 'アリス', 'ファンタジー']
      },
      {
        id: 'sherlock-holmes',
        title: 'The Adventures of Sherlock Holmes',
        authors: ['Arthur Conan Doyle'],
        publisher: 'Project Gutenberg',
        publishedDate: '1892',
        description: 'シャーロック・ホームズの冒険。名探偵の活躍を描いた短編集。',
        categories: ['Fiction', 'Mystery', 'Detective'],
        thumbnail: null,
        downloadLink: 'https://www.gutenberg.org/files/1661/1661-pdf.pdf',
        pageCount: 307,
        keywords: ['sherlock', 'holmes', 'mystery', 'detective', 'ホームズ', '推理', 'ミステリー']
      },
      // ビジネス・自己啓発
      {
        id: 'as-man-thinketh',
        title: 'As a Man Thinketh',
        authors: ['James Allen'],
        publisher: 'Project Gutenberg',
        publishedDate: '1903',
        description: '思考は人生を創る。自己啓発の古典的名著。',
        categories: ['Self-Help', 'Philosophy', 'Personal Development'],
        thumbnail: null,
        downloadLink: 'https://www.gutenberg.org/files/1049/1049-pdf.pdf',
        pageCount: 76,
        keywords: ['self-help', 'philosophy', 'thinking', '自己啓発', '哲学', '思考']
      },
      // 科学
      {
        id: 'origin-species',
        title: 'On the Origin of Species',
        authors: ['Charles Darwin'],
        publisher: 'Project Gutenberg',
        publishedDate: '1859',
        description: 'ダーウィンの進化論。生物学史上最も重要な著作の一つ。',
        categories: ['Science', 'Biology', 'Evolution'],
        thumbnail: null,
        downloadLink: 'https://www.gutenberg.org/files/1228/1228-pdf.pdf',
        pageCount: 502,
        keywords: ['darwin', 'evolution', 'biology', 'science', 'ダーウィン', '進化', '生物学']
      }
    ];
  }

  /**
   * キュレートされた無料PDFを検索
   */
  searchFreePdfs(query) {
    const catalog = this.getFreePdfCatalog();
    const queryLower = query.toLowerCase();

    // キーワードマッチング
    const matches = catalog.filter(book => {
      return book.keywords.some(keyword =>
        queryLower.includes(keyword.toLowerCase())
      ) ||
      book.title.toLowerCase().includes(queryLower) ||
      book.authors.some(author => author.toLowerCase().includes(queryLower));
    });

    // マッチした本を標準フォーマットに変換
    return matches.map(book => ({
      id: book.id,
      title: book.title,
      authors: book.authors,
      publisher: book.publisher,
      publishedDate: book.publishedDate,
      description: book.description,
      isbn: '',
      pageCount: book.pageCount,
      categories: book.categories,
      thumbnail: book.thumbnail,
      previewLink: '',
      infoLink: '',
      buyLink: '',
      price: '無料',
      rating: 0,
      ratingsCount: 0,
      isFree: true,
      pdfAvailable: true,
      epubAvailable: false,
      downloadLink: book.downloadLink,
      source: 'Curated Free PDFs'
    }));
  }

  /**
   * すべてのソースから検索（キュレートされたPDFを優先）
   */
  async searchAllWithFreePdfs(query, options = {}) {
    try {
      // まず、キュレートされた無料PDFを検索
      const freePdfs = this.searchFreePdfs(query);

      // API検索を実行
      const [googleResult, openLibraryResult] = await Promise.all([
        this.searchGoogleBooks(query, options),
        this.searchOpenLibrary(query, options)
      ]);

      const allBooks = [];

      // 無料PDFを最優先で追加
      if (freePdfs.length > 0) {
        allBooks.push(...freePdfs);
      }

      // 他の結果を追加
      if (googleResult.success) {
        allBooks.push(...googleResult.books.map(b => ({ ...b, source: 'Google Books' })));
      }

      if (openLibraryResult.success) {
        allBooks.push(...openLibraryResult.books.map(b => ({ ...b, source: 'Open Library' })));
      }

      // 重複を除去
      const uniqueBooks = this.removeDuplicates(allBooks);

      return {
        success: true,
        books: uniqueBooks,
        totalItems: uniqueBooks.length
      };
    } catch (error) {
      console.error('Search all with free PDFs error:', error);
      return { success: false, error: error.message };
    }
  }
}

// ブラウザ環境でも使えるようにする
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BookSearchService;
}
