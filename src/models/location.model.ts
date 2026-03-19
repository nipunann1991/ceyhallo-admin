export interface City {
  code: string;
  name: string;
  isActive?: boolean;
}

export interface Country {
  code: string; // Country Code (e.g. AE)
  name: string;
  cities: City[];
  flagUrl?: string;
  isActive?: boolean;
}