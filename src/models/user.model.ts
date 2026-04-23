export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'manager';
  allowedPages?: string[];
  status: 'active' | 'inactive' | 'blocked'; // Updated status types
  // Fields from Firebase
  createdAt?: string;
  isVerified?: boolean;
  region?: string;
  emailVerified?: boolean;
  phoneNumber?: string;
  dateOfBirth?: string;
  address?: string;
  photoUrl?: string;
  lastLoginAt?: string;
}
