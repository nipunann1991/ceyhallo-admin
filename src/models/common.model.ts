export interface OpeningHour {
  day: string;
  hours: string;
}

export interface DeliveryInfo {
  location: string;
  charge: string;
}

export interface BusinessContact {
  phones: string[];
  website: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
}

export interface OrganizationContact {
  phones: string[];
  website: string;
  email?: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
}

