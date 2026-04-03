import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FirebaseService } from '../../services/firebase.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { News } from '../../models/news.model';

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
  template: `
<div class="space-y-6">
  <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
    <div class="flex items-center gap-3">
      <a routerLink="/news" class="p-2 rounded-full hover:bg-slate-200 text-[#083594] hover:text-[#062a71] transition-colors" aria-label="Back to news">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
      </a>
      <div>
        <h2 class="text-2xl font-bold text-slate-800">RSS URL to JSON</h2>
        <p class="text-slate-500 text-sm">Convert RSS feeds into news drafts with a clean two-column review flow.</p>
      </div>
    </div>
  </div>

  @if (!authService.isAdmin()) {
    <div class="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      You can view this page, but converting, saving links, and exporting items are admin-only.
    </div>
  }

  <div class="grid gap-5 xl:grid-cols-[40%_60%]">
    <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:sticky xl:top-6 xl:self-start">
      <div class="border-b border-slate-200 bg-slate-50/80 px-5 py-4">
        <div class="flex items-start gap-3">
          <div class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#083594] text-sm font-semibold text-white">1</div>
          <div>
            <h3 class="text-base font-semibold text-slate-900">Paste RSS link</h3>
            <p class="text-sm text-slate-500">Use a saved feed or paste a new link to convert.</p>
          </div>
        </div>
      </div>

      <div class="space-y-5 p-5">
          <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <label class="mb-2 block text-sm font-medium text-slate-700">RSS feed URL or raw RSS XML</label>
          <div class="space-y-3">
            <textarea
              [value]="rssFeedUrl()"
              (input)="updateRssUrl($event)"
              rows="7"
              placeholder="https://example.com/feed.xml or paste raw RSS XML here"
              class="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm shadow-sm focus:border-[#083594] focus:ring-2 focus:ring-[#083594]/20"></textarea>
            <div class="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                (click)="convertRssToJson()"
                [disabled]="rssLoading() || !rssFeedUrl().trim()"
                class="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#083594] px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#062a71] disabled:cursor-not-allowed disabled:opacity-50">
                @if (rssLoading()) {
                  Converting...
                } @else {
                  Convert to JSON
                }
              </button>
              <button
                type="button"
                (click)="pasteAndConvertRssUrl()"
                [disabled]="rssLoading()"
                class="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
                Paste & Convert
              </button>
              <button
                type="button"
                (click)="copyRssUrl()"
                [disabled]="rssLoading() || !rssFeedUrl().trim()"
                class="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
                Copy
              </button>
              <button
                type="button"
                (click)="clearRssUrl()"
                [disabled]="rssLoading() && !rssFeedUrl().trim()"
                class="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
                Clear
              </button>
            </div>
          </div>
          <p class="mt-2 text-xs text-slate-500">The feed URL is saved under Settings so you can reuse it later.</p>
        </div>

        @if (savedRssFeeds().length > 0) {
          <div class="rounded-2xl border border-slate-200">
            <div class="border-b border-slate-200 bg-white px-4 py-3">
              <h4 class="text-sm font-semibold text-slate-900">Saved RSS links</h4>
              <p class="text-xs text-slate-500">Tap one to paste it back into the box.</p>
            </div>
            <div class="divide-y divide-slate-100">
              @for (feed of savedRssFeeds(); track feed.id) {
                <div class="flex items-start justify-between gap-3 px-4 py-3">
                  <div class="min-w-0">
                    <button type="button" (click)="useSavedFeed(feed.url)" class="group text-left">
                      <div class="truncate text-sm font-medium text-slate-900 group-hover:text-[#083594]">{{ feed.title || 'RSS Feed' }}</div>
                      <div class="truncate text-sm text-slate-500">{{ feed.url }}</div>
                    </button>
                    <div class="mt-1 text-xs text-slate-400">
                      Saved {{ feed.createdAt | date:'mediumDate' }}
                      @if (feed.lastUsedAt) {
                        <span> · Last used {{ feed.lastUsedAt | date:'mediumDate' }}</span>
                      }
                    </div>
                  </div>
                  <button
                    type="button"
                    (click)="deleteSavedFeed(feed.id)"
                    class="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                    title="Delete saved link">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                  </button>
                </div>
              }
            </div>
          </div>
        }

        @if (rssError()) {
          <div class="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {{ rssError() }}
          </div>
        }

        @if (rssLastConvertedAt()) {
          <div class="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span class="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">Last converted: {{ rssLastConvertedAt() }}</span>
            <span class="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">{{ rssCount() }} items found</span>
          </div>
        }

        @if (rssJsonPreview()) {
          <div class="rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden">
            <div class="border-b border-slate-200 bg-white px-4 py-3">
              <h4 class="text-sm font-semibold text-slate-900">JSON output</h4>
              <p class="text-xs text-slate-500">This is the parsed feed data that will be reviewed before export.</p>
            </div>
            <pre class="max-h-[38vh] overflow-auto p-4 text-xs leading-6 text-slate-100 bg-slate-950">{{ rssJsonPreview() }}</pre>
          </div>
        }
      </div>
    </section>

    <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div class="border-b border-slate-200 bg-slate-50/80 px-5 py-4">
        <div class="flex flex-col gap-4">
          <div class="flex items-start gap-3">
            <div class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#083594] text-sm font-semibold text-white">2</div>
            <div>
              <h3 class="text-base font-semibold text-slate-900">News overview</h3>
              <p class="text-sm text-slate-500">
                {{ rssCount() }} item{{ rssCount() === 1 ? '' : 's' }} loaded, {{ duplicateOverviewCount() }} duplicate{{ duplicateOverviewCount() === 1 ? '' : 's' }}, {{ nonDuplicateOverviewCount() }} ready to export.
              </p>
            </div>
          </div>
          <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div class="flex flex-wrap items-center gap-3">
              <label class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  class="h-4 w-4 rounded border-slate-300 text-[#083594] focus:ring-[#083594]"
                  [checked]="areAllVisibleSelected()"
                  [indeterminate]="selectedOverviewCount() > 0 && !areAllVisibleSelected()"
                  (change)="toggleAllVisibleOverviewSelection($any($event.target).checked)">
                Select visible
              </label>
              <button
                type="button"
                (click)="toggleHideDuplicates()"
                class="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors"
                [class.bg-amber-50]="hideDuplicates()"
                [class.text-amber-800]="hideDuplicates()"
                [class.border-amber-200]="hideDuplicates()"
                [class.bg-white]="!hideDuplicates()"
                [class.text-slate-700]="!hideDuplicates()"
                [class.border-slate-200]="!hideDuplicates()"
                [class.hover:bg-slate-50]="!hideDuplicates()">
                <span
                  class="h-2.5 w-2.5 rounded-full transition-colors"
                  [class.bg-amber-500]="hideDuplicates()"
                  [class.bg-slate-300]="!hideDuplicates()"></span>
                @if (hideDuplicates()) {
                  Hide duplicates: On
                } @else {
                  Hide duplicates: Off
                }
              </button>
            </div>

            <div class="flex flex-wrap items-center gap-3">
              <button
                type="button"
                (click)="exportSelectedNews()"
                [disabled]="rssLoading() || selectedOverviewCount() === 0"
                class="inline-flex items-center justify-center gap-2 rounded-xl border border-[#083594] bg-white px-4 py-2.5 text-sm font-semibold text-[#083594] shadow-sm transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50">
                Export selected
              </button>
              <button
                type="button"
                (click)="exportNonDuplicatedNews()"
                [disabled]="rssLoading() || nonDuplicateOverviewCount() === 0"
                class="inline-flex items-center justify-center gap-2 rounded-xl bg-[#083594] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#062a71] disabled:cursor-not-allowed disabled:opacity-50">
                Export non-duplicates
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="space-y-4 p-5">
        @if (rssItems().length > 0) {
          @for (item of visibleOverviewItems(); track item.sourceKey; let i = $index) {
            <article class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div class="grid grid-cols-1 gap-4 p-4 lg:grid-cols-[180px_1fr]">
                <div class="h-40 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 bg-center bg-no-repeat lg:h-[140px] lg:w-[180px]" style="background-image: url('https://i.ibb.co/nNsGtRqn/placeholder-80x80.png'); background-size: 40px;">
                  @if (item.imageUrl) {
                    <img [src]="item.imageUrl" alt="" class="h-full w-full object-cover bg-white" onerror="this.style.display='none'">
                  }
                </div>

                <div class="min-w-0">
                  <div class="flex items-start justify-between gap-3">
                    <div class="flex min-w-0 items-start gap-3">
                      <input
                        type="checkbox"
                        class="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-[#083594] focus:ring-[#083594]"
                        [checked]="isOverviewItemSelected(item.sourceKey)"
                        (change)="toggleOverviewSelection(item.sourceKey, $any($event.target).checked)">
                      <div class="min-w-0">
                      <h4 class="text-lg font-bold leading-6 text-slate-900 line-clamp-2">{{ item.title }}</h4>
                      <div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span>{{ item.publishedDate | date:'mediumDate' }}</span>
                        <span class="h-1 w-1 rounded-full bg-slate-300"></span>
                        <span>{{ item.author }}</span>
                        <span class="h-1 w-1 rounded-full bg-slate-300"></span>
                        <span>{{ item.category }}</span>
                      </div>
                      <div class="mt-3 text-sm leading-6 text-slate-600 line-clamp-2" [innerHTML]="item.excerpt"></div>
                      @if (item.isDuplicate) {
                        <div class="mt-3 inline-flex items-center gap-2 rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
                          <span class="h-1.5 w-1.5 rounded-full bg-red-500"></span>
                          Duplicate
                        </div>
                      }
                    </div>
                    </div>

                    <button
                      type="button"
                      (click)="toggleItemExpanded(i)"
                      class="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:bg-blue-50 hover:text-[#083594]"
                      [attr.aria-expanded]="isItemExpanded(i)">
                      <svg xmlns="http://www.w3.org/2000/svg" class="transition-transform duration-200" [class.rotate-180]="isItemExpanded(i)" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                    </button>
                  </div>

                  @if (isItemExpanded(i)) {
                    <div class="mt-4 space-y-3 border-t border-slate-100 pt-4">
                      <div class="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                        <div class="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <div class="text-xs font-semibold uppercase tracking-wide text-slate-500">Description</div>
                          <div class="mt-1 leading-6 text-slate-800" [innerHTML]="item.content"></div>
                        </div>
                        <div class="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 space-y-2">
                          @if (item.link) {
                            <div>
                              <div class="text-xs font-semibold uppercase tracking-wide text-slate-500">Link</div>
                              <a [href]="item.link" target="_blank" rel="noopener noreferrer" class="break-all text-[#083594] hover:underline">{{ item.link }}</a>
                            </div>
                          }
                          <div>
                            <div class="text-xs font-semibold uppercase tracking-wide text-slate-500">Excerpt</div>
                            <div class="leading-6 text-slate-800">{{ item.excerpt }}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  }
                </div>
              </div>
            </article>
          }
        } @else {
          <div class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10">
            <h4 class="text-base font-semibold text-slate-900">No news items yet</h4>
            <p class="mt-2 text-sm leading-6 text-slate-500">
              Convert the RSS URL on the left to populate this overview. Once items appear, duplicates and export controls will become active here.
            </p>
          </div>
        }
      </div>

    </section>
  </div>
</div>
  `
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
    if (!this.authService.isAdmin()) return;
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
    if (!this.authService.isAdmin()) return;

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
    if (!this.authService.isAdmin()) return;

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
    if (!this.authService.isAdmin()) return;

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
