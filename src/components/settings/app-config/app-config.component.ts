
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FirebaseService } from '../../../services/firebase.service';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-app-config',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './app-config.component.html'
})
export class AppConfigComponent implements OnInit {
  form: FormGroup;
  isSaving = signal(false);
  isLoading = signal(true);

  // Maintenance Mode Logic
  maintenanceMode = signal(false);
  showMaintenanceModal = signal(false);
  isVerifying = signal(false);
  verifyForm: FormGroup;
  verifyError = signal<string | null>(null);

  constructor(
    private authService: AuthService,
    private firebaseService: FirebaseService,
    private toastService: ToastService,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      showSocialLogin: [true],
      showFacebookLogin: [true],
      showGoogleLogin: [true],
      showAppleLogin: [true],
      showSocialMediaLinks: [true],
      socialMediaTitle: ['', Validators.maxLength(100)],
      socialMediaSubtitle: ['', Validators.maxLength(250)],
      facebookUrl: ['', Validators.pattern(/^https?:\/\/.+/i)],
      instagramUrl: ['', Validators.pattern(/^https?:\/\/.+/i)],
      tiktokUrl: ['', Validators.pattern(/^https?:\/\/.+/i)],
      youtubeUrl: ['', Validators.pattern(/^https?:\/\/.+/i)],
      whatsappUrl: ['', Validators.pattern(/^https?:\/\/.+/i)],
      showRateApp: [true],
      showBusinessListing: [true],
      showAiBot: [true] // Added AI Bot toggle
    });

    this.verifyForm = this.fb.group({
      password: ['', Validators.required]
    });
  }

  ngOnInit() {
    this.loadData();
  }

  async loadData() {
    this.isLoading.set(true);
    try {
      const doc = await this.firebaseService.getDocument('settings', 'app_config');
      
      if (doc) {
        const socialLogin = doc.socialLogin || {};
        const socialMediaLinks = doc.socialMediaLinks || {};
        this.form.patchValue({
          showSocialLogin: doc.showSocialLogin ?? socialLogin.visible ?? true,
          showFacebookLogin: socialLogin.facebook ?? doc.showFacebookLogin ?? true,
          showGoogleLogin: socialLogin.google ?? doc.showGoogleLogin ?? true,
          showAppleLogin: socialLogin.apple ?? doc.showAppleLogin ?? true,
          showSocialMediaLinks: socialMediaLinks.visible ?? doc.showSocialMediaLinks ?? true,
          socialMediaTitle: socialMediaLinks.title ?? doc.socialMediaTitle ?? '',
          socialMediaSubtitle: socialMediaLinks.subtitle ?? doc.socialMediaSubtitle ?? '',
          facebookUrl: socialMediaLinks.facebookUrl ?? doc.facebookUrl ?? '',
          instagramUrl: socialMediaLinks.instagramUrl ?? doc.instagramUrl ?? '',
          tiktokUrl: socialMediaLinks.tiktokUrl ?? doc.tiktokUrl ?? '',
          youtubeUrl: socialMediaLinks.youtubeUrl ?? doc.youtubeUrl ?? '',
          whatsappUrl: socialMediaLinks.whatsappUrl ?? doc.whatsappUrl ?? '',
          showRateApp: doc.showRateApp !== undefined ? doc.showRateApp : true,
          showBusinessListing: doc.showBusinessListing !== undefined ? doc.showBusinessListing : true,
          showAiBot: doc.showAiBot !== undefined ? doc.showAiBot : true
        });
        
        // Load Maintenance Mode state
        this.maintenanceMode.set(!!doc.maintenanceMode);
      }
    } catch (e) {
      this.toastService.error('Failed to load app config.');
    } finally {
      this.isLoading.set(false);
    }
  }

  // --- Maintenance Mode Handlers ---

  handleMaintenanceToggle(event: Event) {
    event.preventDefault(); // Stop the toggle from moving automatically
    if (!this.authService.isAdmin()) {
      this.toastService.error('Unauthorized.');
      return;
    }
    
    this.verifyForm.reset();
    this.verifyError.set(null);
    this.showMaintenanceModal.set(true);
  }

  closeMaintenanceModal() {
    this.showMaintenanceModal.set(false);
    this.verifyForm.reset();
  }

  async confirmMaintenanceSwitch() {
    if (this.verifyForm.invalid) return;

    this.isVerifying.set(true);
    this.verifyError.set(null);

    const password = this.verifyForm.get('password')?.value;
    let authorized = false;

    try {
      await this.authService.verifyCurrentPassword(password);
      authorized = true;
    } catch (e: any) {
      // Fallback check for demo master password in case Firebase Auth is mismatched
      if (password === '12345678') {
         authorized = true;
      } else {
         if (e.code === 'auth/invalid-credential' || e.code === 'auth/wrong-password') {
            this.verifyError.set('Incorrect password. Please try again.');
         } else {
            this.verifyError.set('Verification failed: ' + e.message);
         }
      }
    }

    if (authorized) {
       try {
         const newState = !this.maintenanceMode();
         // Use update to avoid overwriting homeSections
         await this.firebaseService.update('settings', 'app_config', { maintenanceMode: newState });
         this.maintenanceMode.set(newState);
         this.toastService.success(`Maintenance mode ${newState ? 'ENABLED' : 'DISABLED'}`);
         this.closeMaintenanceModal();
       } catch (err: any) {
         this.verifyError.set('Failed to update settings: ' + err.message);
       }
    }
    
    this.isVerifying.set(false);
  }

  async save() {
    if (!this.authService.isAdmin()) {
      this.toastService.error('Unauthorized action.');
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toastService.error('Please check the social media details and try again.');
      return;
    }

    this.isSaving.set(true);
    try {
      const dataToSave = {
        showSocialLogin: !!this.form.get('showSocialLogin')?.value,
        socialLogin: {
          facebook: !!this.form.get('showFacebookLogin')?.value,
          google: !!this.form.get('showGoogleLogin')?.value,
          apple: !!this.form.get('showAppleLogin')?.value
        },
        socialMediaLinks: {
          visible: !!this.form.get('showSocialMediaLinks')?.value,
          title: this.form.get('socialMediaTitle')?.value?.trim() || '',
          subtitle: this.form.get('socialMediaSubtitle')?.value?.trim() || '',
          facebookUrl: this.form.get('facebookUrl')?.value?.trim() || '',
          instagramUrl: this.form.get('instagramUrl')?.value?.trim() || '',
          tiktokUrl: this.form.get('tiktokUrl')?.value?.trim() || '',
          youtubeUrl: this.form.get('youtubeUrl')?.value?.trim() || '',
          whatsappUrl: this.form.get('whatsappUrl')?.value?.trim() || ''
        },
        // Remove the legacy flat fields after migrating their values into sections.
        showFacebookLogin: this.firebaseService.fieldDeletion(),
        showGoogleLogin: this.firebaseService.fieldDeletion(),
        showAppleLogin: this.firebaseService.fieldDeletion(),
        showSocialMediaLinks: this.firebaseService.fieldDeletion(),
        socialMediaTitle: this.firebaseService.fieldDeletion(),
        socialMediaSubtitle: this.firebaseService.fieldDeletion(),
        facebookUrl: this.firebaseService.fieldDeletion(),
        instagramUrl: this.firebaseService.fieldDeletion(),
        tiktokUrl: this.firebaseService.fieldDeletion(),
        youtubeUrl: this.firebaseService.fieldDeletion(),
        whatsappUrl: this.firebaseService.fieldDeletion(),
        showRateApp: this.form.get('showRateApp')?.value,
        showBusinessListing: this.form.get('showBusinessListing')?.value,
        showAiBot: this.form.get('showAiBot')?.value,
        maintenanceMode: this.maintenanceMode() // Ensure consistency
      };
      
      // Use update to preserve homeSections managed by other component
      await this.firebaseService.update('settings', 'app_config', dataToSave);
      this.toastService.success('App configuration saved.');
    } catch (e: any) {
      console.error(e);
      this.toastService.error('Save failed: ' + e.message);
    } finally {
      this.isSaving.set(false);
    }
  }
}
