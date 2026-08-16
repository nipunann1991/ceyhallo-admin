import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FirebaseService, TextReplaceResult, TextSearchMatch } from '../../../services/firebase.service';
import { ToastService } from '../../../services/toast.service';
import { ConfirmModalComponent } from '../../ui/confirm-modal.component';

@Component({
  selector: 'app-find-replace',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmModalComponent],
  templateUrl: './find-replace.component.html'
})
export class FindReplaceComponent {
  private firebaseService = inject(FirebaseService);
  private toastService = inject(ToastService);

  searchText = signal('');
  replacementText = signal('');
  matches = signal<TextSearchMatch[]>([]);
  isSearching = signal(false);
  isReplacing = signal(false);
  showReplaceConfirm = signal(false);
  lastReplaceResult = signal<TextReplaceResult | null>(null);

  totalOccurrences = computed(() => this.matches().reduce((total, match) => total + match.occurrences, 0));
  matchedDocuments = computed(() => new Set(this.matches().map((match) => `${match.collectionPath}/${match.docId}`)).size);
  canSearch = computed(() => this.searchText().trim().length > 0 && !this.isSearching() && !this.isReplacing());
  canReplace = computed(() => this.matches().length > 0 && this.searchText().trim().length > 0 && !this.isReplacing());

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
