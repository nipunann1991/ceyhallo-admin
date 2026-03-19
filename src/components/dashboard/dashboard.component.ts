import { Component, OnInit, signal, computed, effect, ViewChild, ElementRef, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FirebaseService } from '../../services/firebase.service';
import { BusinessStateService } from '../../services/business-state.service';
import * as d3 from 'd3';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
<div class="space-y-8 animate-in fade-in duration-500">
  <!-- Header -->
  <div>
    <div class="flex items-center gap-3">
      <h2 class="text-2xl font-bold text-slate-800">Dashboard Overview</h2>
      @if (maintenanceMode()) {
        <span class="px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold uppercase tracking-wider border border-red-200 flex items-center gap-1.5 shadow-sm">
           <span class="relative flex h-2 w-2">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
           Maintenance Mode
        </span>
      } @else {
        <span class="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold uppercase tracking-wider border border-green-200 flex items-center gap-1.5 shadow-sm">
           <span class="relative flex h-2 w-2">
              <span class="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
           System Active
        </span>
      }
    </div>
    <p class="text-slate-500 text-sm mt-1">Real-time platform insights and activity.</p>
  </div>
  
  <!-- Stats Grid -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    <!-- Stat Card 1: Users -->
    <div class="bg-white p-5 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
      <div class="flex justify-between items-start">
        <div>
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Users</p>
          <h3 class="text-2xl font-bold text-slate-800 mt-1">{{ userCount() }}</h3>
        </div>
        <div class="p-2 bg-blue-50 text-blue-600 rounded-lg">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        </div>
      </div>
      <div class="mt-3 text-xs text-slate-400">
        Registered platform users
      </div>
    </div>

    <!-- Stat Card 2: Restaurants -->
    <div class="bg-white p-5 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
      <div class="flex justify-between items-start">
        <div>
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Restaurants</p>
          <h3 class="text-2xl font-bold text-slate-800 mt-1">{{ restaurantCount() }}</h3>
        </div>
        <div class="p-2 bg-orange-50 text-orange-600 rounded-lg">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>
        </div>
      </div>
      <div class="mt-3 text-xs text-slate-400">
        Active dining partners
      </div>
    </div>

    <!-- Stat Card 3: Businesses -->
    <div class="bg-white p-5 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
      <div class="flex justify-between items-start">
        <div>
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Businesses</p>
          <h3 class="text-2xl font-bold text-slate-800 mt-1">{{ businessCount() }}</h3>
        </div>
        <div class="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
        </div>
      </div>
      <div class="mt-3 text-xs text-slate-400">
        Service providers & shops
      </div>
    </div>

    <!-- Stat Card 4: Jobs -->
    <div class="bg-white p-5 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
      <div class="flex justify-between items-start">
        <div>
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Jobs</p>
          <h3 class="text-2xl font-bold text-slate-800 mt-1">{{ jobCount() }}</h3>
        </div>
        <div class="p-2 bg-teal-50 text-teal-600 rounded-lg">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
        </div>
      </div>
      <div class="mt-3 text-xs text-slate-400">
        Current vacancies
      </div>
    </div>
  </div>

  <!-- Charts Section -->
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <!-- Growth Chart -->
    <div class="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-col">
       <div class="flex justify-between items-center mb-6">
          <h3 class="text-lg font-bold text-slate-800">User Growth</h3>
          <select class="text-xs border-slate-200 rounded-lg text-slate-500 focus:ring-orange-500">
             <option>Last 6 Months</option>
          </select>
       </div>
       <div class="flex-1 w-full min-h-[300px] relative">
          <div #userChart class="w-full h-full"></div>
       </div>
    </div>

    <!-- Content Distribution Pie Chart -->
    <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-col">
       <h3 class="text-lg font-bold text-slate-800 mb-6">Business Categories</h3>
       <div class="flex-1 w-full min-h-[250px] flex items-center justify-center relative">
          <div #contentChart class="w-full h-full flex justify-center"></div>
       </div>
       <div class="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-500">
          @for (category of businessCategories(); track category.id || $index) {
            <div class="flex items-center gap-1.5">
               <span class="w-2 h-2 rounded-full" [style.background-color]="getCategoryColor($index)"></span>
               <span class="truncate">{{ category.name }} ({{ category.count }})</span>
            </div>
          } @empty {
            <div class="col-span-2 text-slate-400 text-center py-4">No categories yet</div>
          }
       </div>
    </div>
  </div>
  
`
})
export class DashboardComponent implements OnInit, OnDestroy {
  // Data Signals
  users = signal<any[]>([]);
  restaurants = signal<any[]>([]);
  groceries = signal<any[]>([]);
  businesses = signal<any[]>([]);
  jobs = signal<any[]>([]);
  events = signal<any[]>([]);
  banners = signal<any[]>([]);
  categories = signal<any[]>([]);
  
  // System Status
  maintenanceMode = signal(false);
  
  // Computed Counts
  userCount = computed(() => this.users().length);
  restaurantCount = computed(() => this.restaurants().length);
  groceryCount = computed(() => this.groceries().length);
  businessCount = computed(() => this.businesses().length);
  jobCount = computed(() => this.jobs().length);
  eventCount = computed(() => this.events().length);
  bannerCount = computed(() => this.banners().filter(b => b.isActive).length);

  // Business Categories Distribution
  businessCategories = computed(() => {
    const allBusinesses = this.businesses();
    const cats = this.categories();
    return cats
      .filter(c => c.published !== false && c.name !== 'Popular' && c.name !== 'Featured')
      .map(cat => {
        const count = allBusinesses.filter(b => b.category === cat.name).length;
        return { ...cat, count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  });

  // Chart References
  @ViewChild('userChart') userChartRef!: ElementRef;
  @ViewChild('contentChart') contentChartRef!: ElementRef;

  private resizeObserver: ResizeObserver | undefined;

  private router = inject(Router);
  private businessStateService = inject(BusinessStateService);

  constructor(private firebaseService: FirebaseService) {
    // Redraw user chart
    effect(() => {
      const u = this.users();
      if (u.length > 0) setTimeout(() => this.drawUserChart(), 100);
    });

    // Redraw pie chart on businesses/categories change
    effect(() => {
      const b = this.businessCount();
      const c = this.categories().length;
      if (b > 0 || c > 0) setTimeout(() => this.drawContentChart(), 100);
    });

    // Redraw pie on businessCategories change
    effect(() => {
      const cats = this.businessCategories();
      if (cats.length > 0) setTimeout(() => this.drawContentChart(), 100);
    });
  }

  ngOnInit() {
    // Fetch data
    this.firebaseService.listenToPath('users', (data) => this.users.set(data), (e) => console.warn('Dashboard: Users fetch denied', e.code));
    this.firebaseService.listenToPath('restaurants', (data) => this.restaurants.set(data));
    this.firebaseService.listenToPath('groceries', (data) => this.groceries.set(data));
    this.firebaseService.listenToPath('businesses', (data) => this.businesses.set(data));
    this.firebaseService.listenToPath('jobs', (data) => this.jobs.set(data));
    this.firebaseService.listenToPath('events', (data) => this.events.set(data));
    this.firebaseService.listenToPath('banners', (data) => this.banners.set(data));
    this.firebaseService.listenToPath('taxonomy_business', (data) => this.categories.set(data));

    // System Status
    this.firebaseService.getDocument('settings', 'app_config').then(doc => {
      if (doc && doc.maintenanceMode) {
        this.maintenanceMode.set(true);
      }
    }).catch(err => console.error('Failed to load system status', err));

    // Resize observer
    this.resizeObserver = new ResizeObserver(() => {
      this.drawUserChart();
      this.drawContentChart();
    });
  }

  ngAfterViewInit() {
    if (this.userChartRef) this.resizeObserver?.observe(this.userChartRef.nativeElement);
    if (this.contentChartRef) this.resizeObserver?.observe(this.contentChartRef.nativeElement);
  }

  ngOnDestroy() {
    this.resizeObserver?.disconnect();
  }

  // User Growth Bar Chart
  drawUserChart() {
    if (!this.userChartRef?.nativeElement) return;
    const el = this.userChartRef.nativeElement;
    d3.select(el).selectAll('*').remove();

    const width = el.offsetWidth || 600;
    const height = 280;
    const margin = { top: 20, right: 20, bottom: 40, left: 50 };

    // Process users by month...
    const users = this.users();
    const counts = new Map<string, number>();
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      counts.set(key, 0);
    }
    users.forEach(u => {
      const d = u.createdAt ? new Date(u.createdAt) : new Date();
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    const data = Array.from(counts, ([date, value]) => ({ date: new Date(date + '-01'), value })).sort((a, b) => a.date.getTime() - b.date.getTime());

    const x = d3.scaleBand().domain(data.map(d => d.date)).range([margin.left, width - margin.right]).padding(0.3);
    const y = d3.scaleLinear().domain([0, d3.max(data, d => d.value) || 5]).nice().range([height - margin.bottom, margin.top]);

    const svg = d3.select(el).append("svg").attr("width", width).attr("height", height).attr("viewBox", [0, 0, width, height]).attr("style", "max-width: 100%; height: auto;");

    // Bars - solid #083594
    svg.selectAll("rect").data(data).join("rect")
      .attr("x", d => x(d.date)!)
      .attr("y", d => y(d.value))
      .attr("width", x.bandwidth())
      .attr("height", d => height - margin.bottom - y(d.value))
      .attr("fill", "#083594")
      .attr("rx", 4);

    // Labels - Original orange
    svg.selectAll("text.value").data(data).join("text")
      .attr("class", "value")
      .attr("x", d => x(d.date)! + x.bandwidth() / 2)
      .attr("y", d => y(d.value) - 5)
      .attr("text-anchor", "middle")
      .style("font-size", "11px")
      .style("font-weight", "600")
.style("fill", "#083594")
      .text(d => d.value.toString());

    // Axes
    svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).tickFormat(d3.timeFormat("%b %y") as any))
      .attr("color", "#94a3b8")
      .selectAll("text").style("font-size", "11px");

    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(5))
      .attr("color", "#94a3b8")
      .call(g => g.select(".domain").remove())
      .call(g => g.selectAll(".tick line").clone().attr("x2", width - margin.left - margin.right).attr("stroke-opacity", 0.1));
  }

  // Business Categories Pie Chart
  drawContentChart() {
    if (!this.contentChartRef?.nativeElement) return;
    const el = this.contentChartRef.nativeElement;
    d3.select(el).selectAll('*').remove();

    const width = el.offsetWidth || 300;
    const height = 250;
    const radius = Math.min(width, height) / 2 - 20;

    const categories = this.businessCategories();
    let data: { label: string; value: number; color: string }[] = categories.map((cat, index) => ({
      label: cat.name,
      value: cat.count,
      color: this.getCategoryColor(index)
    })).filter(d => d.value > 0);

    if (data.length === 0) {
      data = [{ label: 'No Businesses', value: 1, color: '#94a3b8' }];
    }

    const svg = d3.select(el)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [-width / 2, -height / 2, width, height])
      .attr("style", "max-width: 100%; height: auto;");

    const pie = d3.pie<{ label: string; value: number; color: string }>()
      .value(d => d.value)
      .sort(null);

    const arc = d3.arc<d3.PieArcDatum<{ label: string; value: number; color: string }>>()
      .innerRadius(radius * 0.6)
      .outerRadius(radius);

    svg.selectAll("path")
      .data(pie(data))
      .join("path")
      .attr("fill", d => d.data.color)
      .attr("d", arc)
      .attr("stroke", "white")
      .style("stroke-width", "2px");

    const total = d3.sum(data, d => d.value);
    svg.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "-0.2em")
      .style("font-size", "24px")
      .style("font-weight", "bold")
      .style("fill", "#1e293b")
      .text(total.toString());

    svg.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "1.2em")
      .style("font-size", "12px")
      .style("fill", "#64748b")
      .text('Businesses');
  }

  getCategoryColor(index: number): string {
const themeColors = [
'#083594',
      '#f59e0b', '#14b8a6', '#6366f1', '#06b6d4', '#ef4444'
    ];
    return themeColors[index % themeColors.length];
  }
}

