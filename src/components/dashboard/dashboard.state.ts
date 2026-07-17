import { Injectable, computed, signal } from '@angular/core';

export interface DashboardKpi {
  label: string;
  route: string;
  countFn: () => number;
  activeCountFn: () => number;
  inactiveCountFn: () => number;
  icon: string;
  bgClass: string;
  textClass: string;
}

@Injectable({ providedIn: 'root' })
export class DashboardState {
  readonly businessPalette = ['#083594', '#b0e0ca', '#f9e286', '#ffa86c', '#f274b2', '#9ea0ed', '#7dc8ea', '#78b6c5', '#b99ce2'];

  readonly users = signal<any[]>([]);
  readonly restaurants = signal<any[]>([]);
  readonly businesses = signal<any[]>([]);
  readonly jobs = signal<any[]>([]);
  readonly banners = signal<any[]>([]);
  readonly offers = signal<any[]>([]);
  readonly events = signal<any[]>([]);
  readonly news = signal<any[]>([]);
  readonly maintenanceMode = signal(false);

  readonly userCount = computed(() => this.users().length);
  readonly restaurantCount = computed(() =>
    this.businesses().filter((b: any) => (b?.category || '').toLowerCase() === 'restaurants').length
  );
  readonly businessCount = computed(() => this.businesses().length);
  readonly jobCount = computed(() => this.jobs().length);
  readonly bannerCount = computed(() => this.banners().length);
  readonly offerCount = computed(() => this.offers().length);
  readonly eventCount = computed(() => this.events().length);
  readonly weeklyNewsData = computed(() => this.buildWeeklyNewsData());
  readonly totalManagedRecords = computed(() =>
    this.userCount() +
    this.businessCount() +
    this.jobCount() +
    this.bannerCount() +
    this.offerCount() +
    this.eventCount() +
    this.news().length
  );
  readonly publishedContentCount = computed(() =>
    this.businessActiveCount() +
    this.jobActiveCount() +
    this.bannerActiveCount() +
    this.offerActiveCount() +
    this.eventActiveCount() +
    this.newsPublishedCount()
  );
  readonly unpublishedContentCount = computed(() =>
    this.businessInactiveCount() +
    this.jobInactiveCount() +
    this.bannerInactiveCount() +
    this.offerInactiveCount() +
    this.eventInactiveCount() +
    this.newsDraftCount()
  );
  readonly verifiedBusinessCount = computed(() => this.businesses().filter((b: any) => b?.isVerified === true).length);
  readonly featuredBusinessCount = computed(() => this.businesses().filter((b: any) => b?.isFeatured === true).length);
  readonly premiumBusinessCount = computed(() => this.businesses().filter((b: any) => b?.isPremium === true).length);
  readonly newsPublishedCount = computed(() => this.news().filter((item: any) => item?.isPublished === true).length);
  readonly newsDraftCount = computed(() => this.news().filter((item: any) => item?.isPublished !== true && item?.isArchived !== true).length);
  readonly archivedNewsCount = computed(() => this.news().filter((item: any) => item?.isArchived === true).length);
  readonly newsFeed14DayCount = computed(() => this.countRecentItems(this.news().filter((item: any) => item?.isPublished === true), ['publishedDate', 'createdDate', 'date'], 14));
  readonly recentNewsCount = computed(() => this.countRecentItems(this.news(), ['publishedDate', 'createdDate', 'date'], 7));
  readonly recentBusinessCount = computed(() => this.countRecentItems(this.businesses(), ['publishedDate', 'createdDate', 'date'], 7));
  readonly recentEventCount = computed(() => this.countRecentItems(this.events(), ['publishedDate', 'createdDate', 'date'], 7));
  readonly activeCampaignCount = computed(() => this.bannerActiveCount() + this.offerActiveCount());
  readonly topBusinessCategory = computed(() => this.getBusinessDistributionData()[0] || null);
  readonly userActiveCount = computed(() => this.users().filter((u: any) => this.isActiveStatus(u?.status)).length);
  readonly userInactiveCount = computed(() => this.users().filter((u: any) => !this.isActiveStatus(u?.status)).length);
  readonly restaurantActiveCount = computed(() =>
    this.businesses().filter((b: any) => (b?.category || '').toLowerCase() === 'restaurants' && this.isPublished(b?.isPublished)).length
  );
  readonly restaurantInactiveCount = computed(() =>
    this.businesses().filter((b: any) => (b?.category || '').toLowerCase() === 'restaurants' && !this.isPublished(b?.isPublished)).length
  );
  readonly businessActiveCount = computed(() => this.businesses().filter((b: any) => this.isPublished(b?.isPublished)).length);
  readonly businessInactiveCount = computed(() => this.businesses().filter((b: any) => !this.isPublished(b?.isPublished)).length);
  readonly jobActiveCount = computed(() => this.jobs().filter((j: any) => this.isPublished(j?.isPublished)).length);
  readonly jobInactiveCount = computed(() => this.jobs().filter((j: any) => !this.isPublished(j?.isPublished)).length);
  readonly bannerActiveCount = computed(() => this.banners().filter((b: any) => b?.isActive === true).length);
  readonly bannerInactiveCount = computed(() => this.banners().filter((b: any) => b?.isActive !== true).length);
  readonly offerActiveCount = computed(() => this.offers().filter((o: any) => o?.isActive === true).length);
  readonly offerInactiveCount = computed(() => this.offers().filter((o: any) => o?.isActive !== true).length);
  readonly eventActiveCount = computed(() => this.events().filter((e: any) => e?.isPublished === true).length);
  readonly eventInactiveCount = computed(() => this.events().filter((e: any) => e?.isPublished !== true).length);

  readonly kpis = signal<DashboardKpi[]>([
    { label: 'Users', route: '/users', countFn: () => this.userCount(), activeCountFn: () => this.userActiveCount(), inactiveCountFn: () => this.userInactiveCount(), icon: 'group', bgClass: 'bg-[#083594]/5', textClass: 'text-[#083594]' },
    { label: 'Restaurants', route: '/businesses', countFn: () => this.restaurantCount(), activeCountFn: () => this.restaurantActiveCount(), inactiveCountFn: () => this.restaurantInactiveCount(), icon: 'restaurant', bgClass: 'bg-[#083594]/5', textClass: 'text-[#083594]' },
    { label: 'Businesses', route: '/businesses', countFn: () => this.businessCount(), activeCountFn: () => this.businessActiveCount(), inactiveCountFn: () => this.businessInactiveCount(), icon: 'store', bgClass: 'bg-[#083594]/5', textClass: 'text-[#083594]' },
    { label: 'Jobs', route: '/jobs', countFn: () => this.jobCount(), activeCountFn: () => this.jobActiveCount(), inactiveCountFn: () => this.jobInactiveCount(), icon: 'work', bgClass: 'bg-[#083594]/5', textClass: 'text-[#083594]' },
    { label: 'Banners', route: '/banners', countFn: () => this.bannerActiveCount(), activeCountFn: () => this.bannerActiveCount(), inactiveCountFn: () => this.bannerInactiveCount(), icon: 'campaign', bgClass: 'bg-[#083594]/5', textClass: 'text-[#083594]' },
    { label: 'Latest Offers', route: '/offers', countFn: () => this.offerActiveCount(), activeCountFn: () => this.offerActiveCount(), inactiveCountFn: () => this.offerInactiveCount(), icon: 'local_offer', bgClass: 'bg-[#083594]/5', textClass: 'text-[#083594]' },
    { label: 'Events', route: '/events', countFn: () => this.eventActiveCount(), activeCountFn: () => this.eventActiveCount(), inactiveCountFn: () => this.eventInactiveCount(), icon: 'event', bgClass: 'bg-[#083594]/5', textClass: 'text-[#083594]' }
  ]);

  readonly quickStats = computed(() => [
    { label: 'Users', value: this.userCount(), meta: `${this.userActiveCount()} active`, route: '/users', tone: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-100' },
    { label: 'Banners', value: this.bannerCount(), meta: `${this.bannerActiveCount()} live`, route: '/banners', tone: 'text-[#083594]', bg: 'bg-[#083594]/5', border: 'border-[#083594]/10' },
    { label: 'Campaigns live', value: this.activeCampaignCount(), meta: `${this.eventActiveCount()} published events`, route: '/notifications', tone: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-100' }
  ]);

  setUsers(data: any[]) { this.users.set(data); }
  setRestaurants(data: any[]) { this.restaurants.set(data); }
  setBusinesses(data: any[]) { this.businesses.set(data); }
  setJobs(data: any[]) { this.jobs.set(data); }
  setBanners(data: any[]) { this.banners.set(data); }
  setOffers(data: any[]) { this.offers.set(data); }
  setEvents(data: any[]) { this.events.set(data); }
  setNews(data: any[]) { this.news.set(data); }

  businessDistributionLegend() {
    return this.getBusinessDistributionData();
  }

  private isActiveStatus(status: any): boolean {
    return String(status ?? '').toLowerCase() === 'active';
  }

  private isPublished(value: any): boolean {
    return value === true;
  }

  private countRecentItems(items: any[], dateFields: string[], days: number) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - Math.max(0, days - 1));
    cutoff.setHours(0, 0, 0, 0);

    return items.filter((item: any) => {
      const rawDate = dateFields.map(field => item?.[field]).find(Boolean);
      if (!rawDate) return false;
      const parsed = new Date(rawDate);
      return !Number.isNaN(parsed.getTime()) && parsed >= cutoff;
    }).length;
  }

  private buildWeeklyNewsData() {
    const today = new Date();
    const labels = Array.from({ length: 14 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (13 - index));
      return {
        key: date.toISOString().slice(0, 10),
        label: date.toLocaleDateString('en-US', { day: '2-digit', month: 'short' })
      };
    });

    const counts = new Map<string, number>();
    this.news().forEach((item: any) => {
      if (item?.isPublished !== true) return;
      const rawDate = item?.publishedDate || item?.createdDate || item?.date;
      const parsed = rawDate ? new Date(rawDate) : null;
      if (!parsed || Number.isNaN(parsed.getTime())) return;
      const key = parsed.toISOString().slice(0, 10);
      counts.set(key, (counts.get(key) || 0) + 1);
    });

    return labels.map(label => ({ label: label.label, value: counts.get(label.key) || 0 }));
  }

  private getBusinessDistributionData() {
    const counts = new Map<string, number>();

    this.businesses().forEach((business: any) => {
      const category = String(business?.category || 'Uncategorized').trim() || 'Uncategorized';
      counts.set(category, (counts.get(category) || 0) + 1);
    });

    const total = Math.max(1, Array.from(counts.values()).reduce((sum, value) => sum + value, 0));

    const sortedCategories = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
    const topCategories = sortedCategories.slice(0, 9);
    const otherCount = sortedCategories.slice(9).reduce((sum, [, value]) => sum + value, 0);
    const categories = otherCount > 0 ? [...topCategories, ['Other', otherCount] as [string, number]] : topCategories;

    return categories.map(([category, value], index) => ({
        category,
        value,
        percentage: (value / total) * 100,
        color: category === 'Other' ? '#94a3b8' : this.businessPalette[index],
        isOther: category === 'Other'
      }));
  }
}
