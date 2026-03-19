
export interface HubItem {
  id: string;
  title: string;
  subtitle: string;
  iconUrl: string;
  sectionId: string; // References HubSection.id (useful for flat mapping if needed)
  countryCode: string; 
  cityCode?: string;
  actionType: 'link' | 'call' | 'email' | 'none';
  actionValue: string;
  displayStyle: 'list' | 'card';
  order: number;
  isActive: boolean;
  createdAt?: string;
  isArchived?: boolean;
}

export interface HubSection {
  id: string;
  title: string;
  type: 'service' | 'emergency'; // Service = Links part, Emergency = Numbers part
  countryCode: string;
  order: number;
  isTitleVisible?: boolean; // Controls visibility of the section title/group header
  isActive?: boolean; // Controls visibility of the entire section
  dataSource?: 'none' | 'businesses'; // New: Data source for dynamic content
  businessCategoryFilter?: string; // New: Category filter for businesses data source
  appCategoryFilter?: string; // New: App category filter for businesses data source
  items?: HubItem[]; // Nested items
  isArchived?: boolean;
}
