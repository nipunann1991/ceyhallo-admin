var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
let SalesComponent = class SalesComponent {
    constructor() {
        // 1. Define what can be Monetized in the App
        this.products = signal([
            {
                id: 'prod_premium_rest',
                name: 'Premium Restaurant Listing',
                description: 'Verified badge, top of search results, and detailed analytics.',
                price: 299,
                billingType: 'monthly',
                targetModule: 'restaurants',
                features: ['Verified Badge', 'Priority Search', 'Analytics Dashboard']
            },
            {
                id: 'prod_home_banner',
                name: 'Homepage Banner Slot',
                description: 'Exclusive carousel placement on the mobile app home screen.',
                price: 500,
                billingType: 'weekly',
                targetModule: 'general',
                features: ['Home Screen Carousel', 'High Visibility', 'Click Tracking']
            },
            {
                id: 'prod_push_blast',
                name: 'Push Notification Blast',
                description: 'One-time promotional message sent to all active users.',
                price: 150,
                billingType: 'one-time',
                targetModule: 'general',
                features: ['Direct to Lock Screen', 'Custom Image', 'Deep Linking']
            },
            {
                id: 'prod_featured_event',
                name: 'Featured Event Boost',
                description: 'Pin an event to the top of the Events tab for 7 days.',
                price: 99,
                billingType: 'one-time',
                targetModule: 'events',
                features: ['Top of List', 'Highlight Color', 'Social Share']
            },
            {
                id: 'prod_job_premium',
                name: 'Premium Job Post',
                description: 'Highlight job vacancy with urgent tag and top placement.',
                price: 49,
                billingType: 'one-time',
                targetModule: 'jobs',
                features: ['Urgent Tag', 'Top Placement', '30 Days Active']
            },
            {
                id: 'prod_biz_verified',
                name: 'Verified Business Status',
                description: 'Trust badge for service providers and general businesses.',
                price: 199,
                billingType: 'monthly',
                targetModule: 'businesses',
                features: ['Trust Badge', 'SEO Boost', 'Direct Contact Buttons']
            }
        ]);
        // 2. Mock Transactions Data
        this.transactions = signal([
            { id: 'tx_1001', customerName: 'Spicy Lanka Rest.', productName: 'Premium Restaurant Listing', amount: 299, date: '2024-10-25', status: 'completed', paymentMethod: 'Credit Card' },
            { id: 'tx_1002', customerName: 'Tech Solutions FZ', productName: 'Premium Job Post', amount: 49, date: '2024-10-24', status: 'completed', paymentMethod: 'PayPal' },
            { id: 'tx_1003', customerName: 'Dubai Summer Fest', productName: 'Homepage Banner Slot', amount: 500, date: '2024-10-23', status: 'pending', paymentMethod: 'Bank Transfer' },
            { id: 'tx_1004', customerName: 'Green Mart', productName: 'Push Notification Blast', amount: 150, date: '2024-10-22', status: 'completed', paymentMethod: 'Credit Card' },
            { id: 'tx_1005', customerName: 'Curry House', productName: 'Premium Restaurant Listing', amount: 299, date: '2024-10-21', status: 'failed', paymentMethod: 'Credit Card' },
        ]);
        // Computed Stats
        this.totalRevenue = computed(() => {
            return this.transactions()
                .filter(t => t.status === 'completed')
                .reduce((sum, t) => sum + t.amount, 0);
        });
        this.activeSubscriptions = computed(() => {
            return this.transactions()
                .filter(t => t.productName.includes('Premium') || t.productName.includes('Verified'))
                .length;
        });
    }
};
SalesComponent = __decorate([
    Component({
        selector: 'app-sales',
        standalone: true,
        imports: [CommonModule],
        templateUrl: './sales.component.html'
    })
], SalesComponent);
export { SalesComponent };
