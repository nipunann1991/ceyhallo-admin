import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal.component.html'
})
export class ModalComponent {
  title = input.required<string>();
  size = input<'compact' | 'default' | 'wide'>('default');
  close = output<void>();
}
