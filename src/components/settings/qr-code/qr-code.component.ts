import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { toDataURL } from 'qrcode';

@Component({
  selector: 'app-qr-code',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './qr-code.component.html'
})
export class QrCodeComponent {
  link = signal('');
  qrImage = signal('');
  generatedLink = signal('');
  error = signal('');
  isGenerating = signal(false);
  private generation = 0;

  updateLink(value: string) {
    this.link.set(value);
    this.generation++;
    this.qrImage.set('');
    this.generatedLink.set('');
    this.error.set('');
    this.isGenerating.set(false);
  }

  async generate() {
    const generation = ++this.generation;
    const link = this.link().trim();
    this.error.set('');
    this.qrImage.set('');
    this.generatedLink.set('');

    try {
      const url = new URL(link);
      if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || /\s/.test(link)) {
        throw new Error('Invalid link');
      }
    } catch {
      this.error.set('Enter a valid website link starting with https:// or http://.');
      return;
    }

    this.isGenerating.set(true);
    try {
      const image = await toDataURL(link, {
        errorCorrectionLevel: 'M',
        margin: 4,
        width: 1024,
        color: { dark: '#000000', light: '#ffffff' }
      });
      if (generation !== this.generation) return;
      this.qrImage.set(image);
      this.generatedLink.set(link);
    } catch {
      if (generation === this.generation) {
        this.error.set('Unable to generate this QR code. Try a shorter link and generate again.');
      }
    } finally {
      if (generation === this.generation) this.isGenerating.set(false);
    }
  }
}
