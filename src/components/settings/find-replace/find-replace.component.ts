import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FirebaseService, TextReplaceResult, TextSearchMatch } from '../../../services/firebase.service';
import { ToastService } from '../../../services/toast.service';
import { ConfirmModalComponent } from '../../ui/confirm-modal.component';
import { Business } from '../../../models/business.model';
import { ReferralCodeService } from '../../../services/referral-code.service';

@Component({
  selector: 'app-find-replace',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmModalComponent],
  templateUrl: './find-replace.component.html'
})
export class FindReplaceComponent implements OnInit {
  private firebaseService = inject(FirebaseService);
  private toastService = inject(ToastService);
  private referralCodeService = inject(ReferralCodeService);

  searchText = signal('');
  replacementText = signal('');
  matches = signal<TextSearchMatch[]>([]);
  isSearching = signal(false);
  isReplacing = signal(false);
  showReplaceConfirm = signal(false);
  lastReplaceResult = signal<TextReplaceResult | null>(null);
  businesses = signal<Business[]>([]);
  isLoadingBusinesses = signal(true);
  isGeneratingReferralCodes = signal(false);
  showReferralConfirm = signal(false);

  totalOccurrences = computed(() => this.matches().reduce((total, match) => total + match.occurrences, 0));
  matchedDocuments = computed(() => new Set(this.matches().map((match) => `${match.collectionPath}/${match.docId}`)).size);
  canSearch = computed(() => this.searchText().trim().length > 0 && !this.isSearching() && !this.isReplacing());
  canReplace = computed(() => this.matches().length > 0 && this.searchText().trim().length > 0 && !this.isReplacing());
  missingReferralCodeCount = computed(() => this.businesses().filter((business) => !String(business.referralCode || '').trim()).length);

  ngOnInit() {
    this.loadBusinesses();
  }

  async loadBusinesses() {
    this.isLoadingBusinesses.set(true);
    try {
      this.businesses.set(await this.referralCodeService.getBusinesses());
    } catch (error) {
      console.error('Failed to load businesses for referral codes:', error);
      this.toastService.error('Failed to load businesses.');
    } finally {
      this.isLoadingBusinesses.set(false);
    }
  }

  async generateMissingReferralCodes() {
    this.isGeneratingReferralCodes.set(true);
    this.showReferralConfirm.set(false);
    try {
      const currentBusinesses = await this.referralCodeService.getBusinesses();
      const assignments = this.referralCodeService.buildMissingAssignments(currentBusinesses);
      if (assignments.length === 0) {
        this.businesses.set(currentBusinesses);
        this.toastService.info('Every business already has a referral code.');
        return;
      }
      await this.firebaseService.saveMany('businesses', assignments.map((assignment) => ({
        id: assignment.id,
        data: { referralCode: assignment.referralCode }
      })));
      await this.loadBusinesses();
      this.toastService.success(`Generated ${assignments.length} referral code${assignments.length === 1 ? '' : 's'}.`);
    } catch (error) {
      console.error('Referral code generation failed:', error);
      this.toastService.error('Referral code generation failed.');
    } finally {
      this.isGeneratingReferralCodes.set(false);
    }
  }

  async findMatches() {
    const text = this.searchText().trim();
    if (!text) return;

    this.isSearching.set(true);
    this.lastReplaceResult.set(null);
    this.matches.set([]);

    try {
      const matches = await this.firebaseService.findTextInKnownCollections(text);
      this.matches.set(matches);
      if (matches.length === 0) {
        this.toastService.info('No matching text found.');
      }
    } catch (error) {
      console.error('Find and replace search failed:', error);
      this.toastService.error('Search failed.');
    } finally {
      this.isSearching.set(false);
    }
  }

  requestReplace() {
    if (!this.canReplace()) return;
    this.showReplaceConfirm.set(true);
  }

  async confirmReplace() {
    const text = this.searchText().trim();
    if (!text) return;

    this.isReplacing.set(true);
    try {
      const result = await this.firebaseService.replaceTextInKnownCollections(text, this.replacementText());
      this.lastReplaceResult.set(result);
      this.matches.set([]);
      this.toastService.success(`Updated ${result.updatedDocuments} document(s).`);
    } catch (error) {
      console.error('Find and replace update failed:', error);
      this.toastService.error('Replacement failed.');
    } finally {
      this.isReplacing.set(false);
      this.showReplaceConfirm.set(false);
    }
  }
}
