import { Component, input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { Banner } from '../../../models/banner.model';

@Component({
  selector: 'app-banner-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './banner-detail.component.html'
})
export class BannerDetailComponent {
  authService = inject(AuthService);
  item = input<Banner | null>(null);
}
