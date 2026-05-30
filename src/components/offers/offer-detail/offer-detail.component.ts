import { Component, input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { Offer } from '../../../models/offer.model';

@Component({
  selector: 'app-offer-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './offer-detail.component.html'
})
export class OfferDetailComponent {
  authService = inject(AuthService);
  item = input<Offer | null>(null);
}
