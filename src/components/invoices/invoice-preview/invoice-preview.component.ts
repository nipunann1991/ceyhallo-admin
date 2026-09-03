import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, input, signal } from '@angular/core';
import { FirebaseService } from '../../../services/firebase.service';

@Component({
  selector: 'app-invoice-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './invoice-preview.component.html'
})
export class InvoicePreviewComponent implements OnInit {
  private readonly firebaseService = inject(FirebaseService);
  invoice = input.required<any>();
  readonly company = signal({ companyName: '', address: '', businessRegistrationNumber: '', contactNumber: '' });

  ngOnInit(): void {
    this.firebaseService.listenToDocument<any>('settings', 'app_config', config => {
      const details = config?.companyDetails || {};
      this.company.set({
        companyName: details.companyName || config?.companyName || 'CeyHallo',
        address: details.address || config?.companyAddress || '',
        businessRegistrationNumber: details.businessRegistrationNumber || config?.businessRegistrationNumber || '',
        contactNumber: details.contactNumber || config?.contactNumber || ''
      });
    });
  }

  lineTotal(item: any): number {
    return (Number(item?.quantity) || 0) * (Number(item?.unitPrice) || 0);
  }
}
