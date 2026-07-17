import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FirebaseService } from '../../../services/firebase.service';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { News } from '../../../models/news.model';

interface RssJsonItem {
  title: string;
  excerpt: string;
  content: string;
  imageUrl: string;
  author: string;
  publishedDate: string;
  category: string;
  link: string;
  sourceKey: string;
}

interface SavedRssFeed {
  id: string;
  url: string;
  title: string;
  normalizedUrl: string;
  createdAt: string;
  lastUsedAt?: string;
}

interface NewsSimilarityMatch {
  id: string;
  title: string;
}

interface RssOverviewItem extends RssJsonItem {
  duplicateMatch: NewsSimilarityMatch | null;
  isDuplicate: boolean;
}

@Component({
  selector: 'app-news-rss-import',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './rss-import.component.html'
})
export class NewsRssImportComponent implements OnInit {
  authService = inject(AuthService);
  firebaseService = inject(FirebaseService);
  toastService = inject(ToastService);
  private readonly settingsCollection = 'settings';
  private readonly rssSettingsDocId = 'rss_import';

  existingNews = signal<News[]>([]);
  savedRssFeeds = signal<SavedRssFeed[]>([]);
  rssFeedUrl = signal('');
  rssLoading = signal(false);
  rssError = signal('');
  rssJsonPreview = signal<string>('');
  rssItems = signal<RssJsonItem[]>([]);
  rssLastConvertedAt = signal<string>('');
  rssExpandedIndexes = signal<number[]>([]);
  showConvertSection = signal(true);
  showOverview = signal(false);
  hideDuplicates = signal(false);
  selectedSourceKeys = signal<string[]>([]);

  rssCount = computed(() => this.rssItems().length);
  overviewItems = computed<RssOverviewItem[]>(() => this.rssItems().map((item) => {
    const duplicateMatch = this.findExcerptDuplicate(item);
    return {
      ...item,
      duplicateMatch,
      isDuplicate: !!duplicateMatch
    };
  }));
  visibleOverviewItems = computed(() =>
    this.hideDuplicates()
      ? this.overviewItems().filter(item => !item.isDuplicate)
      : this.overviewItems()
  );
  duplicateOverviewCount = computed(() => this.overviewItems().filter(item => item.isDuplicate).length);
  nonDuplicateOverviewCount = computed(() => this.overviewItems().filter(item => !item.isDuplicate).length);
  selectedOverviewCount = computed(() => this.selectedSourceKeys().length);
  areAllVisibleSelected = computed(() => {
    const visibleKeys = this.visibleOverviewItems().map(item => item.sourceKey);
    return visibleKeys.length > 0 && visibleKeys.every(key => this.selectedSourceKeys().includes(key));
  });

  ngOnInit() {
    this.firebaseService.listenToPath<News>('news', (data) => {
      const sorted = data.sort((a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime());
      this.existingNews.set(sorted);
    });
    void this.loadSavedRssFeeds();
  }

  private async loadSavedRssFeeds() {
    try {
      const data = await this.firebaseService.getDocument(this.settingsCollection, this.rssSettingsDocId);
      const feeds = Array.isArray(data?.rssFeeds) ? data.rssFeeds : [];
      const sorted = feeds
        .map(feed => ({
          ...feed,
          url: String(feed.url || '').trim(),
          normalizedUrl: String(feed.normalizedUrl || this.normalizeUrl(feed.url || '')).trim()
        }))
        .filter(feed => !!feed.url)
        .sort((a, b) => new Date(b.lastUsedAt || b.createdAt || 0).getTime() - new Date(a.lastUsedAt || a.createdAt || 0).getTime());
      this.savedRssFeeds.set(sorted);

      if (!data) {
        await this.firebaseService.set(`${this.settingsCollection}/${this.rssSettingsDocId}`, { rssFeeds: [] });
      }
    } catch (e: any) {
      this.toastService.error('Failed to load saved RSS links: ' + (e?.message || 'Unknown error'));
    }
  }

  updateRssUrl(event: Event) {
    this.rssFeedUrl.set((event.target as HTMLInputElement).value);
  }

  clearRssUrl() {
    this.rssFeedUrl.set('');
  }

  private looksLikeXmlFeed(value: string): boolean {
    const trimmed = String(value || '').trim();
    return /^<\?xml|^<rss\b|^<feed\b|^<channel\b/i.test(trimmed);
  }

  private getText(node: Element | null | undefined): string {
    return String(node?.textContent || '').trim();
  }

  private getFirstMatch(root: ParentNode, selectors: string[]): Element | null {
    for (const selector of selectors) {
      const found = root.querySelector(selector);
      if (found) return found;
    }
    return null;
  }

  private extractImageFromHtml(html: string): string {
    const match = String(html || '').match(/<img[^>]+src=["']([^"']+)["']/i);
    return match?.[1]?.trim() || '';
  }

  private parseRssXmlFeed(xmlText: string): { feedTitle: string; items: RssJsonItem[] } {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'application/xml');
    if (doc.querySelector('parsererror')) {
      throw new Error('The pasted content is not valid RSS XML.');
    }

    const channel = this.getFirstMatch(doc, ['rss > channel', 'channel']);
    const isAtom = !channel && !!doc.querySelector('feed');
    if (!channel && !isAtom) {
      throw new Error('Could not find an RSS channel or Atom feed in the pasted content.');
    }

    if (channel) {
      const feedTitle = this.getText(this.getFirstMatch(channel, ['title'])) || 'News';
      const defaultCategory = this.getText(this.getFirstMatch(channel, ['category'])) || feedTitle;
      const defaultAuthor = this.getText(this.getFirstMatch(channel, ['managingEditor'])) || 'Admin';
      const items = Array.from(channel.querySelectorAll('item')).map((item) => {
        const title = this.getText(this.getFirstMatch(item, ['title']));
        const link = this.getText(this.getFirstMatch(item, ['link']));
        const publishedDate = this.getText(this.getFirstMatch(item, ['pubDate', 'date'])) || new Date().toISOString();
        const description = this.getText(this.getFirstMatch(item, ['description', 'content\\:encoded', 'content']));
        const contentEncoded = this.getText(this.getFirstMatch(item, ['content\\:encoded', 'content']));
        const categories = Array.from(item.querySelectorAll('category'))
          .map(category => this.getText(category))
          .filter(Boolean);
        const author = this.getText(this.getFirstMatch(item, ['dc\\:creator', 'creator', 'author'])) || defaultAuthor;
        const enclosure = this.getFirstMatch(item, ['enclosure']);
        const imageUrl = enclosure?.getAttribute('url')?.trim() || this.extractImageFromHtml(contentEncoded || description);
        const excerpt = this.stripHtml(description || contentEncoded || title).slice(0, 220);
        const sourceKey = this.buildSourceKey(title, publishedDate, link, excerpt || title);

        return {
          title,
          excerpt: excerpt || title,
          content: contentEncoded || description || title,
          imageUrl,
          author,
          publishedDate,
          category: categories[0] || defaultCategory,
          link,
          sourceKey
        };
      });

      return { feedTitle, items };
    }

    const feed = doc.querySelector('feed')!;
    const feedTitle = this.getText(this.getFirstMatch(feed, ['title'])) || 'News';
    const defaultAuthor = 'Admin';
    const items = Array.from(feed.querySelectorAll('entry')).map((entry) => {
      const title = this.getText(this.getFirstMatch(entry, ['title']));
      const linkEl = this.getFirstMatch(entry, ['link[rel="alternate"]', 'link']);
      const link = linkEl?.getAttribute('href') || this.getText(linkEl);
      const publishedDate = this.getText(this.getFirstMatch(entry, ['published', 'updated'])) || new Date().toISOString();
      const summary = this.getText(this.getFirstMatch(entry, ['summary', 'content']));
      const content = this.getText(this.getFirstMatch(entry, ['content', 'summary']));
      const author = this.getText(this.getFirstMatch(entry, ['author name', 'name'])) || defaultAuthor;
      const categories = Array.from(entry.querySelectorAll('category'))
        .map(category => category.getAttribute('term') || this.getText(category))
        .filter(Boolean);
      const excerpt = this.stripHtml(summary || content || title).slice(0, 220);
      const sourceKey = this.buildSourceKey(title, publishedDate, link || '', excerpt || title);

      return {
        title,
        excerpt: excerpt || title,
        content: content || summary || title,
        imageUrl: '',
        author,
        publishedDate,
        category: categories[0] || feedTitle,
        link: link || '',
        sourceKey
      };
    });

    return { feedTitle, items };
  }

  async pasteRssUrl() {
    try {
      const text = await navigator.clipboard.readText();
      const value = text.trim();
      if (!value) {
        this.toastService.error('Clipboard is empty.');
        return;
      }
      this.rssFeedUrl.set(value);
      this.toastService.success('RSS link pasted from clipboard.');
    } catch (e: any) {
      this.toastService.error('Could not read the clipboard.');
    }
  }

  async pasteAndConvertRssUrl() {
    try {
      const text = await navigator.clipboard.readText();
      const value = text.trim();
      if (!value) {
        this.toastService.error('Clipboard is empty.');
        return;
      }

      this.rssFeedUrl.set(value);
      await this.processRssFeedText(value);
    } catch (e: any) {
      this.toastService.error('Could not read the clipboard.');
    }
  }

  async copyRssUrl() {
    const value = this.rssFeedUrl().trim();
    if (!value) {
      this.toastService.error('Enter an RSS URL first.');
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      this.toastService.success('RSS link copied to clipboard.');
    } catch (e: any) {
      this.toastService.error('Could not copy the RSS link.');
    }
  }

  toggleOverview() {
    if (!this.rssItems().length) {
      this.toastService.error('Convert an RSS feed first.');
      return;
    }

    this.showOverview.update(v => !v);
    if (!this.showOverview()) {
      return;
    }

    queueMicrotask(() => {
      document.getElementById('rss-overview')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  private openOverviewAfterConversion() {
    this.showConvertSection.set(false);
    this.showOverview.set(true);
    queueMicrotask(() => {
      document.getElementById('rss-overview')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  toggleConvertSection() {
    this.showConvertSection.update(value => !value);
  }

  toggleHideDuplicates() {
    this.hideDuplicates.update(value => !value);
  }

  isOverviewItemSelected(sourceKey: string) {
    return this.selectedSourceKeys().includes(sourceKey);
  }

  toggleOverviewSelection(sourceKey: string, checked: boolean) {
    this.selectedSourceKeys.update(current => {
      if (checked) {
        if (current.includes(sourceKey)) return current;
        return [...current, sourceKey];
      }
      return current.filter(key => key !== sourceKey);
    });
  }

  toggleAllVisibleOverviewSelection(checked: boolean) {
    const visibleKeys = this.visibleOverviewItems().map(item => item.sourceKey);
    this.selectedSourceKeys.update(current => {
      const next = new Set(current);
      if (checked) {
        visibleKeys.forEach(key => next.add(key));
      } else {
        visibleKeys.forEach(key => next.delete(key));
      }
      return Array.from(next);
    });
  }

  clearOverviewSelection() {
    this.selectedSourceKeys.set([]);
  }

  closeOverview() {
    this.showOverview.set(false);
  }

  isItemExpanded(index: number) {
    return this.rssExpandedIndexes().includes(index);
  }

  toggleItemExpanded(index: number) {
    this.rssExpandedIndexes.update(current => {
      if (current.includes(index)) {
        return current.filter(item => item !== index);
      }
      return [...current, index];
    });
  }

  private stripHtml(value: string): string {
    return String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private normalize(value: string): string {
    return this.stripHtml(value).toLowerCase();
  }

  private normalizeExcerpt(value: string): string {
    return String(value || '')
      .toLowerCase()
      .replace(/<[^>]*>/g, ' ')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private normalizeUrl(value: string): string {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/\/+$/, '')
      .replace(/\?.*$/, '');
  }

  private extractImage(item: any): string {
    return String(
      item?.enclosure?.link ||
      item?.thumbnail ||
      item?.image ||
      item?.['media:content']?.url ||
      item?.['media:thumbnail']?.url ||
      ''
    ).trim();
  }

  private buildSourceKey(title: string, publishedDate: string, link: string, excerpt: string): string {
    const normalizedLink = this.normalize(link);
    if (normalizedLink) {
      return `link:${normalizedLink}`;
    }

    return `content:${this.normalize(title)}|${this.normalize(publishedDate)}|${this.normalize(excerpt).slice(0, 120)}`;
  }

  private findExcerptDuplicate(item: RssJsonItem): NewsSimilarityMatch | null {
    const normalizedExcerpt = this.normalizeExcerpt(item.excerpt);
    if (!normalizedExcerpt) return null;

    const match = this.existingNews().find((news) => {
      const existingExcerpt = this.normalizeExcerpt(news.excerpt);
      if (!existingExcerpt) return false;
      return (
        existingExcerpt === normalizedExcerpt ||
        existingExcerpt.includes(normalizedExcerpt) ||
        normalizedExcerpt.includes(existingExcerpt)
      );
    });
    return match ? { id: match.id, title: match.title } : null;
  }

  getSourceDuplicateReason(item: RssJsonItem): NewsSimilarityMatch | null {
    return this.findExcerptDuplicate(item);
  }

  private mapRssItems(items: any[], category: string): RssJsonItem[] {
    const mapped = items.map((item) => {
      const title = String(item?.title || '').trim();
      const description = String(item?.description || item?.contentSnippet || '').trim();
      const content = String(item?.content || item?.contentSnippet || item?.description || '').trim();
      const excerpt = this.stripHtml(description || content).slice(0, 220);
      const publishedDate = String(item?.pubDate || item?.isoDate || new Date().toISOString()).trim();
      const link = String(item?.link || '').trim();
      const sourceKey = this.buildSourceKey(title, publishedDate, link, excerpt || title);

      return {
        title,
        excerpt: excerpt || title,
        content: item?.content || item?.description || description || title,
        imageUrl: this.extractImage(item),
        author: String(item?.author || item?.creator || 'Admin').trim() || 'Admin',
        publishedDate,
        category,
        link,
        sourceKey
      };
    });

    const unique = new Map<string, RssJsonItem>();
    mapped.forEach(item => {
      if (!unique.has(item.sourceKey)) {
        unique.set(item.sourceKey, item);
      }
    });
    return Array.from(unique.values());
  }

  private async saveRssFeed(url: string, title: string) {
    const normalizedUrl = this.normalizeUrl(url);
    if (!normalizedUrl) return;

    const existing = this.savedRssFeeds().find(feed => this.normalizeUrl(feed.url) === normalizedUrl);
    const payload = {
      id: existing?.id || `rss_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      url: url.trim(),
      title: title.trim() || 'RSS Feed',
      normalizedUrl,
      createdAt: existing?.createdAt || new Date().toISOString(),
      lastUsedAt: new Date().toISOString()
    };

    const current = this.savedRssFeeds();
    const next = existing
      ? current.map(feed => feed.id === existing.id ? payload : feed)
      : [payload, ...current];

    await this.firebaseService.set(`${this.settingsCollection}/${this.rssSettingsDocId}`, { rssFeeds: next });
  }

  async useSavedFeed(url: string) {
    this.rssFeedUrl.set(url);
    this.toastService.success('RSS link loaded into the input.');
  }

  async deleteSavedFeed(id: string) {
    if (!this.authService.canManageContent()) return;
    try {
      const next = this.savedRssFeeds().filter(feed => feed.id !== id);
      await this.firebaseService.set(`${this.settingsCollection}/${this.rssSettingsDocId}`, { rssFeeds: next });
      this.toastService.success('RSS link deleted.');
    } catch (e: any) {
      this.toastService.error('Failed to delete RSS link: ' + (e?.message || 'Unknown error'));
    }
  }

  async convertRssToJson() {
    await this.processRssFeedText(String(this.rssFeedUrl() || '').trim());
  }

  async importRssItems() {
    if (!this.authService.canManageContent()) return;

    const items = this.overviewItems().filter(item => !item.isDuplicate);
    if (!items.length) {
      this.toastService.error('No non-duplicate RSS items found to export.');
      return;
    }

    const uniqueItems: RssJsonItem[] = [];
    const skippedKeys = new Set<string>();

    items.forEach((item) => {
      if (skippedKeys.has(item.sourceKey)) {
        skippedKeys.add(item.sourceKey);
        return;
      }
      uniqueItems.push(item);
      skippedKeys.add(item.sourceKey);
    });

    if (!uniqueItems.length) {
      this.toastService.error('No new RSS items found. Everything in this feed already exists.');
      return;
    }

    this.rssLoading.set(true);
    try {
      const creates = uniqueItems.map((item) => {
        const payload: Partial<News> = {
          title: item.title,
          excerpt: item.excerpt,
          content: item.content,
          imageUrl: item.imageUrl,
          author: item.author,
          publishedDate: item.publishedDate,
          category: item.category,
          isFeatured: false,
          isPublished: false,
          isNewsPageBanner: false,
          sourceKey: item.sourceKey,
          sourceLink: item.link || undefined
        };
        return this.firebaseService.create('news', payload);
      });

      await Promise.all(creates);
      this.toastService.success(`Exported ${uniqueItems.length} non-duplicate RSS item${uniqueItems.length === 1 ? '' : 's'} as draft articles.`);
    } catch (e: any) {
      this.toastService.error('RSS export failed: ' + (e?.message || 'Unknown error'));
    } finally {
      this.rssLoading.set(false);
    }
  }

  async exportNonDuplicatedNews() {
    await this.importRssItems();
  }

  async exportSelectedNews() {
    if (!this.authService.canManageContent()) return;

    const selectedKeys = new Set(this.selectedSourceKeys());
    const selectedItems = this.overviewItems().filter(item => selectedKeys.has(item.sourceKey));
    if (!selectedItems.length) {
      this.toastService.error('Select one or more items first.');
      return;
    }

    const exportableItems = selectedItems.filter(item => !item.isDuplicate);
    const skippedCount = selectedItems.length - exportableItems.length;
    if (!exportableItems.length) {
      this.toastService.error('Selected items are all duplicates.');
      return;
    }

    this.rssLoading.set(true);
    try {
      const creates = exportableItems.map((item) => {
        const payload: Partial<News> = {
          title: item.title,
          excerpt: item.excerpt,
          content: item.content,
          imageUrl: item.imageUrl,
          author: item.author,
          publishedDate: item.publishedDate,
          category: item.category,
          isFeatured: false,
          isPublished: false,
          isNewsPageBanner: false,
          sourceKey: item.sourceKey,
          sourceLink: item.link || undefined
        };
        return this.firebaseService.create('news', payload);
      });

      await Promise.all(creates);
      this.selectedSourceKeys.set([]);
      const skipNote = skippedCount > 0 ? ` Skipped ${skippedCount} duplicate${skippedCount === 1 ? '' : 's'}.` : '';
      this.toastService.success(`Exported ${exportableItems.length} selected item${exportableItems.length === 1 ? '' : 's'} as draft articles.${skipNote}`);
    } catch (e: any) {
      this.toastService.error('RSS export failed: ' + (e?.message || 'Unknown error'));
    } finally {
      this.rssLoading.set(false);
    }
  }

  private async processRssFeedText(feedText: string) {
    if (!this.authService.canManageContent()) return;

    const value = String(feedText || '').trim();
    if (!value) {
      this.toastService.error('Please enter an RSS URL or paste raw RSS XML.');
      return;
    }

    this.rssLoading.set(true);
    this.rssError.set('');
    this.rssJsonPreview.set('');
    this.rssItems.set([]);
    this.selectedSourceKeys.set([]);
    this.showOverview.set(false);

    try {
      if (this.looksLikeXmlFeed(value)) {
        const parsed = this.parseRssXmlFeed(value);
        const items = parsed.items;
        this.rssItems.set(items);
        this.rssJsonPreview.set(JSON.stringify({
          feed: {
            title: parsed.feedTitle,
            link: '',
            description: ''
          },
          items
        }, null, 2));
        this.rssLastConvertedAt.set(new Date().toLocaleString());
        this.openOverviewAfterConversion();
        this.toastService.success('Raw RSS XML converted to JSON.');
        return;
      }

      const endpoint = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(value)}`;
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error(`RSS conversion request failed with status ${response.status}.`);
      }

      const result = await response.json();
      if (result?.status !== 'ok' || !Array.isArray(result?.items)) {
        throw new Error(result?.message || 'Failed to convert RSS feed.');
      }

      const feedTitle = String(result?.feed?.title || 'News').trim();
      const items = this.mapRssItems(result.items, feedTitle);
      this.rssItems.set(items);
      this.rssJsonPreview.set(JSON.stringify({
        feed: {
          title: result?.feed?.title || '',
          link: result?.feed?.link || '',
          description: result?.feed?.description || ''
        },
        items
      }, null, 2));
      this.rssLastConvertedAt.set(new Date().toLocaleString());
      await this.saveRssFeed(value, feedTitle);
      this.openOverviewAfterConversion();
      this.toastService.success('RSS feed converted to JSON.');
    } catch (e: any) {
      const message = e?.message || 'Failed to convert RSS feed.';
      this.rssError.set(message);
      this.toastService.error(message);
    } finally {
      this.rssLoading.set(false);
    }
  }
}
