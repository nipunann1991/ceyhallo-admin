
import { HubActionType, HubDisplayStyle, HubSectionDataSource, HubSectionType } from '../enums/content.enums';

export interface HubItem {
  id: string;
  title: string;
  subtitle: string;
  iconUrl: string;
  sectionId: string; // References HubSection.id (useful for flat mapping if needed)
  countryCode: string; 
  cityCode?: string;
  actionType: HubActionType;
  actionValue: string;
  displayStyle: HubDisplayStyle;
  order: number;
  isActive: boolean;
  createdAt?: string;
  isArchived?: boolean;
}

export interface HubSection {
  id: string;
  title: string;
  type: HubSectionType; // Service = Links part, Emergency = Numbers part
  countryCode: string;
  order: number;
  isTitleVisible?: boolean; // Controls visibility of the section title/group header
  isActive?: boolean; // Controls visibility of the entire section
  dataSource?: HubSectionDataSource; // New: Data source for dynamic content
  businessCategoryFilter?: string; // New: Category filter for businesses data source
  appCategoryFilter?: string; // New: App category filter for businesses data source
  items?: HubItem[]; // Nested items
  isArchived?: boolean;
}
