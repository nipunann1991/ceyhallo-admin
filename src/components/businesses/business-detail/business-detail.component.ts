
import { Component, input, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { FirebaseService } from '../../../services/firebase.service';
import { Business } from '../../../models/business.model';
import { Offer } from '../../../models/offer.model';

@Component({
  selector: 'app-business-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './business-detail.component.html'
})
export class BusinessDetailComponent implements OnInit {
  authService = inject(AuthService);
  firebaseService = inject(FirebaseService);
  
  item = input<Business | null>(null);
  allOffers = signal<Offer[]>([]);

  relatedOffers = computed(() => {
     const current = this.item();
     if (!current) return [];
     return this.allOffers().filter(o => o.targetId === current.id && o.isActive);
  });

  galleryImages = computed(() => {
    const business = this.item();
    if (!business) return [];

    return [...new Set([business.imageUrl, ...(business.gallery || [])].filter(Boolean))];
  });
  activeGalleryIndex = signal(0);
  visibleGalleryIndex = computed(() => Math.min(this.activeGalleryIndex(), Math.max(0, this.galleryImages().length - 1)));
  currentGalleryImage = computed(() => this.galleryImages()[this.visibleGalleryIndex()]);

  phones(biz: Business): string[] {
     if (biz.contact?.phones && biz.contact.phones.length > 0) return biz.contact.phones;
     if ((biz.contact as any)?.phone) return [(biz.contact as any).phone];
     return [];
  }

  ngOnInit() {
     this.firebaseService.listenToPath<Offer>('offers', (data) => this.allOffers.set(data));
  }

  getLink(biz: Business): string {
    if (biz.actionType === 'whatsapp') {
      const num = biz.actionTarget?.replace(/[^0-9]/g, '');
      return `https://wa.me/${num}`;
    }
    if (biz.actionType === 'call') {
      return `tel:${biz.actionTarget}`;
    }
    return '#';
  }

  getLabel(biz: Business): string {
    if (biz.actionType === 'whatsapp') return 'Chat on WhatsApp';
    if (biz.actionType === 'call') return 'Call Now';
    return 'Contact';
  }

  selectGalleryImage(index: number) {
    this.activeGalleryIndex.set(index);
  }

  previousGalleryImage() {
    const total = this.galleryImages().length;
    if (total > 0) this.activeGalleryIndex.set((this.visibleGalleryIndex() - 1 + total) % total);
  }

  nextGalleryImage() {
    const total = this.galleryImages().length;
    if (total > 0) this.activeGalleryIndex.set((this.visibleGalleryIndex() + 1) % total);
  }
}
