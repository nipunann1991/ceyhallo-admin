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
  kpis = signal([
    { label: 'Users', route: '/users', countFn: () => this.userCount(), activeCountFn: () => this.userActiveCount(), inactiveCountFn: () => this.userInactiveCount(), icon: 'group', bgClass: 'bg-[#083594]/5', textClass: 'text-[#083594]' },
    { label: 'Restaurants', route: '/businesses', countFn: () => this.restaurantCount(), activeCountFn: () => this.restaurantActiveCount(), inactiveCountFn: () => this.restaurantInactiveCount(), icon: 'restaurant', bgClass: 'bg-[#083594]/5', textClass: 'text-[#083594]' },
    { label: 'Businesses', route: '/businesses', countFn: () => this.businessCount(), activeCountFn: () => this.businessActiveCount(), inactiveCountFn: () => this.businessInactiveCount(), icon: 'store', bgClass: 'bg-[#083594]/5', textClass: 'text-[#083594]' },
    { label: 'Jobs', route: '/jobs', countFn: () => this.jobCount(), activeCountFn: () => this.jobActiveCount(), inactiveCountFn: () => this.jobInactiveCount(), icon: 'work', bgClass: 'bg-[#083594]/5', textClass: 'text-[#083594]' },
    { label: 'Banners', route: '/banners', countFn: () => this.bannerCount(), activeCountFn: () => this.bannerActiveCount(), inactiveCountFn: () => this.bannerInactiveCount(), icon: 'campaign', bgClass: 'bg-[#083594]/5', textClass: 'text-[#083594]' },
    { label: 'Latest Offers', route: '/offers', countFn: () => this.offerCount(), activeCountFn: () => this.offerActiveCount(), inactiveCountFn: () => this.offerInactiveCount(), icon: 'local_offer', bgClass: 'bg-[#083594]/5', textClass: 'text-[#083594]' }
  ]);

  users = signal<any[]>([]);
  restaurants = signal<any[]>([]);
  businesses = signal<any[]>([]);
  jobs = signal<any[]>([]);
  banners = signal<any[]>([]);
  offers = signal<any[]>([]);
  maintenanceMode = signal(false);

  userCount = computed(() => this.users().length);
  restaurantCount = computed(() =>
    this.businesses().filter((b: any) => (b?.category || '').toLowerCase() === 'restaurants').length
  );
  businessCount = computed(() => this.businesses().length);
  jobCount = computed(() => this.jobs().length);
  bannerCount = computed(() => this.banners().length);
  offerCount = computed(() => this.offers().length);

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

  @ViewChild('revenueChart') revenueChartRef!: ElementRef;
  @ViewChild('weeklyChart') weeklyChartRef!: ElementRef;
  @ViewChild('contentDistributionChart') contentDistributionChartRef!: ElementRef;

  private resizeObserver: ResizeObserver | undefined;

  constructor(private firebaseService: FirebaseService) {
    effect(() => {
      this.userCount();
      this.restaurantCount();
      this.businessCount();
      this.jobCount();
      this.bannerCount();
      setTimeout(() => {
        this.drawRevenueChart();
        this.drawWeeklyActivityChart();
        this.drawContentDistributionChart();
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

    this.resizeObserver = new ResizeObserver(() => {
      this.drawRevenueChart();
      this.drawWeeklyActivityChart();
      this.drawContentDistributionChart();
    });
  }

  ngAfterViewInit() {
    if (this.revenueChartRef) this.resizeObserver?.observe(this.revenueChartRef.nativeElement);
    if (this.weeklyChartRef) this.resizeObserver?.observe(this.weeklyChartRef.nativeElement);
    if (this.contentDistributionChartRef) this.resizeObserver?.observe(this.contentDistributionChartRef.nativeElement);
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

  drawRevenueChart() {
    if (!this.revenueChartRef?.nativeElement) return;
    const el = this.revenueChartRef.nativeElement;
    d3.select(el).selectAll('*').remove();

    const width = el.offsetWidth || 800;
    const height = 300;
    const margin = { top: 20, right: 20, bottom: 55, left: 50 };

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
    const margin = { top: 20, right: 20, bottom: 55, left: 45 };

    const data = [
      { day: 'Mon', value: 120 },
      { day: 'Tue', value: 200 },
      { day: 'Wed', value: 150 },
      { day: 'Thu', value: 300 },
      { day: 'Fri', value: 250 },
      { day: 'Sat', value: 400 },
      { day: 'Sun', value: 350 }
    ];

    const x = d3.scaleBand<string>()
      .domain(data.map(d => d.day))
      .range([margin.left, width - margin.right])
      .padding(0.2);

    const y = d3.scaleLinear()
      .domain([0, 500])
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
      .call(d3.axisLeft(y).tickValues([0, 100, 200, 300, 400, 500]).tickSize(0))
      .call(g => g.select('.domain').remove())
      .call(g => g.selectAll('text').attr('fill', '#6b7280').style('font-size', '12px'));

    svg.append('g')
      .selectAll('line')
      .data([0, 100, 200, 300, 400, 500])
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
      .attr('x', d => x(d.day)!)
      .attr('y', d => y(d.value))
      .attr('width', x.bandwidth())
      .attr('height', d => y(0) - y(d.value));
  }

  drawContentDistributionChart() {
    if (!this.contentDistributionChartRef?.nativeElement) return;
    const el = this.contentDistributionChartRef.nativeElement;
    d3.select(el).selectAll('*').remove();

    const width = el.offsetWidth || 400;
    const height = 400;
    const radius = Math.min(width, height) / 2 - 20;    
    const data = [
      { category: 'Restaurants', value: this.restaurantCount() },
      { category: 'Businesses', value: this.businessCount() - this.restaurantCount() },
      { category: 'Jobs', value: this.jobCount() },
      { category: 'Banners', value: this.bannerCount() },
      { category: 'Offers', value: this.offerCount() }
    ];

    const color = d3.scaleOrdinal<string>()
      .domain(data.map(d => d.category))
      .range(['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']);

    const pie = d3.pie<{ category: string; value: number }>()
      .value(d => d.value)
      .sort(null);

    const arc = d3.arc<d3.PieArcDatum<{ category: string; value: number }>>()
      .innerRadius(radius * 0.5)
      .outerRadius(radius);

    const labelArc = d3.arc<d3.PieArcDatum<{ category: string; value: number }>>()
      .innerRadius(radius * 0.7)
      .outerRadius(radius * 0.7);

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

    arcs.append('text')
      .attr('transform', d => `translate(${labelArc.centroid(d)})`)
      .attr('text-anchor', 'middle')
      .attr('alignment-baseline', 'middle')
      .style('font-size', '12px')
      .style('fill', '#fff')
      .text(d => `${d.data.category}: ${d.data.value}`);    
  }
}