var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Component, signal, computed, effect, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import * as d3 from 'd3';
let DashboardComponent = class DashboardComponent {
    constructor(firebaseService) {
        this.firebaseService = firebaseService;
        this.businessPalette = ['#1976d2', '#f57c00', '#ffd54f', '#455a64', '#90a4ae', '#64b5f6', '#0f766e', '#db2777'];
        this.kpis = signal([
            { label: 'Users', route: '/users', countFn: () => this.userCount(), activeCountFn: () => this.userActiveCount(), inactiveCountFn: () => this.userInactiveCount(), icon: 'group', bgClass: 'bg-[#083594]/5', textClass: 'text-[#083594]' },
            { label: 'Restaurants', route: '/businesses', countFn: () => this.restaurantCount(), activeCountFn: () => this.restaurantActiveCount(), inactiveCountFn: () => this.restaurantInactiveCount(), icon: 'restaurant', bgClass: 'bg-[#083594]/5', textClass: 'text-[#083594]' },
            { label: 'Businesses', route: '/businesses', countFn: () => this.businessCount(), activeCountFn: () => this.businessActiveCount(), inactiveCountFn: () => this.businessInactiveCount(), icon: 'store', bgClass: 'bg-[#083594]/5', textClass: 'text-[#083594]' },
            { label: 'Jobs', route: '/jobs', countFn: () => this.jobCount(), activeCountFn: () => this.jobActiveCount(), inactiveCountFn: () => this.jobInactiveCount(), icon: 'work', bgClass: 'bg-[#083594]/5', textClass: 'text-[#083594]' },
            { label: 'Banners', route: '/banners', countFn: () => this.bannerActiveCount(), activeCountFn: () => this.bannerActiveCount(), inactiveCountFn: () => this.bannerInactiveCount(), icon: 'campaign', bgClass: 'bg-[#083594]/5', textClass: 'text-[#083594]' },
            { label: 'Latest Offers', route: '/offers', countFn: () => this.offerActiveCount(), activeCountFn: () => this.offerActiveCount(), inactiveCountFn: () => this.offerInactiveCount(), icon: 'local_offer', bgClass: 'bg-[#083594]/5', textClass: 'text-[#083594]' },
            { label: 'Events', route: '/events', countFn: () => this.eventActiveCount(), activeCountFn: () => this.eventActiveCount(), inactiveCountFn: () => this.eventInactiveCount(), icon: 'event', bgClass: 'bg-[#083594]/5', textClass: 'text-[#083594]' }
        ]);
        this.users = signal([]);
        this.restaurants = signal([]);
        this.businesses = signal([]);
        this.jobs = signal([]);
        this.banners = signal([]);
        this.offers = signal([]);
        this.events = signal([]);
        this.news = signal([]);
        this.maintenanceMode = signal(false);
        this.userCount = computed(() => this.users().length);
        this.restaurantCount = computed(() => this.businesses().filter((b) => (b?.category || '').toLowerCase() === 'restaurants').length);
        this.businessCount = computed(() => this.businesses().length);
        this.jobCount = computed(() => this.jobs().length);
        this.bannerCount = computed(() => this.banners().length);
        this.offerCount = computed(() => this.offers().length);
        this.eventCount = computed(() => this.events().length);
        this.weeklyNewsData = computed(() => this.buildWeeklyNewsData());
        this.userActiveCount = computed(() => this.users().filter((u) => this.isActiveStatus(u?.status)).length);
        this.userInactiveCount = computed(() => this.users().filter((u) => !this.isActiveStatus(u?.status)).length);
        this.restaurantActiveCount = computed(() => this.businesses().filter((b) => (b?.category || '').toLowerCase() === 'restaurants' && this.isPublished(b?.isPublished)).length);
        this.restaurantInactiveCount = computed(() => this.businesses().filter((b) => (b?.category || '').toLowerCase() === 'restaurants' && !this.isPublished(b?.isPublished)).length);
        this.businessActiveCount = computed(() => this.businesses().filter((b) => this.isPublished(b?.isPublished)).length);
        this.businessInactiveCount = computed(() => this.businesses().filter((b) => !this.isPublished(b?.isPublished)).length);
        this.jobActiveCount = computed(() => this.jobs().filter((j) => this.isPublished(j?.isPublished)).length);
        this.jobInactiveCount = computed(() => this.jobs().filter((j) => !this.isPublished(j?.isPublished)).length);
        this.bannerActiveCount = computed(() => this.banners().filter((b) => b?.isActive === true).length);
        this.bannerInactiveCount = computed(() => this.banners().filter((b) => b?.isActive !== true).length);
        this.offerActiveCount = computed(() => this.offers().filter((o) => o?.isActive === true).length);
        this.offerInactiveCount = computed(() => this.offers().filter((o) => o?.isActive !== true).length);
        this.eventActiveCount = computed(() => this.events().filter((e) => e?.isPublished === true).length);
        this.eventInactiveCount = computed(() => this.events().filter((e) => e?.isPublished !== true).length);
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
        if (this.revenueChartRef)
            this.resizeObserver?.observe(this.revenueChartRef.nativeElement);
        if (this.weeklyChartRef)
            this.resizeObserver?.observe(this.weeklyChartRef.nativeElement);
        if (this.businessDistributionChartRef)
            this.resizeObserver?.observe(this.businessDistributionChartRef.nativeElement);
    }
    ngOnDestroy() {
        this.resizeObserver?.disconnect();
    }
    isActiveStatus(status) {
        return String(status ?? '').toLowerCase() === 'active';
    }
    isPublished(value) {
        return value === true;
    }
    buildWeeklyNewsData() {
        const today = new Date();
        const labels = Array.from({ length: 14 }, (_, index) => {
            const date = new Date(today);
            date.setDate(today.getDate() - (13 - index));
            return {
                key: date.toISOString().slice(0, 10),
                label: date.toLocaleDateString('en-US', { day: '2-digit', month: 'short' })
            };
        });
        const counts = new Map();
        this.news().forEach((item) => {
            const rawDate = item?.publishedDate || item?.createdDate || item?.date;
            const parsed = rawDate ? new Date(rawDate) : null;
            if (!parsed || Number.isNaN(parsed.getTime()))
                return;
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
    getBusinessDistributionData() {
        const counts = new Map();
        this.businesses().forEach((business) => {
            const category = String(business?.category || 'Uncategorized').trim() || 'Uncategorized';
            counts.set(category, (counts.get(category) || 0) + 1);
        });
        const data = Array.from(counts.entries())
            .map(([category, value]) => ({ category, value }))
            .sort((a, b) => b.value - a.value)
            .map((item, index) => ({
            ...item,
            color: index === 0 ? '#08358D' : this.businessPalette[(index - 1) % this.businessPalette.length]
        }));
        if (data.length === 0) {
            return [{ category: 'No Data', value: 1, color: '#cbd5e1' }];
        }
        return data;
    }
    drawRevenueChart() {
        if (!this.revenueChartRef?.nativeElement)
            return;
        const el = this.revenueChartRef.nativeElement;
        d3.select(el).selectAll('*').remove();
        const width = el.offsetWidth || 800;
        const height = 340;
        const margin = { top: 12, right: 18, bottom: 42, left: 48 };
        const data = [
            { month: 'Jan', revenue: 5000 },
            { month: 'Feb', revenue: 7000 },
            { month: 'Mar', revenue: 6000 },
            { month: 'Apr', revenue: 8000 },
            { month: 'May', revenue: 7500 },
            { month: 'Jun', revenue: 9000 }
        ];
        const x = d3.scalePoint()
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
        const line = d3.line()
            .x(d => x(d.month))
            .y(d => y(d.revenue))
            .curve(d3.curveMonotoneX);
        // Area generator  
        const area = d3.area()
            .x(d => x(d.month))
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
            .attr('cx', d => x(d.month))
            .attr('cy', d => y(d.revenue))
            .attr('r', 5)
            .attr('fill', '#083594')
            .attr('stroke', 'white')
            .attr('stroke-width', 2);
    }
    drawWeeklyActivityChart() {
        if (!this.weeklyChartRef?.nativeElement)
            return;
        const el = this.weeklyChartRef.nativeElement;
        d3.select(el).selectAll('*').remove();
        const width = el.offsetWidth || 800;
        const height = 360;
        const margin = { top: 20, right: 20, bottom: 65, left: 45 };
        const data = this.weeklyNewsData();
        const x = d3.scaleBand()
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
            .attr('x', d => x(d.label))
            .attr('y', d => y(d.value))
            .attr('width', x.bandwidth())
            .attr('height', d => y(0) - y(d.value));
        svg.append('g')
            .selectAll('text')
            .data(data)
            .join('text')
            .attr('x', d => (x(d.label) + x.bandwidth() / 2))
            .attr('y', d => y(d.value) - 8)
            .attr('text-anchor', 'middle')
            .attr('fill', '#475569')
            .style('font-size', '11px')
            .style('font-weight', '600')
            .text(d => d.value);
    }
    drawBusinessDistributionChart() {
        if (!this.businessDistributionChartRef?.nativeElement)
            return;
        const el = this.businessDistributionChartRef.nativeElement;
        d3.select(el).selectAll('*').remove();
        const width = el.offsetWidth || 800;
        const height = 290;
        const radius = Math.min(width, height) / 2 - 18;
        const distribution = this.getBusinessDistributionData();
        const color = d3.scaleOrdinal()
            .domain(distribution.map(d => d.category))
            .range(distribution.map(d => d.color));
        const data = distribution.map(({ category, value }) => ({ category, value }));
        const pie = d3.pie()
            .value(d => d.value)
            .sort(null);
        const arc = d3.arc()
            .innerRadius(radius * 0.75)
            .outerRadius(radius);
        const labelArc = d3.arc()
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
            .attr('d', arc)
            .attr('fill', d => color(d.data.category))
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
};
__decorate([
    ViewChild('revenueChart')
], DashboardComponent.prototype, "revenueChartRef", void 0);
__decorate([
    ViewChild('weeklyChart')
], DashboardComponent.prototype, "weeklyChartRef", void 0);
__decorate([
    ViewChild('businessDistributionChart')
], DashboardComponent.prototype, "businessDistributionChartRef", void 0);
DashboardComponent = __decorate([
    Component({
        selector: 'app-dashboard',
        standalone: true,
        imports: [CommonModule, RouterLink],
        templateUrl: './dashboard.component.html'
    })
], DashboardComponent);
export { DashboardComponent };
