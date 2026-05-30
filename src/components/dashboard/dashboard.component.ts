import { Component, OnInit, effect, ViewChild, ElementRef, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FirebaseService } from '../../services/firebase.service';
import { DashboardState } from './dashboard.state';
import { drawRevenueChart, drawWeeklyActivityChart, drawBusinessDistributionChart } from './dashboard-chart.utils';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit, OnDestroy {
  readonly dashboard = inject(DashboardState);

  @ViewChild('revenueChart') revenueChartRef!: ElementRef;
  @ViewChild('weeklyChart') weeklyChartRef!: ElementRef;
  @ViewChild('businessDistributionChart') businessDistributionChartRef!: ElementRef;

  private resizeObserver: ResizeObserver | undefined;

  constructor(private firebaseService: FirebaseService) {
    this.setupReactiveChartRefresh();
  }

  ngOnInit() {
    this.loadDashboardData();
    this.setupResizeObserver();
  }

  ngAfterViewInit() {
    if (this.revenueChartRef) this.resizeObserver?.observe(this.revenueChartRef.nativeElement);
    if (this.weeklyChartRef) this.resizeObserver?.observe(this.weeklyChartRef.nativeElement);
    if (this.businessDistributionChartRef) this.resizeObserver?.observe(this.businessDistributionChartRef.nativeElement);
  }

  ngOnDestroy() {
    this.resizeObserver?.disconnect();
  }

  private setupReactiveChartRefresh() {
    effect(() => {
      this.dashboard.userCount();
      this.dashboard.restaurantCount();
      this.dashboard.businessCount();
      this.dashboard.jobCount();
      this.dashboard.bannerCount();
      this.dashboard.eventCount();
      this.dashboard.weeklyNewsData();
      setTimeout(() => this.renderCharts(), 100);
    });
  }

  private loadDashboardData() {
    this.firebaseService.listenToPath('users', (data) => this.dashboard.setUsers(data), (e) => console.warn('Dashboard: Users fetch denied', e.code));
    this.firebaseService.listenToPath('restaurants', (data) => this.dashboard.setRestaurants(data));
    this.firebaseService.listenToPath('businesses', (data) => this.dashboard.setBusinesses(data));
    this.firebaseService.listenToPath('jobs', (data) => this.dashboard.setJobs(data));
    this.firebaseService.listenToPath('banners', (data) => this.dashboard.setBanners(data));
    this.firebaseService.listenToPath('offers', (data) => this.dashboard.setOffers(data));
    this.firebaseService.listenToPath('events', (data) => this.dashboard.setEvents(data));
    this.firebaseService.listenToPath('news', (data) => this.dashboard.setNews(data));
  }

  private setupResizeObserver() {
    this.resizeObserver = new ResizeObserver(() => this.renderCharts());
  }

  private renderCharts() {
    if (this.revenueChartRef?.nativeElement) {
      drawRevenueChart(this.revenueChartRef.nativeElement);
    }
    if (this.weeklyChartRef?.nativeElement) {
      drawWeeklyActivityChart(this.weeklyChartRef.nativeElement, this.dashboard.weeklyNewsData());
    }
    if (this.businessDistributionChartRef?.nativeElement) {
      drawBusinessDistributionChart(this.businessDistributionChartRef.nativeElement, this.dashboard.businessDistributionLegend());
    }
  }
}
