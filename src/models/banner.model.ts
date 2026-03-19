export interface Banner {
  id: string;
  title: string;
  image: string;
  description?: string;
  isActive: boolean;
  order?: number;
  tag?: string;
  icon?: string;
  navigationType?: string;
  targetId?: string;
  publishedDate?: string;
  publishedBy?: string;
  content?: string;
  isArchived?: boolean;
}
