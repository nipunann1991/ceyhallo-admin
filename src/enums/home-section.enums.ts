export enum HomeSectionType {
  BannerCarousel = 'banner_carousel',
  CategoryGrid = 'category_grid',
  ContentCarousel = 'content_carousel',
  ContentList = 'content_list',
  ContentGrid = 'content_grid'
}

export enum HomeSectionDataSource {
  Banners = 'banners',
  Categories = 'categories',
  Restaurants = 'restaurants',
  Businesses = 'businesses',
  Jobs = 'jobs',
  Events = 'events',
  Offers = 'offers',
  News = 'news'
}

export enum HomeSectionLinkType {
  Custom = 'custom',
  AppCategory = 'appCategory'
}

export enum HomeSectionAppCategory {
  Businesses = 'businesses',
  Events = 'events',
  Jobs = 'jobs',
  News = 'news'
}

export enum HomeSectionFilterType {
  All = 'all',
  Featured = 'isFeatured',
  Category = 'category',
  BusinessCategory = 'businessCategory'
}

export enum HomeSectionSortBy {
  CategorySortId = 'categorySortId',
  FeaturedSortId = 'featuredSortId',
  Asc = 'asc',
  Desc = 'dsc',
  Random = 'random'
}
