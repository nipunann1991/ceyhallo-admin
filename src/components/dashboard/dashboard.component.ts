import { Component, OnInit, signal, computed, effect, ViewChild, ElementRef, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FirebaseService } from '../../services/firebase.service';
import * as d3 from 'd3';

interface KPIConfig {
  label: string;
  route: string;
  countFn: () => number;
  activeCountFn: () => number;
  inactiveCountFn: () => number;
  iconPath: string;
  bgClass: string;
  textClass: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly businessPalette = ['#7dc1ff', '#f97316', '#facc15', '#22c55e', '#ec4899', '#6366f1', '#0ea5e9'];

  kpis = signal([
    { label: 'Users', route: '/users', countFn: () => this.userCount(), activeCountFn: () => this.userActiveCount(), inactiveCountFn: () => this.userInactiveCount(), icon: 'group', bgClass: 'bg-[#083594]/5', textClass: 'text-[#083594]' },
    { label: 'Restaurants', route: '/businesses', countFn: () => this.restaurantCount(), activeCountFn: () => this.restaurantActiveCount(), inactiveCountFn: () => this.restaurantInactiveCount(), icon: 'restaurant', bgClass: 'bg-[#083594]/5', textClass: 'text-[#083594]' },
    { label: 'Businesses', route: '/businesses', countFn: () => this.businessCount(), activeCountFn: () => this.businessActiveCount(), inactiveCountFn: () => this.businessInactiveCount(), icon: 'store', bgClass: 'bg-[#083594]/5', textClass: 'text-[#083594]' },
    { label: 'Jobs', route: '/jobs', countFn: () => this.jobCount(), activeCountFn: () => this.jobActiveCount(), inactiveCountFn: () => this.jobInactiveCount(), icon: 'work', bgClass: 'bg-[#083594]/5', textClass: 'text-[#083594]' },
    { label: 'Banners', route: '/banners', countFn: () => this.bannerActiveCount(), activeCountFn: () => this.bannerActiveCount(), inactiveCountFn: () => this.bannerInactiveCount(), icon: 'campaign', bgClass: 'bg-[#083594]/5', textClass: 'text-[#083594]' },
    { label: 'Latest Offers', route: '/offers', countFn: () => this.offerActiveCount(), activeCountFn: () => this.offerActiveCount(), inactiveCountFn: () => this.offerInactiveCount(), icon: 'local_offer', bgClass: 'bg-[#083594]/5', textClass: 'text-[#083594]' },
    { label: 'Events', route: '/events', countFn: () => this.eventActiveCount(), activeCountFn: () => this.eventActiveCount(), inactiveCountFn: () => this.eventInactiveCount(), icon: 'event', bgClass: 'bg-[#083594]/5', textClass: 'text-[#083594]' }
  ]);

  users = signal<any[]>([]);
  restaurants = signal<any[]>([]);
  businesses = signal<any[]>([]);
  jobs = signal<any[]>([]);
  banners = signal<any[]>([]);
  offers = signal<any[]>([]);
  events = signal<any[]>([]);
  news = signal<any[]>([]);
  maintenanceMode = signal(false);

  userCount = computed(() => this.users().length);
  restaurantCount = computed(() =>
    this.businesses().filter((b: any) => (b?.category || '').toLowerCase() === 'restaurants').length
  );
  businessCount = computed(() => this.businesses().length);
  jobCount = computed(() => this.jobs().length);
  bannerCount = computed(() => this.banners().length);
  offerCount = computed(() => this.offers().length);
  eventCount = computed(() => this.events().length);
  weeklyNewsData = computed(() => this.buildWeeklyNewsData());
  totalManagedRecords = computed(() =>
    this.userCount() +
    this.businessCount() +
    this.jobCount() +
    this.bannerCount() +
    this.offerCount() +
    this.eventCount() +
    this.news().length
  );
  publishedContentCount = computed(() =>
    this.businessActiveCount() +
    this.jobActiveCount() +
    this.bannerActiveCount() +
    this.offerActiveCount() +
    this.eventActiveCount() +
    this.newsPublishedCount()
  );
  unpublishedContentCount = computed(() =>
    this.businessInactiveCount() +
    this.jobInactiveCount() +
    this.bannerInactiveCount() +
    this.offerInactiveCount() +
    this.eventInactiveCount() +
    this.newsDraftCount()
  );
  verifiedBusinessCount = computed(() => this.businesses().filter((b: any) => b?.isVerified === true).length);
  featuredBusinessCount = computed(() => this.businesses().filter((b: any) => b?.isFeatured === true).length);
  premiumBusinessCount = computed(() => this.businesses().filter((b: any) => b?.isPremium === true).length);
  newsPublishedCount = computed(() => this.news().filter((item: any) => item?.isPublished === true).length);
  newsDraftCount = computed(() => this.news().filter((item: any) => item?.isPublished !== true && item?.isArchived !== true).length);
  archivedNewsCount = computed(() => this.news().filter((item: any) => item?.isArchived === true).length);
  newsFeed14DayCount = computed(() => this.countRecentItems(this.news(), ['publishedDate', 'createdDate', 'date'], 14));
  recentNewsCount = computed(() => this.countRecentItems(this.news(), ['publishedDate', 'createdDate', 'date'], 7));
  recentBusinessCount = computed(() => this.countRecentItems(this.businesses(), ['publishedDate', 'createdDate', 'date'], 7));
  recentEventCount = computed(() => this.countRecentItems(this.events(), ['publishedDate', 'createdDate', 'date'], 7));
  activeCampaignCount = computed(() => this.bannerActiveCount() + this.offerActiveCount());
  topBusinessCategory = computed(() => this.getBusinessDistributionData()[0] || null);
  quickStats = computed(() => [
    {
      label: 'Users',
      value: this.userCount(),
      meta: `${this.userActiveCount()} active`,
      tone: 'text-emerald-700',
      bg: 'bg-emerald-50',
      border: 'border-emerald-100'
    },
    {
      label: 'Banners',
      value: this.bannerCount(),
      meta: `${this.bannerActiveCount()} live`,
      tone: 'text-[#083594]',
      bg: 'bg-[#083594]/5',
      border: 'border-[#083594]/10'
    },
    {
      label: 'Campaigns live',
      value: this.activeCampaignCount(),
      meta: `${this.eventActiveCount()} published events`,
      tone: 'text-amber-700',
      bg: 'bg-amber-50',
      border: 'border-amber-100'
    }
  ]);

  userActiveCount = computed(() => this.users().filter((u: any) => this.isActiveStatus(u?.status)).length);
  userInactiveCount = computed(() => this.users().filter((u: any) => !this.isActiveStatus(u?.status)).length);

  restaurantActiveCount = computed(() =>
    this.businesses().filter((b: any) => (b?.category || '').toLowerCase() === 'restaurants' && this.isPublished(b?.isPublished)).length
  );
  restaurantInactiveCount = computed(() =>
    this.businesses().filter((b: any) => (b?.category || '').toLowerCase() === 'restaurants' && !this.isPublished(b?.isPublished)).length
  );

  businessActiveCount = computed(() =>
    this.businesses().filter((b: any) => this.isPublished(b?.isPublished)).length
  );
  businessInactiveCount = computed(() =>
    this.businesses().filter((b: any) => !this.isPublished(b?.isPublished)).length
  );

  jobActiveCount = computed(() => this.jobs().filter((j: any) => this.isPublished(j?.isPublished)).length);
  jobInactiveCount = computed(() => this.jobs().filter((j: any) => !this.isPublished(j?.isPublished)).length);

  bannerActiveCount = computed(() => this.banners().filter((b: any) => b?.isActive === true).length);
  bannerInactiveCount = computed(() => this.banners().filter((b: any) => b?.isActive !== true).length);

  offerActiveCount = computed(() => this.offers().filter((o: any) => o?.isActive === true).length);
  offerInactiveCount = computed(() => this.offers().filter((o: any) => o?.isActive !== true).length);

  eventActiveCount = computed(() => this.events().filter((e: any) => e?.isPublished === true).length);
  eventInactiveCount = computed(() => this.events().filter((e: any) => e?.isPublished !== true).length);

  @ViewChild('revenueChart') revenueChartRef!: ElementRef;
  @ViewChild('weeklyChart') weeklyChartRef!: ElementRef;
  @ViewChild('businessDistributionChart') businessDistributionChartRef!: ElementRef;

  private resizeObserver: ResizeObserver | undefined;

  constructor(private firebaseService: FirebaseService) {
    effect(() => {
      this.userCount();
      this.restaurantCount();
      this.businessCount();
      this.jobCount();
      this.bannerCount();
      this.eventCount();
      this.weeklyNewsData();
      setTimeout(() => {
        this.drawRevenueChart();
        this.drawWeeklyActivityChart();
        this.drawBusinessDistributionChart();
      }, 100);
    });
  }

  ngOnInit() {
    this.firebaseService.listenToPath('users', (data) => this.users.set(data), (e) => console.warn('Dashboard: Users fetch denied', e.code));
    this.firebaseService.listenToPath('restaurants', (data) => this.restaurants.set(data));
    this.firebaseService.listenToPath('businesses', (data) => this.businesses.set(data));
    this.firebaseService.listenToPath('jobs', (data) => this.jobs.set(data));
    this.firebaseService.listenToPath('banners', (data) => this.banners.set(data));
    this.firebaseService.listenToPath('offers', (data) => this.offers.set(data));
    this.firebaseService.listenToPath('events', (data) => this.events.set(data));
    this.firebaseService.listenToPath('news', (data) => this.news.set(data));

    this.resizeObserver = new ResizeObserver(() => {
      this.drawRevenueChart();
      this.drawWeeklyActivityChart();
      this.drawBusinessDistributionChart();
    });
  }

  ngAfterViewInit() {
    if (this.revenueChartRef) this.resizeObserver?.observe(this.revenueChartRef.nativeElement);
    if (this.weeklyChartRef) this.resizeObserver?.observe(this.weeklyChartRef.nativeElement);
    if (this.businessDistributionChartRef) this.resizeObserver?.observe(this.businessDistributionChartRef.nativeElement);
  }

  ngOnDestroy() {
    this.resizeObserver?.disconnect();
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
      const rawDate = item?.publishedDate || item?.createdDate || item?.date;
      const parsed = rawDate ? new Date(rawDate) : null;
      if (!parsed || Number.isNaN(parsed.getTime())) return;
      const key = parsed.toISOString().slice(0, 10);
      counts.set(key, (counts.get(key) || 0) + 1);
    });

    return labels.map(label => ({
      label: label.label,
      value: counts.get(label.key) || 0
    }));
  }

  businessDistributionLegend() {
    return this.getBusinessDistributionData();
  }

  private getBusinessDistributionData() {
    const counts = new Map<string, number>();

    this.businesses().forEach((business: any) => {
      const category = String(business?.category || 'Uncategorized').trim() || 'Uncategorized';
      counts.set(category, (counts.get(category) || 0) + 1);
    });

    const data = Array.from(counts.entries())
      .map(([category, value]) => ({ category, value }))
      .sort((a, b) => b.value - a.value);

    if (data.length === 0) {
      return [{ category: 'No Data', value: 1, color: '#cbd5e1', percentage: 100 }];
    }

    const total = data.reduce((sum, item) => sum + item.value, 0);

    return data.map((item, index) => ({
      ...item,
      color: index === 0 ? '#08358D' : this.businessPalette[(index - 1) % this.businessPalette.length],
      percentage: total ? (item.value / total) * 100 : 0
    }));
  }

  drawRevenueChart() {
    if (!this.revenueChartRef?.nativeElement) return;
    const el = this.revenueChartRef.nativeElement;
    d3.select(el).selectAll('*').remove();

    const width = el.offsetWidth || 800;
    const height = 380;
    const margin = { top: 16, right: 24, bottom: 50, left: 52 };

    const data = [
      { month: 'Jan', revenue: 5000 },
      { month: 'Feb', revenue: 7000 },
      { month: 'Mar', revenue: 6000 },
      { month: 'Apr', revenue: 8000 },
      { month: 'May', revenue: 7500 },
      { month: 'Jun', revenue: 9000 }
    ];

    const x = d3.scalePoint<string>()
      .domain(data.map(d => d.month))
        .range([margin.left, width - margin.right])
      .padding(0.5);

    const y = d3.scaleLinear()
      .domain([0, 11000])
      .range([height - margin.bottom, margin.top]);

    const svg = d3.select(el)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('style', 'max-width:100%;height:auto;');

    svg.append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).tickSize(0))
      .call(g => g.select('.domain').remove())
      .call(g => g.selectAll('text').attr('fill', '#6b7280').style('font-size', '12px'));
    svg.append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).tickValues([0, 2000, 4000, 6000, 8000, 10000]).tickSize(0))
      .call(g => g.select('.domain').remove())
      .call(g => g.selectAll('text').attr('fill', '#6b7280').style('font-size', '12px'));

    // Line generator
    const line = d3.line<{month: string, revenue: number}>()
      .x(d => x(d.month)!)
      .y(d => y(d.revenue))
      .curve(d3.curveMonotoneX);

    // Area generator  
    const area = d3.area<{month: string, revenue: number}>()
      .x(d => x(d.month)!)
      .y0(d => y(0))
      .y1(d => y(d.revenue))
      .curve(d3.curveMonotoneX);

    // Draw area fill
    svg.append('path')
      .datum(data)
      .attr('fill', '#083594')
      .attr('fill-opacity', 0.1)
      .attr('d', area);

    // Draw line
    svg.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#083594')
      .attr('stroke-width', 3)
      .attr('stroke-linecap', 'round')
      .attr('stroke-linejoin', 'round')
      .attr('d', line);

    // Draw data points
    svg.append('g')
      .selectAll('circle')
      .data(data)
      .join('circle')
      .attr('cx', d => x(d.month)!)
      .attr('cy', d => y(d.revenue))
      .attr('r', 5)
      .attr('fill', '#083594')
      .attr('stroke', 'white')
      .attr('stroke-width', 2);
  }

  drawWeeklyActivityChart() {
    
    if (!this.weeklyChartRef?.nativeElement) return;
    const el = this.weeklyChartRef.nativeElement;
    d3.select(el).selectAll('*').remove();

    const width = el.offsetWidth || 800;
    const height = 360;
    const margin = { top: 20, right: 20, bottom: 65, left: 45 };

    const data = this.weeklyNewsData();

    const x = d3.scaleBand<string>()
      .domain(data.map(d => d.label))
      .range([margin.left, width - margin.right])
      .padding(0.16);

    const y = d3.scaleLinear()
      .domain([0, Math.max(5, d3.max(data, d => d.value) || 0)])
      .range([height - margin.bottom, margin.top]);

    const svg = d3.select(el)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('style', 'max-width:100%;height:auto;');

    svg.append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).tickSize(0))
      .call(g => g.select('.domain').remove())
      .call(g => g.selectAll('text').attr('fill', '#6b7280').style('font-size', '11px').attr('transform', 'translate(0,5)'));

    svg.append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(5).tickSize(0))
      .call(g => g.select('.domain').remove())
      .call(g => g.selectAll('text').attr('fill', '#6b7280').style('font-size', '12px'));

    svg.append('g')
      .selectAll('line')
      .data(y.ticks(5))
      .join('line')
      .attr('x1', margin.left)  
      .attr('x2', width - margin.right)
      .attr('y1', d => y(d))
      .attr('y2', d => y(d))
      .attr('stroke', '#e5e7eb')
      .attr('stroke-dasharray', '4,4');

    svg.append('g')
      .attr('fill', '#083594')
      .selectAll('rect')
      .data(data)
      .join('rect')
      .attr('x', d => x(d.label)!)
      .attr('y', d => y(d.value))
      .attr('width', x.bandwidth())
      .attr('height', d => y(0) - y(d.value));

    svg.append('g')
      .selectAll('text')
      .data(data)
      .join('text')
      .attr('x', d => (x(d.label)! + x.bandwidth() / 2))
      .attr('y', d => y(d.value) - 8)
      .attr('text-anchor', 'middle')
      .attr('fill', '#475569')
      .style('font-size', '11px')
      .style('font-weight', '600')
      .text(d => d.value);
  }

  drawBusinessDistributionChart() {
    if (!this.businessDistributionChartRef?.nativeElement) return;
    const el = this.businessDistributionChartRef.nativeElement;
    d3.select(el).selectAll('*').remove();

    const width = el.offsetWidth || 800;
    const height = 290;
    const radius = Math.min(width, height) / 2 - 18;
    const distribution = this.getBusinessDistributionData();
    const color = d3.scaleOrdinal<string>()
      .domain(distribution.map(d => d.category))
      .range(distribution.map(d => d.color));

    const data = distribution;

    const pie = d3.pie<{ category: string; value: number }>()
      .value(d => d.value)
      .sort(null);

    const arc = d3.arc<d3.PieArcDatum<{ category: string; value: number }>>()
      .innerRadius(radius * 0.75)
      .outerRadius(radius);
    const labelArc = d3.arc<d3.PieArcDatum<{ category: string; value: number }>>()
      .innerRadius(radius * 0.74)
      .outerRadius(radius * 0.74);

    const svg = d3.select(el)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('style', 'max-width:100%;height:auto;')
      .append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`);

 

    const arcs = svg.selectAll('.arc')
      .data(pie(data))
      .join('g')
      .attr('class', 'arc');

    arcs.append('path')
      .attr('d', arc as any)
      .attr('fill', d => color(d.data.category) as string)
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    const total = data.reduce((sum, item) => sum + item.value, 0);

    arcs.append('text')
      .attr('transform', d => `translate(${labelArc.centroid(d)})`)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .style('font-size', '11px')
      .style('font-weight', '600')
      .style('fill', '#64748b')
      .text(d => (d.data.value / total) >= 0.1 ? `${d.data.value}` : '');

  }
}
