/**
 * 本の検索サービス
 * Google Books API、Open Library APIなどを使用して技術書を検索
 */

class BookSearchService {
  constructor() {
    this.googleBooksAPI = 'https://www.googleapis.com/books/v1/volumes';
    this.openLibraryAPI = 'https://openlibrary.org/search.json';
    this.gutenbergAPI = 'https://gutendex.com/books';
    this.arxivAPI = 'http://export.arxiv.org/api/query';
    this.internetArchiveAPI = 'https://archive.org/advancedsearch.php';
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
   * Project Gutenberg（グーテンベルク）で検索
   * パブリックドメインの70,000以上の無料書籍
   */
  async searchGutenberg(query, options = {}) {
    try {
      const { limit = 20 } = options;

      const params = new URLSearchParams({
        search: query,
        mime_type: 'application/pdf' // PDFのみ
      });

      const response = await fetch(`${this.gutenbergAPI}?${params}`);
      const data = await response.json();

      if (!data.results || data.results.length === 0) {
        return { success: true, books: [], totalItems: 0 };
      }

      const books = data.results.slice(0, limit).map(item => this.parseGutenbergItem(item));

      return {
        success: true,
        books,
        totalItems: books.length
      };
    } catch (error) {
      console.error('Gutenberg API error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Internet Archiveで検索
   * 膨大な無料PDFコレクション
   */
  async searchInternetArchive(query, options = {}) {
    try {
      const { limit = 20 } = options;

      const params = new URLSearchParams({
        q: `${query} AND mediatype:texts AND format:pdf`,
        fl: 'identifier,title,creator,date,subject,description,downloads',
        rows: limit,
        output: 'json'
      });

      const response = await fetch(`${this.internetArchiveAPI}?${params}`);
      const data = await response.json();

      if (!data.response || !data.response.docs || data.response.docs.length === 0) {
        return { success: true, books: [], totalItems: 0 };
      }

      const books = data.response.docs.map(doc => this.parseInternetArchiveItem(doc));

      return {
        success: true,
        books,
        totalItems: books.length
      };
    } catch (error) {
      console.error('Internet Archive API error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * arXiv（アーカイブ）で検索
   * 科学・技術論文の無料アーカイブ（2百万以上の論文）
   */
  async searchArxiv(query, options = {}) {
    try {
      const { limit = 20 } = options;

      const params = new URLSearchParams({
        search_query: `all:${query}`,
        start: 0,
        max_results: limit,
        sortBy: 'relevance',
        sortOrder: 'descending'
      });

      const response = await fetch(`${this.arxivAPI}?${params}`);
      const text = await response.text();

      // XMLをパース
      const parser = new DOMParser();
      const xml = parser.parseFromString(text, 'text/xml');
      const entries = xml.querySelectorAll('entry');

      if (entries.length === 0) {
        return { success: true, books: [], totalItems: 0 };
      }

      const books = Array.from(entries).map(entry => this.parseArxivItem(entry));

      return {
        success: true,
        books,
        totalItems: books.length
      };
    } catch (error) {
      console.error('arXiv API error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 複数のソースから検索（統合検索）- 信頼できるソースのみ
   */
  async searchAll(query, options = {}) {
    try {
      // 信頼できるソースのみを使用（Internet ArchiveとarXivを除外）
      const [
        googleResult,
        openLibraryResult,
        gutenbergResult
      ] = await Promise.all([
        this.searchGoogleBooks(query, options),
        this.searchOpenLibrary(query, options),
        this.searchGutenberg(query, options)
      ]);

      const allBooks = [];

      if (googleResult.success) {
        allBooks.push(...googleResult.books.map(b => ({ ...b, source: 'Google Books' })));
      }

      if (openLibraryResult.success) {
        allBooks.push(...openLibraryResult.books.map(b => ({ ...b, source: 'Open Library' })));
      }

      if (gutenbergResult.success) {
        allBooks.push(...gutenbergResult.books.map(b => ({ ...b, source: 'Project Gutenberg' })));
      }

      // 重複を除去（タイトル+著者ベース）
      const uniqueBooks = this.removeDuplicates(allBooks);

      // PDFリンクが安全なドメインのもののみをフィルタリング
      const safeBooks = uniqueBooks.filter(book => {
        if (!book.downloadLink) return false;

        const safeDomains = [
          'gutenberg.org',
          'gutendex.com',
          'openlibrary.org',
          'books.google.com',
          'github.com',
          'githubusercontent.com',
          'greenteapress.com',
          'eloquentjavascript.net',
          'rust-lang.org',
          'doc.rust-lang.org',
          'gopl.io',
          'linuxcommand.org',
          'sourceforge.net',
          'python.org',
          'docs.python.org',
          'git-scm.com',
          'jakevdp.github.io'
        ];

        try {
          const url = new URL(book.downloadLink);
          return safeDomains.some(domain => url.hostname.includes(domain));
        } catch (e) {
          console.warn('Invalid download link:', book.downloadLink);
          return false;
        }
      });

      // 関連性でソート
      const sortedBooks = this.sortByRelevance(safeBooks, query);

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
   * Project Gutenbergのアイテムをパース
   */
  parseGutenbergItem(item) {
    const authors = item.authors && item.authors.length > 0
      ? item.authors.map(a => a.name)
      : ['Unknown Author'];

    // PDFダウンロードリンクを探す
    let downloadLink = null;
    if (item.formats) {
      downloadLink = item.formats['application/pdf'] ||
                     item.formats['application/x-pdf'] ||
                     null;
    }

    return {
      id: `gutenberg-${item.id}`,
      title: item.title || 'Unknown Title',
      authors: authors,
      publisher: 'Project Gutenberg',
      publishedDate: '',
      description: '',
      isbn: '',
      pageCount: 0,
      categories: item.subjects ? item.subjects.slice(0, 5) : [],
      thumbnail: item.formats && item.formats['image/jpeg'] ? item.formats['image/jpeg'] : null,
      previewLink: `https://www.gutenberg.org/ebooks/${item.id}`,
      infoLink: `https://www.gutenberg.org/ebooks/${item.id}`,
      buyLink: '',
      price: 'Free',
      rating: 0,
      ratingsCount: 0,
      isFree: true,
      pdfAvailable: downloadLink !== null,
      epubAvailable: item.formats && item.formats['application/epub+zip'] !== undefined,
      downloadLink: downloadLink
    };
  }

  /**
   * Internet Archiveのアイテムをパース
   */
  parseInternetArchiveItem(doc) {
    const identifier = doc.identifier;
    const downloadLink = `https://archive.org/download/${identifier}/${identifier}.pdf`;

    return {
      id: `ia-${identifier}`,
      title: doc.title || 'Unknown Title',
      authors: doc.creator ? (Array.isArray(doc.creator) ? doc.creator : [doc.creator]) : ['Unknown Author'],
      publisher: 'Internet Archive',
      publishedDate: doc.date || '',
      description: doc.description || '',
      isbn: '',
      pageCount: 0,
      categories: doc.subject ? (Array.isArray(doc.subject) ? doc.subject.slice(0, 5) : [doc.subject]) : [],
      thumbnail: `https://archive.org/services/img/${identifier}`,
      previewLink: `https://archive.org/details/${identifier}`,
      infoLink: `https://archive.org/details/${identifier}`,
      buyLink: '',
      price: 'Free',
      rating: 0,
      ratingsCount: doc.downloads || 0,
      isFree: true,
      pdfAvailable: true,
      epubAvailable: false,
      downloadLink: downloadLink
    };
  }

  /**
   * arXivのアイテムをパース
   */
  parseArxivItem(entry) {
    const getId = (entry) => {
      const id = entry.querySelector('id');
      return id ? id.textContent : '';
    };

    const getTitle = (entry) => {
      const title = entry.querySelector('title');
      return title ? title.textContent.trim() : 'Unknown Title';
    };

    const getAuthors = (entry) => {
      const authors = entry.querySelectorAll('author name');
      return authors.length > 0
        ? Array.from(authors).map(a => a.textContent)
        : ['Unknown Author'];
    };

    const getSummary = (entry) => {
      const summary = entry.querySelector('summary');
      return summary ? summary.textContent.trim() : '';
    };

    const getPublished = (entry) => {
      const published = entry.querySelector('published');
      return published ? published.textContent.substring(0, 10) : '';
    };

    const getCategories = (entry) => {
      const categories = entry.querySelectorAll('category');
      return Array.from(categories).map(c => c.getAttribute('term')).slice(0, 5);
    };

    const id = getId(entry);
    const arxivId = id.split('/').pop();
    const downloadLink = `https://arxiv.org/pdf/${arxivId}.pdf`;

    return {
      id: `arxiv-${arxivId}`,
      title: getTitle(entry),
      authors: getAuthors(entry),
      publisher: 'arXiv',
      publishedDate: getPublished(entry),
      description: getSummary(entry),
      isbn: '',
      pageCount: 0,
      categories: getCategories(entry),
      thumbnail: null,
      previewLink: `https://arxiv.org/abs/${arxivId}`,
      infoLink: `https://arxiv.org/abs/${arxivId}`,
      buyLink: '',
      price: 'Free',
      rating: 0,
      ratingsCount: 0,
      isFree: true,
      pdfAvailable: true,
      epubAvailable: false,
      downloadLink: downloadLink
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
   * 関連性でソート
   */
  sortByRelevance(books, query) {
    const queryLower = query.toLowerCase();

    return books.sort((a, b) => {
      // タイトルに検索クエリが含まれているかスコアリング
      const aScore = this.calculateRelevanceScore(a, queryLower);
      const bScore = this.calculateRelevanceScore(b, queryLower);

      return bScore - aScore;
    });
  }

  /**
   * 関連性スコアを計算
   */
  calculateRelevanceScore(book, queryLower) {
    let score = 0;

    // タイトルに完全一致
    if (book.title.toLowerCase().includes(queryLower)) {
      score += 10;
    }

    // 著者名に一致
    if (book.authors.some(author => author.toLowerCase().includes(queryLower))) {
      score += 5;
    }

    // カテゴリに一致
    if (book.categories.some(cat => cat.toLowerCase().includes(queryLower))) {
      score += 3;
    }

    // PDFが利用可能
    if (book.pdfAvailable) {
      score += 5;
    }

    // ダウンロードリンクがある
    if (book.downloadLink) {
      score += 5;
    }

    // レーティング
    score += (book.rating * book.ratingsCount) / 100;

    return score;
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
   * 人気のトピックを取得（技術書＋一般書籍）
   */
  getPopularTopics() {
    return [
      // プログラミング言語
      { name: 'JavaScript', query: 'javascript programming' },
      { name: 'Python', query: 'python programming' },
      { name: 'Java', query: 'java programming' },
      { name: 'C++', query: 'c++ programming' },
      { name: 'Rust', query: 'rust programming' },
      { name: 'Go', query: 'golang programming' },
      { name: 'TypeScript', query: 'typescript programming' },
      { name: 'Swift', query: 'swift programming' },

      // Web開発
      { name: 'Web Development', query: 'web development' },
      { name: 'React', query: 'react programming' },
      { name: 'Vue.js', query: 'vuejs programming' },
      { name: 'Node.js', query: 'nodejs programming' },
      { name: 'Frontend', query: 'frontend development' },
      { name: 'Backend', query: 'backend development' },

      // データサイエンス・AI
      { name: 'Machine Learning', query: 'machine learning' },
      { name: 'Data Science', query: 'data science' },
      { name: 'Deep Learning', query: 'deep learning' },
      { name: 'Artificial Intelligence', query: 'artificial intelligence' },
      { name: 'Neural Networks', query: 'neural networks' },

      // DevOps・インフラ
      { name: 'DevOps', query: 'devops' },
      { name: 'Cloud Computing', query: 'cloud computing' },
      { name: 'Docker', query: 'docker containers' },
      { name: 'Kubernetes', query: 'kubernetes' },
      { name: 'AWS', query: 'amazon web services' },
      { name: 'Linux', query: 'linux administration' },

      // コンピュータサイエンス
      { name: 'Algorithms', query: 'algorithms data structures' },
      { name: 'Computer Science', query: 'computer science' },
      { name: 'System Design', query: 'system design' },
      { name: 'Database', query: 'database design' },

      // ビジネス・自己啓発
      { name: 'Business', query: 'business management' },
      { name: 'Marketing', query: 'marketing strategy' },
      { name: 'Leadership', query: 'leadership management' },
      { name: 'Self-Help', query: 'self improvement' },
      { name: 'Productivity', query: 'productivity time management' },

      // 文学
      { name: 'Classic Literature', query: 'classic literature' },
      { name: 'Fiction', query: 'fiction novels' },
      { name: 'Science Fiction', query: 'science fiction' },
      { name: 'Mystery', query: 'mystery detective' },
      { name: 'Philosophy', query: 'philosophy' },

      // 科学
      { name: 'Physics', query: 'physics science' },
      { name: 'Mathematics', query: 'mathematics' },
      { name: 'Biology', query: 'biology science' },
      { name: 'Chemistry', query: 'chemistry science' },

      // 歴史・社会
      { name: 'History', query: 'history' },
      { name: 'Economics', query: 'economics' },
      { name: 'Psychology', query: 'psychology' },
      { name: 'Sociology', query: 'sociology' }
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
      // === プログラミング言語 ===

      // === 確実にダウンロードできる高品質な技術書 ===

      // Git
      {
        id: 'progit',
        title: 'Pro Git (2nd Edition)',
        authors: ['Scott Chacon', 'Ben Straub'],
        publisher: 'Apress',
        publishedDate: '2024',
        description: 'Gitの完全ガイド。バージョン管理の基礎から高度な使い方まで網羅。',
        categories: ['Git', 'Version Control', 'Programming'],
        thumbnail: 'https://git-scm.com/images/progit2.png',
        downloadLink: 'https://github.com/progit/progit2/releases/download/2.1.430/progit.pdf',
        pageCount: 574,
        keywords: ['git', 'version control', 'バージョン管理', 'github'],
        isFree: true,
        pdfAvailable: true,
        source: 'Curated Free PDFs'
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
        keywords: ['python', 'programming', 'パイソン', 'プログラミング'],
        isFree: true,
        pdfAvailable: true,
        source: 'Curated Free PDFs'
      },
      {
        id: 'python-notes',
        title: 'Python Notes for Professionals',
        authors: ['GoalKicker.com'],
        publisher: 'GoalKicker.com',
        publishedDate: '2023',
        description: 'Pythonの実践的なノート集。',
        categories: ['Python', 'Programming'],
        thumbnail: 'https://goalkicker.com/PythonBook/PythonNotesForProfessionals.png',
        downloadLink: 'https://goalkicker.com/PythonBook/PythonNotesForProfessionals.pdf',
        pageCount: 816,
        keywords: ['python', 'programming', 'パイソン', 'プログラミング'],
        isFree: true,
        pdfAvailable: true,
        source: 'Curated Free PDFs'
      },
      {
        id: 'automate-python',
        title: 'Automate the Boring Stuff with Python',
        authors: ['Al Sweigart'],
        publisher: 'No Starch Press',
        publishedDate: '2019',
        description: 'Pythonで退屈な作業を自動化。実践的なプログラミング入門。',
        categories: ['Python', 'Automation', 'Programming'],
        thumbnail: 'https://automatetheboringstuff.com/images/automate_2e_cover.png',
        downloadLink: 'https://automatetheboringstuff.com/2e/automate-online.pdf',
        pageCount: 500,
        keywords: ['python', 'automation', 'scripting', '自動化', 'プログラミング'],
        isFree: true,
        pdfAvailable: true,
        source: 'Curated Free PDFs'
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
        keywords: ['javascript', 'web', 'programming', 'node', 'js'],
        isFree: true,
        pdfAvailable: true,
        source: 'Curated Free PDFs'
      },
      {
        id: 'javascript-notes',
        title: 'JavaScript Notes for Professionals',
        authors: ['GoalKicker.com'],
        publisher: 'GoalKicker.com',
        publishedDate: '2023',
        description: 'JavaScriptの実践的なノート集。',
        categories: ['JavaScript', 'Programming'],
        thumbnail: 'https://goalkicker.com/JavaScriptBook/JavaScriptNotesForProfessionals.png',
        downloadLink: 'https://goalkicker.com/JavaScriptBook/JavaScriptNotesForProfessionals.pdf',
        pageCount: 490,
        keywords: ['javascript', 'js', 'web', 'programming'],
        isFree: true,
        pdfAvailable: true,
        source: 'Curated Free PDFs'
      },
      // Go
      {
        id: 'go-notes',
        title: 'Go Notes for Professionals',
        authors: ['GoalKicker.com'],
        publisher: 'GoalKicker.com',
        publishedDate: '2023',
        description: 'Go言語の実践的なノート集。',
        categories: ['Go', 'Programming'],
        thumbnail: 'https://goalkicker.com/GoBook/GoNotesForProfessionals.png',
        downloadLink: 'https://goalkicker.com/GoBook/GoNotesForProfessionals.pdf',
        pageCount: 214,
        keywords: ['go', 'golang', 'programming', 'Go言語'],
        isFree: true,
        pdfAvailable: true,
        source: 'Curated Free PDFs'
      },
      // C++
      {
        id: 'cpp-notes',
        title: 'C++ Notes for Professionals',
        authors: ['GoalKicker.com'],
        publisher: 'GoalKicker.com',
        publishedDate: '2023',
        description: 'C++の実践的なノート集。',
        categories: ['C++', 'Programming'],
        thumbnail: 'https://goalkicker.com/CPlusPlusBook/CPlusPlusNotesForProfessionals.png',
        downloadLink: 'https://goalkicker.com/CPlusPlusBook/CPlusPlusNotesForProfessionals.pdf',
        pageCount: 707,
        keywords: ['c++', 'cpp', 'programming', 'シープラスプラス'],
        isFree: true,
        pdfAvailable: true,
        source: 'Curated Free PDFs'
      },
      // Linux
      {
        id: 'linux-notes',
        title: 'Linux Notes for Professionals',
        authors: ['GoalKicker.com'],
        publisher: 'GoalKicker.com',
        publishedDate: '2023',
        description: 'Linuxの実践的なノート集。',
        categories: ['Linux', 'Operating System'],
        thumbnail: 'https://goalkicker.com/LinuxBook/LinuxNotesForProfessionals.png',
        downloadLink: 'https://goalkicker.com/LinuxBook/LinuxNotesForProfessionals.pdf',
        pageCount: 157,
        keywords: ['linux', 'unix', 'operating system', 'リナックス'],
        isFree: true,
        pdfAvailable: true,
        source: 'Curated Free PDFs'
      },
      // Docker
      {
        id: 'docker-notes',
        title: 'Docker Notes for Professionals',
        authors: ['GoalKicker.com'],
        publisher: 'GoalKicker.com',
        publishedDate: '2023',
        description: 'Dockerの実践的なノート集。',
        categories: ['Docker', 'DevOps', 'Containers'],
        thumbnail: 'https://goalkicker.com/DockerBook/DockerNotesForProfessionals.png',
        downloadLink: 'https://goalkicker.com/DockerBook/DockerNotesForProfessionals.pdf',
        pageCount: 107,
        keywords: ['docker', 'containers', 'devops', 'コンテナ'],
        isFree: true,
        pdfAvailable: true,
        source: 'Curated Free PDFs'
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
        keywords: ['machine learning', 'statistics', 'data science', '機械学習', '統計'],
        isFree: true,
        pdfAvailable: true,
        source: 'Curated Free PDFs'
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
        keywords: ['pride and prejudice', 'jane austen', 'classic', 'fiction', '小説', '文学'],
        isFree: true,
        pdfAvailable: true,
        source: 'Curated Free PDFs'
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
        keywords: ['alice', 'wonderland', 'carroll', 'fantasy', 'アリス', 'ファンタジー'],
        isFree: true,
        pdfAvailable: true,
        source: 'Curated Free PDFs'
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
        keywords: ['sherlock', 'holmes', 'mystery', 'detective', 'ホームズ', '推理', 'ミステリー'],
        isFree: true,
        pdfAvailable: true,
        source: 'Curated Free PDFs'
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
        keywords: ['self-help', 'philosophy', 'thinking', '自己啓発', '哲学', '思考'],
        isFree: true,
        pdfAvailable: true,
        source: 'Curated Free PDFs'
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
        keywords: ['darwin', 'evolution', 'biology', 'science', 'ダーウィン', '進化', '生物学'],
        isFree: true,
        pdfAvailable: true,
        source: 'Curated Free PDFs'
      },
      // Web Development
      {
        id: 'dive-into-html5',
        title: 'Dive Into HTML5',
        authors: ['Mark Pilgrim'],
        publisher: 'Self-published',
        publishedDate: '2010',
        description: 'HTML5の詳細なガイド。Web開発者必携の書。',
        categories: ['HTML5', 'Web Development'],
        thumbnail: null,
        downloadLink: 'https://diveinto.html5doctor.com/examples/dive-into-html5-screen.pdf',
        pageCount: 300,
        keywords: ['html5', 'html', 'web', 'development', 'frontend', 'ウェブ開発'],
        isFree: true,
        pdfAvailable: true,
        source: 'Curated Free PDFs'
      },
      // データベース
      {
        id: 'postgres-guide',
        title: 'PostgreSQL Tutorial',
        authors: ['PostgreSQL Global Development Group'],
        publisher: 'PostgreSQL',
        publishedDate: '2023',
        description: 'PostgreSQLの公式チュートリアル。データベース管理の基礎から応用まで。',
        categories: ['Database', 'PostgreSQL', 'SQL'],
        thumbnail: null,
        downloadLink: 'https://www.postgresql.org/files/documentation/pdf/15/postgresql-15-A4.pdf',
        pageCount: 3000,
        keywords: ['postgresql', 'postgres', 'database', 'sql', 'データベース'],
        isFree: true,
        pdfAvailable: true,
        source: 'Curated Free PDFs'
      },
      // アルゴリズム
      {
        id: 'algorithms-notes',
        title: 'Algorithms Notes for Professionals',
        authors: ['GoalKicker.com'],
        publisher: 'GoalKicker.com',
        publishedDate: '2018',
        description: 'アルゴリズムとデータ構造の包括的なノート集。',
        categories: ['Algorithms', 'Data Structures', 'Computer Science'],
        thumbnail: 'https://goalkicker.com/AlgorithmsBook/AlgorithmsNotesForProfessionals.png',
        downloadLink: 'https://goalkicker.com/AlgorithmsBook/AlgorithmsNotesForProfessionals.pdf',
        pageCount: 257,
        keywords: ['algorithms', 'data structures', 'computer science', 'アルゴリズム', 'データ構造'],
        isFree: true,
        pdfAvailable: true,
        source: 'Curated Free PDFs'
      },
      // TypeScript
      {
        id: 'typescript-deep-dive',
        title: 'TypeScript Deep Dive',
        authors: ['Basarat Ali Syed'],
        publisher: 'Self-published',
        publishedDate: '2022',
        description: 'TypeScriptの詳細ガイド。型システムから実践的な使い方まで。',
        categories: ['TypeScript', 'JavaScript', 'Programming'],
        thumbnail: null,
        downloadLink: 'https://basarat.gitbook.io/typescript/download',
        pageCount: 400,
        keywords: ['typescript', 'ts', 'javascript', 'programming', 'タイプスクリプト'],
        isFree: true,
        pdfAvailable: true,
        source: 'Curated Free PDFs'
      },
      // Node.js
      {
        id: 'nodejs-notes',
        title: 'Node.js Notes for Professionals',
        authors: ['GoalKicker.com'],
        publisher: 'GoalKicker.com',
        publishedDate: '2018',
        description: 'Node.jsの実践的なノート集。バックエンド開発に必須。',
        categories: ['Node.js', 'JavaScript', 'Backend'],
        thumbnail: 'https://goalkicker.com/NodeJSBook/NodeJSNotesForProfessionals.png',
        downloadLink: 'https://goalkicker.com/NodeJSBook/NodeJSNotesForProfessionals.pdf',
        pageCount: 340,
        keywords: ['nodejs', 'node', 'javascript', 'backend', 'server', 'ノード'],
        isFree: true,
        pdfAvailable: true,
        source: 'Curated Free PDFs'
      },
      // React
      {
        id: 'react-notes',
        title: 'React.js Notes for Professionals',
        authors: ['GoalKicker.com'],
        publisher: 'GoalKicker.com',
        publishedDate: '2018',
        description: 'React.jsの実践的なノート集。モダンなフロントエンド開発。',
        categories: ['React', 'JavaScript', 'Frontend'],
        thumbnail: 'https://goalkicker.com/ReactJSBook/ReactJSNotesForProfessionals.png',
        downloadLink: 'https://goalkicker.com/ReactJSBook/ReactJSNotesForProfessionals.pdf',
        pageCount: 176,
        keywords: ['react', 'reactjs', 'javascript', 'frontend', 'リアクト'],
        isFree: true,
        pdfAvailable: true,
        source: 'Curated Free PDFs'
      },
      // CSS
      {
        id: 'css-notes',
        title: 'CSS Notes for Professionals',
        authors: ['GoalKicker.com'],
        publisher: 'GoalKicker.com',
        publishedDate: '2018',
        description: 'CSSの包括的なノート集。スタイリングの基礎から応用まで。',
        categories: ['CSS', 'Web Design', 'Frontend'],
        thumbnail: 'https://goalkicker.com/CSSBook/CSSNotesForProfessionals.png',
        downloadLink: 'https://goalkicker.com/CSSBook/CSSNotesForProfessionals.pdf',
        pageCount: 357,
        keywords: ['css', 'styling', 'web design', 'frontend', 'スタイル'],
        isFree: true,
        pdfAvailable: true,
        source: 'Curated Free PDFs'
      },
      // Java
      {
        id: 'java-notes',
        title: 'Java Notes for Professionals',
        authors: ['GoalKicker.com'],
        publisher: 'GoalKicker.com',
        publishedDate: '2018',
        description: 'Javaプログラミングの包括的なノート集。',
        categories: ['Java', 'Programming', 'OOP'],
        thumbnail: 'https://goalkicker.com/JavaBook/JavaNotesForProfessionals.png',
        downloadLink: 'https://goalkicker.com/JavaBook/JavaNotesForProfessionals.pdf',
        pageCount: 1036,
        keywords: ['java', 'programming', 'oop', 'jvm', 'ジャバ', 'プログラミング'],
        isFree: true,
        pdfAvailable: true,
        source: 'Curated Free PDFs'
      },
      // C++
      {
        id: 'cpp-notes',
        title: 'C++ Notes for Professionals',
        authors: ['GoalKicker.com'],
        publisher: 'GoalKicker.com',
        publishedDate: '2018',
        description: 'C++プログラミングの実践的なノート集。',
        categories: ['C++', 'Programming', 'Systems'],
        thumbnail: 'https://goalkicker.com/CPlusPlusBook/CPlusPlusNotesForProfessionals.png',
        downloadLink: 'https://goalkicker.com/CPlusPlusBook/CPlusPlusNotesForProfessionals.pdf',
        pageCount: 707,
        keywords: ['c++', 'cpp', 'programming', 'systems', 'プログラミング'],
        isFree: true,
        pdfAvailable: true,
        source: 'Curated Free PDFs'
      },
      // MongoDB
      {
        id: 'mongodb-notes',
        title: 'MongoDB Notes for Professionals',
        authors: ['GoalKicker.com'],
        publisher: 'GoalKicker.com',
        publishedDate: '2018',
        description: 'MongoDBの実践的なノート集。NoSQLデータベースの基礎。',
        categories: ['MongoDB', 'Database', 'NoSQL'],
        thumbnail: 'https://goalkicker.com/MongoDBBook/MongoDBNotesForProfessionals.png',
        downloadLink: 'https://goalkicker.com/MongoDBBook/MongoDBNotesForProfessionals.pdf',
        pageCount: 109,
        keywords: ['mongodb', 'mongo', 'database', 'nosql', 'データベース'],
        isFree: true,
        pdfAvailable: true,
        source: 'Curated Free PDFs'
      },
      // 哲学
      {
        id: 'republic-plato',
        title: 'The Republic',
        authors: ['Plato'],
        publisher: 'Project Gutenberg',
        publishedDate: '380 BC',
        description: 'プラトンの「国家」。政治哲学の古典的名著。',
        categories: ['Philosophy', 'Classic', 'Politics'],
        thumbnail: null,
        downloadLink: 'https://www.gutenberg.org/files/1497/1497-pdf.pdf',
        pageCount: 300,
        keywords: ['plato', 'philosophy', 'republic', 'classic', 'プラトン', '哲学', '国家'],
        isFree: true,
        pdfAvailable: true,
        source: 'Curated Free PDFs'
      },
      // 経済学
      {
        id: 'wealth-of-nations',
        title: 'The Wealth of Nations',
        authors: ['Adam Smith'],
        publisher: 'Project Gutenberg',
        publishedDate: '1776',
        description: 'アダム・スミスの「国富論」。近代経済学の基礎。',
        categories: ['Economics', 'Classic', 'Business'],
        thumbnail: null,
        downloadLink: 'https://www.gutenberg.org/files/3300/3300-pdf.pdf',
        pageCount: 1200,
        keywords: ['economics', 'adam smith', 'wealth', 'business', '経済学', '国富論'],
        isFree: true,
        pdfAvailable: true,
        source: 'Curated Free PDFs'
      },

      // === 追加の高品質技術書 ===

      // SQL
      {
        id: 'sql-notes',
        title: 'SQL Notes for Professionals',
        authors: ['GoalKicker.com'],
        publisher: 'GoalKicker.com',
        publishedDate: '2023',
        description: 'SQLの実践的なノート集。',
        categories: ['SQL', 'Database', 'Programming'],
        thumbnail: 'https://goalkicker.com/SQLBook/SQLNotesForProfessionals.png',
        downloadLink: 'https://goalkicker.com/SQLBook/SQLNotesForProfessionals.pdf',
        pageCount: 91,
        keywords: ['sql', 'database', 'query', 'データベース', 'クエリ'],
        isFree: true,
        pdfAvailable: true,
        source: 'Curated Free PDFs'
      },

      // MySQL
      {
        id: 'mysql-notes',
        title: 'MySQL Notes for Professionals',
        authors: ['GoalKicker.com'],
        publisher: 'GoalKicker.com',
        publishedDate: '2023',
        description: 'MySQLの実践的なノート集。',
        categories: ['MySQL', 'Database', 'SQL'],
        thumbnail: 'https://goalkicker.com/MySQLBook/MySQLNotesForProfessionals.png',
        downloadLink: 'https://goalkicker.com/MySQLBook/MySQLNotesForProfessionals.pdf',
        pageCount: 135,
        keywords: ['mysql', 'database', 'sql', 'データベース'],
        isFree: true,
        pdfAvailable: true,
        source: 'Curated Free PDFs'
      },

      // Git
      {
        id: 'git-notes',
        title: 'Git Notes for Professionals',
        authors: ['GoalKicker.com'],
        publisher: 'GoalKicker.com',
        publishedDate: '2023',
        description: 'Gitの実践的なノート集。',
        categories: ['Git', 'Version Control', 'Programming'],
        thumbnail: 'https://goalkicker.com/GitBook/GitNotesForProfessionals.png',
        downloadLink: 'https://goalkicker.com/GitBook/GitNotesForProfessionals.pdf',
        pageCount: 157,
        keywords: ['git', 'version control', 'github', 'バージョン管理'],
        isFree: true,
        pdfAvailable: true,
        source: 'Curated Free PDFs'
      },

      // Bash
      {
        id: 'bash-notes',
        title: 'Bash Notes for Professionals',
        authors: ['GoalKicker.com'],
        publisher: 'GoalKicker.com',
        publishedDate: '2023',
        description: 'Bashの実践的なノート集。',
        categories: ['Bash', 'Shell', 'Linux'],
        thumbnail: 'https://goalkicker.com/BashBook/BashNotesForProfessionals.png',
        downloadLink: 'https://goalkicker.com/BashBook/BashNotesForProfessionals.pdf',
        pageCount: 156,
        keywords: ['bash', 'shell', 'linux', 'command line', 'シェル'],
        isFree: true,
        pdfAvailable: true,
        source: 'Curated Free PDFs'
      },

      // Android
      {
        id: 'android-notes',
        title: 'Android Notes for Professionals',
        authors: ['GoalKicker.com'],
        publisher: 'GoalKicker.com',
        publishedDate: '2023',
        description: 'Androidアプリ開発の実践的なノート集。',
        categories: ['Android', 'Mobile Development', 'Java'],
        thumbnail: 'https://goalkicker.com/AndroidBook/AndroidNotesForProfessionals.png',
        downloadLink: 'https://goalkicker.com/AndroidBook/AndroidNotesForProfessionals.pdf',
        pageCount: 506,
        keywords: ['android', 'mobile', 'app development', 'java', 'アンドロイド'],
        isFree: true,
        pdfAvailable: true,
        source: 'Curated Free PDFs'
      },

      // iOS
      {
        id: 'ios-notes',
        title: 'iOS Developer Notes for Professionals',
        authors: ['GoalKicker.com'],
        publisher: 'GoalKicker.com',
        publishedDate: '2023',
        description: 'iOSアプリ開発の実践的なノート集。',
        categories: ['iOS', 'Mobile Development', 'Swift'],
        thumbnail: 'https://goalkicker.com/iOSBook/iOSNotesForProfessionals.png',
        downloadLink: 'https://goalkicker.com/iOSBook/iOSNotesForProfessionals.pdf',
        pageCount: 180,
        keywords: ['ios', 'mobile', 'swift', 'app development', 'アイオーエス'],
        isFree: true,
        pdfAvailable: true,
        source: 'Curated Free PDFs'
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

      // 全ソースから並列で検索
      const [
        openLibraryResult,
        gutenbergResult,
        internetArchiveResult
      ] = await Promise.all([
        this.searchOpenLibrary(query, options).catch(err => {
          console.error('Open Library error:', err);
          return { success: false, books: [] };
        }),
        this.searchGutenberg(query, options).catch(err => {
          console.error('Gutenberg error:', err);
          return { success: false, books: [] };
        }),
        this.searchInternetArchive(query, options).catch(err => {
          console.error('Internet Archive error:', err);
          return { success: false, books: [] };
        })
      ]);

      const allBooks = [];

      // 無料PDFカタログを最優先で追加
      if (freePdfs.length > 0) {
        allBooks.push(...freePdfs);
      }

      // 他のソースの結果を追加
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
