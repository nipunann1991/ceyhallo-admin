export interface Job {
  id: string;
  title: string;
  company: string;
  category: string;
  companyLogo: string;
  location: string;
  jobType: string;
  salaryRange: string;
  description: string;
  responsibilities: string[];
  qualifications: string[];
  skills: string[];
  isFeatured: boolean;
  isPublished?: boolean;
  countryCode: string;
  cityCode: string;
  postedDate: string;
  createdDate?: string;
  publishedDate?: string;
  featuredOrder?: number;
  isArchived?: boolean;
}