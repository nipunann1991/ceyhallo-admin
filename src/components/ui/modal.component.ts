import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-modal',
  standalone: true,
  templateUrl: './modal.component.html'
})
export class ModalComponent {
  title = input.required<string>();
  close = output<void>();
}