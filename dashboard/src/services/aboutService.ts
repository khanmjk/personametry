import type { BlogPost } from '@/models/about';

type BloggerLink = {
  rel?: string;
  href?: string;
};

type BloggerEntry = {
  id?: { $t?: string };
  title?: { $t?: string };
  content?: { $t?: string };
  summary?: { $t?: string };
  published?: { $t?: string };
  updated?: { $t?: string };
  link?: BloggerLink[];
  media$thumbnail?: { url?: string };
};

type BloggerFeed = {
  entry?: BloggerEntry[];
  openSearch$totalResults?: { $t?: string };
};

type BloggerResponse = {
  feed?: BloggerFeed;
};

const BLOGGER_BASE_URL = 'https://khanmjk-outlet.blogspot.com';
const BLOGGER_LABEL = 'personametry';
const DEFAULT_PAGE_SIZE = 50;
const REQUEST_TIMEOUT_MS = 10000;
const SUMMARY_LENGTH = 180;
const MAX_PAGE_LOOPS = 10;

export class AboutService {
  private static instance: AboutService | null = null;
  private cache: BlogPost[] | null = null;
  private pending: Promise<BlogPost[]> | null = null;

  static getInstance(): AboutService {
    if (!AboutService.instance) {
      AboutService.instance = new AboutService();
    }
    return AboutService.instance;
  }

  private constructor() {}

  async getPersonametryPosts(): Promise<BlogPost[]> {
    if (this.cache) {
      return this.cache;
    }
    if (this.pending) {
      return this.pending;
    }

    this.pending = this.fetchAllPosts();
    try {
      const posts = await this.pending;
      this.cache = posts;
      return posts;
    } finally {
      this.pending = null;
    }
  }

  private async fetchAllPosts(): Promise<BlogPost[]> {
    const posts: BlogPost[] = [];
    let startIndex = 1;
    let totalResults = Number.POSITIVE_INFINITY;
    let loops = 0;

    while (posts.length < totalResults && loops < MAX_PAGE_LOOPS) {
      const response = await this.fetchFeed(startIndex, DEFAULT_PAGE_SIZE);
      const { entries, total } = this.extractFeed(response);

      if (entries.length === 0) {
        break;
      }

      posts.push(...entries);
      totalResults = total;
      startIndex += entries.length;
      loops += 1;

      if (entries.length < DEFAULT_PAGE_SIZE) {
        break;
      }
    }

    return posts.sort(
      (a, b) => new Date(b.published).getTime() - new Date(a.published).getTime()
    );
  }

  private async fetchFeed(startIndex: number, maxResults: number): Promise<BloggerResponse> {
    const apiUrl = `${BLOGGER_BASE_URL}/feeds/posts/default/-/${encodeURIComponent(
      BLOGGER_LABEL
    )}?alt=json&max-results=${maxResults}&start-index=${startIndex}`;

    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`Blogger feed error: ${response.status}`);
      }
      return (await response.json()) as BloggerResponse;
    } catch (error) {
      return this.fetchFeedJsonp(startIndex, maxResults);
    }
  }

  private fetchFeedJsonp(startIndex: number, maxResults: number): Promise<BloggerResponse> {
    return new Promise((resolve, reject) => {
      if (typeof document === 'undefined') {
        reject(new Error('Blogger JSONP requires a browser environment.'));
        return;
      }

      const callbackName = `bloggerCallback_${Date.now()}_${Math.random()
        .toString(16)
        .slice(2)}`;
      const root = globalThis as Record<string, unknown>;
      const apiUrl = `${BLOGGER_BASE_URL}/feeds/posts/default/-/${encodeURIComponent(
        BLOGGER_LABEL
      )}?alt=json-in-script&callback=${callbackName}&max-results=${maxResults}&start-index=${startIndex}`;

      let timeoutId: ReturnType<typeof setTimeout> | null = null;

      const cleanup = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        delete root[callbackName];
        const script = document.getElementById(callbackName);
        if (script) {
          script.remove();
        }
      };

      // JSONP fallback for Blogger when CORS blocks standard fetch.
      root[callbackName] = (data: BloggerResponse) => {
        cleanup();
        resolve(data);
      };

      const script = document.createElement('script');
      script.id = callbackName;
      script.src = apiUrl;
      script.async = true;
      script.onerror = () => {
        cleanup();
        reject(new Error('Failed to load Blogger feed.'));
      };

      timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error('Blogger feed request timed out.'));
      }, REQUEST_TIMEOUT_MS);

      document.head.appendChild(script);
    });
  }

  private extractFeed(response: BloggerResponse): { entries: BlogPost[]; total: number } {
    const feed = response.feed;
    const rawEntries = feed?.entry ?? [];
    const total = Number(feed?.openSearch$totalResults?.$t ?? rawEntries.length);

    return {
      entries: rawEntries.map((entry) => this.mapEntry(entry)),
      total,
    };
  }

  private mapEntry(entry: BloggerEntry): BlogPost {
    const content = entry.content?.$t ?? entry.summary?.$t ?? '';
    const title = this.decodeHtmlEntities(entry.title?.$t ?? 'Untitled');
    const url =
      entry.link?.find((link) => link.rel === 'alternate')?.href ?? '#';
    const published = entry.published?.$t ?? entry.updated?.$t ?? new Date().toISOString();
    const thumbnail =
      entry.media$thumbnail?.url ?? this.extractThumbnail(content);

    return {
      id: entry.id?.$t ?? url,
      title,
      summary: this.extractSummary(content),
      published,
      url,
      thumbnail,
    };
  }

  private extractSummary(htmlContent: string): string {
    const text = this.stripHtml(htmlContent);
    if (!text) {
      return '';
    }
    if (text.length <= SUMMARY_LENGTH) {
      return text;
    }
    return `${text.slice(0, SUMMARY_LENGTH)}...`;
  }

  private extractThumbnail(htmlContent: string): string | null {
    if (!htmlContent) {
      return null;
    }

    if (typeof DOMParser === 'undefined') {
      const match = htmlContent.match(/<img[^>]+src=['"]([^'"]+)['"]/i);
      return match ? match[1] : null;
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const image = doc.querySelector('img');
    return image?.getAttribute('src');
  }

  private stripHtml(htmlContent: string): string {
    if (!htmlContent) {
      return '';
    }

    if (typeof DOMParser === 'undefined') {
      return htmlContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    doc.querySelectorAll('script, style').forEach((node) => node.remove());
    return (doc.body?.textContent || '').replace(/\s+/g, ' ').trim();
  }

  private decodeHtmlEntities(text: string): string {
    if (!text) {
      return '';
    }

    if (typeof DOMParser === 'undefined') {
      return text;
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'text/html');
    return doc.body?.textContent || '';
  }
}

export const aboutService = AboutService.getInstance();
