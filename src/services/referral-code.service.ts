import { Injectable } from '@angular/core';
import { Business } from '../models/business.model';
import { FirebaseService } from './firebase.service';

@Injectable({ providedIn: 'root' })
export class ReferralCodeService {
  private readonly prefix = 'CH';
  private readonly minimumDigits = 2;

  constructor(private firebaseService: FirebaseService) {}

  async getBusinesses(): Promise<Business[]> {
    const businesses = await this.firebaseService.getCollection<Business>('businesses');
    return this.sortBusinesses(businesses);
  }

  async generateNextCode(): Promise<string> {
    const businesses = await this.getBusinesses();
    const usedCodes = new Set(businesses.map((business) => this.normalizeCode(business.referralCode)).filter(Boolean));
    let sequence = businesses.length + 1;
    let candidate = this.formatCode(sequence);
    while (usedCodes.has(candidate)) {
      sequence += 1;
      candidate = this.formatCode(sequence);
    }
    return candidate;
  }

  buildMissingAssignments(businesses: Business[]) {
    const sorted = this.sortBusinesses(businesses);
    const usedCodes = new Set(sorted.map((business) => this.normalizeCode(business.referralCode)).filter(Boolean));
    const assignments: Array<{ id: string; referralCode: string }> = [];

    sorted.forEach((business, index) => {
      if (this.normalizeCode(business.referralCode)) return;
      let sequence = index + 1;
      let candidate = this.formatCode(sequence);
      while (usedCodes.has(candidate)) {
        sequence += 1;
        candidate = this.formatCode(sequence);
      }
      usedCodes.add(candidate);
      assignments.push({ id: business.id, referralCode: candidate });
    });

    return assignments;
  }

  private formatCode(sequence: number) {
    return `${this.prefix}${String(sequence).padStart(this.minimumDigits, '0')}`;
  }

  private normalizeCode(value: unknown) {
    return String(value || '').trim().toUpperCase();
  }

  private sortBusinesses(businesses: Business[]) {
    return [...businesses].sort((first, second) => {
      const firstDate = String(first.createdDate || '');
      const secondDate = String(second.createdDate || '');
      return firstDate.localeCompare(secondDate)
        || String(first.title || '').localeCompare(String(second.title || ''))
        || String(first.id || '').localeCompare(String(second.id || ''));
    });
  }
}
