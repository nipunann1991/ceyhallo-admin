import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FirebaseService } from '../../services/firebase.service';
import { PushNotification } from '../../models/push-notification.model';
import { PaginationControlsComponent } from '../ui/pagination-controls.component';

@Component({
  selector: 'app-push-notifications',
  standalone: true,
  imports: [CommonModule, RouterLink, PaginationControlsComponent],
  templateUrl: './push-notifications.component.html'
})
export class PushNotificationsComponent implements OnInit {
  firebaseService = inject(FirebaseService);
  
  notifications = signal<PushNotification[]>([]);

  // Pagination
  itemsPerPage = 10;
  currentPage = signal(1);

  paginatedNotifications = computed(() => {
    const data = this.notifications(); // No filter applied in this component yet
    const start = (this.currentPage() - 1) * this.itemsPerPage;
    return data.slice(start, start + this.itemsPerPage);
  });

  ngOnInit() {
    this.firebaseService.listenToPath<PushNotification>('push_queue', (data) => {
      // Sort by newest first
      const sorted = data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      this.notifications.set(sorted);
    });
  }
}