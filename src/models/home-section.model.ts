import { HomeSectionAppCategory, HomeSectionDataSource, HomeSectionLinkType, HomeSectionSortBy, HomeSectionType } from '../enums/home-section.enums';

export interface FilterData {
  filterType: string;
  filterValue: string | boolean;
}

export interface HomeSection {
  id: string;
  title: string;
  subTitle?: string;
  enabled: boolean;
  order: number;
  type: HomeSectionType;
  dataSource: HomeSectionDataSource;
  template?: string;
  filterData: FilterData[];
  linkTitle?: string;
  linkUrl?: string;
  linkType?: HomeSectionLinkType;
  appCategory?: HomeSectionAppCategory;
  excludedCategories?: string[];
  limit?: number;
  sortBy?: HomeSectionSortBy;
}
