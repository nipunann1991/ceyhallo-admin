var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
let MonetizationReportComponent = class MonetizationReportComponent {
    constructor() {
        // Data: Potential Revenue Models based on App Features
        this.revenueStreams = signal([
            {
                title: 'B2B Subscriptions & Listings',
                description: 'Recurring revenue from commercial partners listed in the directory.',
                items: [
                    { name: 'Premium Restaurant Tier', price: '$299/mo', features: ['Verified Blue Badge', 'Menu/Catalog PDF Hosting', 'Priority Search Ranking'] },
                    { name: 'Business Pro Account', price: '$199/mo', features: ['Direct WhatsApp/Call Action Buttons', 'Gallery Uploads (Unlimited)', 'Service Tagging'] },
                    { name: 'Grocery & Store Partners', price: '$249/mo', features: ['Delivery Available Badge', 'Leaflet/Catalog Uploads', 'Featured Store Placement'] }
                ]
            },
            {
                title: 'Advertising & Visibility',
                description: 'High-impact visibility slots for events, offers, and general brand awareness.',
                items: [
                    { name: 'Home Screen Carousel', price: '$500/week', features: ['Top-most visual real estate', 'External or Internal Deep Linking', 'High CTR'] },
                    { name: 'Category Sponsorship', price: '$300/mo', features: ['Top of specific category lists (e.g., "Jobs" or "Events")', 'Sticky positioning'] },
                    { name: 'Push Notification Blast', price: '$150/blast', features: ['Direct message to all users', 'Custom Image Support', 'Deep link to offer'] }
                ]
            },
            {
                title: 'Transactional & Micro-Services',
                description: 'One-time fees for specific high-value actions.',
                items: [
                    { name: 'Urgent Job Post', price: '$49/post', features: ['"Urgent" Label', 'Pinned for 7 days', 'Highlighted background'] },
                    { name: 'Featured Event Promotion', price: '$99/event', features: ['Appears in Home "Featured" section', 'Calendar priority', 'Social Media cross-post'] }
                ]
            }
        ]);
        // Comprehensive App Features List based on Codebase
        this.coreFeatures = signal([
            {
                category: 'Multi-Vertical Directories',
                items: [
                    'Restaurants: Menu PDF, Cuisine Filters, Booking Actions (WhatsApp/Call), Reviews',
                    'Businesses: Service Catalogs, Social Links, Map Location, Opening Hours',
                    'Groceries: Delivery Status, Product Gallery, Flyers',
                    'Organizations: Community Groups, NGOs, Contact Info'
                ]
            },
            {
                category: 'Advanced Content Management',
                items: [
                    'Dynamic Home Page Layout: Reorder and toggle sections (Carousel, Grids, Lists) via Admin',
                    'Media Library: Drag-and-drop upload, Folders, Bulk Move/Delete, Image Optimization',
                    'News Engine: Rich Text Editor, Featured Articles, Author Management',
                    'Events System: Date/Time scheduling, Organizer linking, Ticket links'
                ]
            },
            {
                category: 'Marketing & Engagement',
                items: [
                    'Push Notifications: Send to Topics or Specific Devices, Image Support, JSON Data payloads',
                    'Email Engine: SMTP Configuration, HTML Template Builder, Audience Targeting (All/Test)',
                    'Offers & Promos: Time-sensitive deals linking to Restaurants or External sites',
                    'Banners: Home screen carousel management with deep-linking'
                ]
            },
            {
                category: 'System & Configuration',
                items: [
                    'Global Locations: Manage supported Countries and Cities dynamically',
                    'Taxonomy: Custom Categories for Businesses and Jobs',
                    'App Config: Maintenance Mode (Password Protected), Social Login Toggles',
                    'Role-Based Access: Admin (Full) vs Manager (Restricted) vs User roles'
                ]
            }
        ]);
        this.generatedDate = new Date();
    }
    printReport() {
        window.print();
    }
};
MonetizationReportComponent = __decorate([
    Component({
        selector: 'app-monetization-report',
        standalone: true,
        imports: [CommonModule, RouterLink],
        templateUrl: './monetization-report.component.html'
    })
], MonetizationReportComponent);
export { MonetizationReportComponent };
