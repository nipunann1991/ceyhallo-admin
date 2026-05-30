
import { Component, input, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { FirebaseService } from '../../../services/firebase.service';
import { News } from '../../../models/news.model';

@Component({
  selector: 'app-news-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './news-detail.component.html'
})
export class NewsDetailComponent implements OnInit {
  authService = inject(AuthService);
  firebaseService = inject(FirebaseService);
  route: ActivatedRoute = inject(ActivatedRoute);
  
  item = input<News | null>(null);
  fetchedItem = signal<News | null>(null);
  loading = signal(false);

  displayNews = computed(() => this.item() || this.fetchedItem());

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    // Fetch if ID exists in route AND no input item provided
    if (id && !this.item()) {
      this.loading.set(true);
      this.firebaseService.getDocument('news', id).then(data => {
        this.fetchedItem.set(data);
        this.loading.set(false);
      }).catch(() => this.loading.set(false));
    }
  }
}
