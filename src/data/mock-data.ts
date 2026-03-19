

export const MOCK_DATA: any = {
  users: {
    "admin-seed-id": {
      "name": "Super Admin",
      "email": "admin@ceyhallo.com",
      "role": "admin",
      "status": "active",
      "createdAt": "2024-01-01T00:00:00Z",
      "phoneNumber": "+971 50 123 4567",
      "dateOfBirth": "1985-05-15",
      "address": "Suite 404, Business Bay, Dubai, UAE"
    },
    "user-seed-002": {
      "name": "John Doe",
      "email": "john@example.com",
      "role": "manager",
      "status": "active",
      "region": "AE",
      "createdAt": "2024-02-15T10:30:00Z",
      "phoneNumber": "+971 55 987 6543",
      "dateOfBirth": "1990-08-20",
      "address": "Villa 12, Arabian Ranches, Dubai"
    }
  },
  settings: {
    "app_config": {
      "showSocialLogin": true,
      "homeSections": [
        { "id": "banners", "label": "Main Banners (Carousel)", "title": "", "enabled": true },
        { "id": "categories", "label": "Categories Grid", "title": "Categories", "enabled": true },
        { "id": "latest_offers", "label": "Latest Offers", "title": "Hot Deals", "enabled": true },
        { "id": "featured_restaurants", "label": "Featured Restaurants", "title": "Top Restaurants", "enabled": true },
        { "id": "featured_businesses", "label": "Featured Businesses", "title": "Featured Businesses", "enabled": true },
        { "id": "news_feed", "label": "News Feed", "title": "Latest News", "enabled": true }
      ]
    }
  },
  restaurants: {
    "restaurant-seed-id": {
      "title": "CeyHallo Signature",
      "description": "Authentic Sri Lankan cuisine in the heart of Dubai.",
      "cuisine": "Sri Lankan",
      "location": "Downtown Dubai",
      "priceRange": "$$",
      "rating": 4.8,
      "reviews": 120,
      "imageUrl": "https://picsum.photos/400/300",
      "tags": ["Spicy", "Authentic", "Curry"],
      "isFeatured": true,
      "isVerified": true,
      "isPremium": true,
      "countryCode": "AE",
      "cityCode": "DXB"
    },
    "restaurant-seed-002": {
      "title": "Ocean Breeze Seafood",
      "description": "Fresh catches daily with a view of the marina.",
      "cuisine": "Seafood",
      "location": "Dubai Marina",
      "priceRange": "$$$",
      "rating": 4.5,
      "reviews": 85,
      "imageUrl": "https://picsum.photos/400/301",
      "tags": ["Seafood", "View", "Dinner"],
      "isFeatured": false,
      "isVerified": true,
      "isPremium": false,
      "countryCode": "AE",
      "cityCode": "DXB"
    }
  },
  groceries: {
    "grocery-seed-001": {
      "title": "Fresh Mart Dubai",
      "description": "Premium organic vegetables and fruits sourced locally.",
      "location": "Jumeirah Lake Towers, Cluster R",
      "rating": 4.6,
      "reviews": 45,
      "imageUrl": "https://picsum.photos/400/302",
      "tags": ["Organic", "Fresh", "Vegetables"],
      "isFeatured": true,
      "isVerified": true,
      "deliveryAvailable": true,
      "countryCode": "AE",
      "cityCode": "DXB"
    }
  },
  banners: {
    "banner-seed-001": {
      "title": "Summer Food Festival",
      "image": "https://picsum.photos/800/400",
      "description": "Join us for the biggest food festival of the year!",
      "isActive": true,
      "tag": "Events",
      "icon": "fa-calendar",
      "navigationType": "bannerDetail",
      "targetId": "summer-fest-2025",
      "publishedDate": "2024-06-01",
      "publishedBy": "CeyHallo Events",
      "content": "Experience a culinary journey like no other at the Summer Food Festival. Featuring top chefs, live music, and a vibrant atmosphere. Full details will be available on the event page."
    },
    "banner-seed-002": {
      "title": "New User Promo",
      "image": "https://picsum.photos/800/401",
      "description": "Get 20% off your first order.",
      "isActive": false,
      "tag": "Promotion",
      "icon": "fa-tag",
      "navigationType": "externalLink",
      "targetId": "/promos/new-user",
      "publishedDate": "2024-01-15",
      "publishedBy": "Marketing Team",
      "content": "Sign up today and get 20% off your first order. Terms and conditions apply. This offer is valid for a limited time only."
    }
  },
  offers: {
    "offer-seed-001": {
      "title": "50% Off Weekdays",
      "image": "https://picsum.photos/400/200",
      "description": "Get half price on all main courses every weekday lunch.",
      "isActive": true,
      "linkType": "restaurant",
      "targetId": "restaurant-seed-id",
      "targetName": "CeyHallo Signature",
      "order": 1,
      "tag": "Promo",
      "publishedDate": "2024-10-25",
      "publishedBy": "Admin",
      "isHomeBanner": true,
      "isSectionBanner": true
    }
  },
  countries: {
    "AE": {
      "name": "United Arab Emirates",
      "flagUrl": "https://flagcdn.com/w40/ae.png",
      "isActive": true,
      "cities": [
        { "code": "DXB", "name": "Dubai", "isActive": true },
        { "code": "AUH", "name": "Abu Dhabi", "isActive": true },
        { "code": "SHJ", "name": "Sharjah", "isActive": true },
        { "code": "AJM", "name": "Ajman", "isActive": true },
        { "code": "RAK", "name": "Ras Al Khaimah", "isActive": true }
      ]
    },
    "LK": {
      "name": "Sri Lanka",
      "flagUrl": "https://flagcdn.com/w40/lk.png",
      "isActive": true,
      "cities": [
        { "code": "CMB", "name": "Colombo", "isActive": true },
        { "code": "KDY", "name": "Kandy", "isActive": true },
        { "code": "GLL", "name": "Galle", "isActive": true },
        { "code": "NEG", "name": "Negombo", "isActive": true },
        { "code": "JAF", "name": "Jaffna", "isActive": true }
      ]
    },
    "US": {
      "name": "United States",
      "flagUrl": "https://flagcdn.com/w40/us.png",
      "isActive": true,
      "cities": [
        { "code": "NYC", "name": "New York", "isActive": true },
        { "code": "LAX", "name": "Los Angeles", "isActive": true },
        { "code": "CHI", "name": "Chicago", "isActive": true },
        { "code": "HOU", "name": "Houston", "isActive": true },
        { "code": "MIA", "name": "Miami", "isActive": true }
      ]
    },
    "GB": {
      "name": "United Kingdom",
      "flagUrl": "https://flagcdn.com/w40/gb.png",
      "isActive": true,
      "cities": [
        { "code": "LON", "name": "London", "isActive": true },
        { "code": "MAN", "name": "Manchester", "isActive": true },
        { "code": "BIR", "name": "Birmingham", "isActive": true },
        { "code": "LIV", "name": "Liverpool", "isActive": true }
      ]
    },
    "SG": {
      "name": "Singapore",
      "flagUrl": "https://flagcdn.com/w40/sg.png",
      "isActive": true,
      "cities": [
        { "code": "SIN", "name": "Singapore", "isActive": true }
      ]
    },
    "AU": {
      "name": "Australia",
      "flagUrl": "https://flagcdn.com/w40/au.png",
      "isActive": true,
      "cities": [
        { "code": "SYD", "name": "Sydney", "isActive": true },
        { "code": "MEL", "name": "Melbourne", "isActive": true },
        { "code": "BNE", "name": "Brisbane", "isActive": true },
        { "code": "PER", "name": "Perth", "isActive": true }
      ]
    }
  },
  events: {
    "event-seed-001": {
      "title": "Community BBQ at the Park",
      "description": "Join us for a fun-filled day with food, music, and games at Zabeel Park. A great chance to meet new people!",
      "fullDate": "25 December 2024",
      "startTime": "12:00",
      "endTime": "18:00",
      "allDayEvent": false,
      "location": "Zabeel Park, Gate 4",
      "imageUrl": "https://picsum.photos/400/401",
      "organizer": "CeyHallo Community",
      "category": "Social",
      "isFeatured": true,
      "isPublished": true,
      "countryCode": "AE",
      "cityCode": "DXB",
      "publishedDate": "2024-10-01T10:00:00Z",
      "createdDate": "2024-09-28T10:00:00Z"
    },
    "event-seed-002": {
      "title": "Tech Networking Night",
      "description": "An evening for tech professionals to connect, share ideas, and build networks. Hosted at Dubai Internet City.",
      "fullDate": "15 November 2024",
      "startTime": "19:00",
      "endTime": "22:00",
      "allDayEvent": false,
      "location": "Radisson Blu, DIC",
      "imageUrl": "https://picsum.photos/400/402",
      "organizer": "Techies Connect",
      "category": "Professional",
      "isFeatured": false,
      "isPublished": false,
      "countryCode": "AE",
      "cityCode": "DXB",
      "publishedDate": "2024-10-15T12:00:00Z",
      "createdDate": "2024-10-15T12:00:00Z"
    }
  },
  news: {
    "news-seed-001": {
      "title": "CeyHallo Expands to New Markets",
      "excerpt": "Exciting news! CeyHallo is now available in Sri Lanka and the United Kingdom, bringing authentic tastes to more people around the globe.",
      "content": "Full article content about the expansion...",
      "imageUrl": "https://picsum.photos/400/250",
      "author": "CeyHallo Team",
      "publishedDate": "2024-10-20T14:00:00Z",
      "category": "Expansion",
      "isFeatured": true,
      "isPublished": true,
      "isNewsPageBanner": true
    },
    "news-seed-002": {
      "title": "Top 5 Must-Try Dishes in Dubai",
      "excerpt": "Our editors pick the top 5 must-try Sri Lankan dishes you can find right here in Dubai through the CeyHallo app.",
      "content": "Full article content about the dishes...",
      "imageUrl": "https://picsum.photos/400/251",
      "author": "Food Critic",
      "publishedDate": "2024-10-18T09:00:00Z",
      "category": "Food",
      "isFeatured": false,
      "isPublished": true,
      "isNewsPageBanner": false
    }
  },
  categories: {
    "cat-1": {
      "id": "cat-1",
      "label": "Jobs",
      "icon": "https://i.ibb.co/n9PDvvM/2-1.png",
      "tab": "jobs",
      "order": 1,
      "hasNotification": false,
      "isActive": true
    },
    "cat-2": {
      "id": "cat-2",
      "label": "Business",
      "icon": "https://i.ibb.co/d08wd96V/2-1-1.png",
      "tab": "business",
      "order": 2,
      "hasNotification": false,
      "isActive": true
    },
    "cat-3": {
      "id": "cat-3",
      "label": "Restaurants",
      "icon": "https://i.ibb.co/4ZcWqYnG/2-1-2.png",
      "tab": "restaurants",
      "order": 3,
      "hasNotification": false,
      "isActive": true
    },
    "cat-4": {
      "id": "cat-4",
      "label": "Events",
      "icon": "https://i.ibb.co/Nn1B28Hk/2-1-3.png",
      "tab": "events",
      "order": 4,
      "hasNotification": false,
      "isActive": true
    },
    "cat-5": {
      "id": "cat-5",
      "label": "News",
      "icon": "https://i.ibb.co/0RKbHwDh/2-1-4.png",
      "tab": "news",
      "order": 5,
      "hasNotification": true,
      "isActive": true
    },
    "cat-6": {
      "id": "cat-6",
      "label": "Housing",
      "icon": "https://i.ibb.co/p6WQFvyd/2-1-5.png",
      "tab": "housing",
      "order": 6,
      "hasNotification": false,
      "isActive": true
    },
    "cat-7": {
      "id": "cat-7",
      "label": "Buy & Sell",
      "icon": "https://i.ibb.co/h1hRndQb/2-1-6.png",
      "tab": "buySell",
      "order": 7,
      "hasNotification": false,
      "isActive": true
    },
    "cat-8": {
      "id": "cat-8",
      "label": "Services",
      "icon": "https://i.ibb.co/gMXLbTfZ/2-1-7.png",
      "tab": "services",
      "order": 8,
      "hasNotification": false,
      "isActive": true
    }
  },
  businesses: {
     "biz-1": {
        "title": "Super Cleaners",
        "category": "Cleaning",
        "location": "Business Bay, Dubai",
        "rating": 4.5,
        "reviews": 20,
        "countryCode": "AE",
        "cityCode": "DXB",
        "isVerified": true,
        "imageUrl": "https://picsum.photos/400/305"
     }
  },
  jobs: {
     "job-1": {
        "title": "Senior Chef",
        "company": "CeyHallo Signature",
        "location": "Dubai",
        "jobType": "Full-time",
        "postedDate": "2024-10-25T10:00:00Z",
        "countryCode": "AE",
        "cityCode": "DXB",
        "companyLogo": "https://picsum.photos/100",
        "skills": ["Cooking", "Team Mgmt"]
     }
  },
  legal: {
    "terms": {
      "content": "<h1>Terms & Conditions</h1><p>Welcome to CeyHallo. By using our app, you agree to...</p>",
      "updatedAt": "2024-01-01T00:00:00Z",
      "updatedBy": "Super Admin"
    },
    "privacy": {
      "content": "<h1>Privacy Policy</h1><p>Your privacy is important to us. We collect...</p>",
      "updatedAt": "2024-01-01T00:00:00Z",
      "updatedBy": "Super Admin"
    },
    "help": {
      "id": "help",
      "updatedBy": "System",
      "content": `
      <h3 class="font-extrabold text-[#1A1C1E] text-lg tracking-tight mb-4">How Can We Help?</h3>
      <p class="text-sm text-gray-600 mb-4 leading-relaxed">
        Welcome to the CeyHallo Help & Support center. Here you can find answers to common questions and ways to contact our support team.
      </p>
      
      <h4 class="font-bold text-[#1A1C1E] text-base mb-2 mt-4">Frequently Asked Questions (FAQs)</h4>
      <div class="space-y-3 mb-4 text-sm text-gray-700">
        <details class="p-3 bg-gray-50 rounded-lg">
          <summary class="font-semibold cursor-pointer">How do I update my profile information?</summary>
          <p class="mt-2 pl-4 text-gray-600">
            Go to the 'Profile' tab, then select 'Account Information'. Here you can edit your details and save changes.
          </p>
        </details>
        <details class="p-3 bg-gray-50 rounded-lg">
          <summary class="font-semibold cursor-pointer">How can I list my business?</summary>
          <p class="mt-2 pl-4 text-gray-600">
            Navigate to the 'Business' category from the dashboard and follow the instructions to add your listing.
          </p>
        </details>
        <details class="p-3 bg-gray-50 rounded-lg">
          <summary class="font-semibold cursor-pointer">What if I forget my password?</summary>
          <p class="mt-2 pl-4 text-gray-600">
            On the login screen, click 'Forgot Password?' and enter your email. We'll send you a recovery link.
          </p>
        </details>
      </div>

      <h4 class="font-bold text-[#1A1C1E] text-base mb-2 mt-4">Contact Support</h4>
      <p class="text-sm text-gray-600 mb-4 leading-relaxed">
        If you can't find the answer to your question in our FAQs, please don't hesitate to reach out to our support team.
      </p>
      
      <div class="space-y-3">
        <a href="mailto:support@ceyhallo.com" class="w-full flex items-center justify-between p-3 bg-[#083594] text-white rounded-xl shadow-md active:scale-[0.98] transition-all">
          <span class="flex items-center gap-3 font-semibold">
            <i class="fas fa-envelope text-lg"></i> Email Us
          </span>
          <i class="fas fa-chevron-right text-base"></i>
        </a>
        <a href="tel:+971501234567" class="w-full flex items-center justify-between p-3 bg-white text-gray-800 rounded-xl shadow-md border border-gray-200 active:scale-[0.98] transition-all">
          <span class="flex items-center gap-3 font-semibold">
            <i class="fas fa-phone-alt text-lg"></i> Call Us
          </span>
          <i class="fas fa-chevron-right text-base text-gray-400"></i>
        </a>
      </div>

      <p class="text-xs text-gray-500 mt-6 leading-relaxed">
        Our support team is available from Sunday to Thursday, 9 AM - 5 PM (GST).
      </p>
    `,
      "updatedAt": "2025-10-26T10:00:00.000Z"
    }
  },
  email_templates: {
    "template-1": {
      "name": "Welcome Email",
      "subject": "Welcome to CeyHallo!",
      "htmlContent": "<h1>Welcome!</h1><p>Thanks for joining CeyHallo.</p>",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-02T00:00:00Z",
      "createdBy": "Super Admin"
    }
  },
  taxonomy_business: [
    { "id": "cat-biz-1", "name": "Retail", "createdAt": "2024-01-01T00:00:00Z" },
    { "id": "cat-biz-2", "name": "Services", "createdAt": "2024-01-01T00:00:00Z" },
    { "id": "cat-biz-3", "name": "Hospitality", "createdAt": "2024-01-01T00:00:00Z" },
    { "id": "cat-biz-4", "name": "Maintenance", "createdAt": "2024-01-01T00:00:00Z" },
    { "id": "cat-job-1", "name": "Technology", "createdAt": "2024-01-01T00:00:00Z" },
    { "id": "cat-job-2", "name": "Healthcare", "createdAt": "2024-01-01T00:00:00Z" }
  ],
  media: [
    {
      "id": "media-1",
      "name": "sample-image.jpg",
      "url": "https://picsum.photos/400/300",
      "path": "uploads/sample-image.jpg",
      "type": "image/jpeg",
      "size": 102400,
      "createdAt": "2024-01-01T10:00:00Z",
      "uploadedBy": "Admin"
    },
    {
      "id": "media-2",
      "name": "document.pdf",
      "url": "#",
      "path": "uploads/document.pdf",
      "type": "application/pdf",
      "size": 204800,
      "createdAt": "2024-01-02T12:00:00Z",
      "uploadedBy": "Admin"
    }
  ]
};
