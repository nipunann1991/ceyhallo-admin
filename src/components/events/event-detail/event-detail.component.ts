
import { Component, input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { AppEvent } from '../../../models/event.model';

@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './event-detail.component.html'
})
export class EventDetailComponent {
  authService = inject(AuthService);
  item = input<AppEvent | null>(null);

  getOrganizerLink(event: AppEvent): any[] {
      if (event.organizerType === 'business') return ['/businesses', event.organizerId];
      return [];
  }

  getLink(event: AppEvent): string {
    if (event.actionType === 'whatsapp') {
      const num = event.actionTarget?.replace(/[^0-9]/g, '');
      return `https://wa.me/${num}`;
    }
    if (event.actionType === 'call') {
      return `tel:${event.actionTarget}`;
    }
    let url = event.actionTarget || '#';
    if (url !== '#' && !url.startsWith('http') && !url.startsWith('//')) {
        url = 'https://' + url;
    }
    return url;
  }

  getLabel(event: AppEvent): string {
    if (event.actionType === 'whatsapp') return 'Chat on WhatsApp';
    if (event.actionType === 'call') return 'Call Now';
    return 'Register / Info';
  }
}
