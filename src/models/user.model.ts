export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'manager' | 'editor';
  allowedPages?: string[];
  status?: 'active' | 'inactive' | 'blocked';
  // Fields from Firebase
  createdAt?: string;
  isVerified?: boolean;
  region?: string;
  referredCode?: string;
  emailVerified?: boolean;
  phoneNumber?: string;
  dateOfBirth?: string;
  address?: string;
  photoUrl?: string;
  photoURL?: string;
  source?: string;
  fcmToken?: string;
  lastLogin?: string;
  lastLoginAt?: string;
}
