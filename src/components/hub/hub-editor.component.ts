
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

/**
 * DEPRECATED
 * This component is no longer used. Hub items are managed via HubItemModalComponent.
 * Kept only as a placeholder if referenced by legacy routing, but will redirect.
 */
@Component({
  selector: 'app-hub-editor',
  standalone: true,
  template: ''
})
export class HubEditorComponent implements OnInit {
  constructor(private router: Router) {}

  ngOnInit() {
    // Redirect to main hub page if accessed
    this.router.navigate(['/hub']);
  }
}
