
import { Component, OnInit, signal, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FirebaseService } from '../../services/firebase.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { User } from '../../models/user.model';
import { ModalComponent } from '../ui/modal.component';
import { ConfirmModalComponent } from '../ui/confirm-modal.component';
import { PaginationControlsComponent } from '../ui/pagination-controls.component';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ModalComponent, ConfirmModalComponent, PaginationControlsComponent],
  templateUrl: './users.component.html'
})
export class UsersComponent implements OnInit {
  showTitle = input(true);
  
  users = signal<User[]>([]);
  searchQuery = signal('');

  // Pagination
  itemsPerPage = 10;
  currentPage = signal(1);

  filteredUsers = computed(() => {
    const query = this.searchQuery().toLowerCase();
    return this.users().filter(u => 
      u.name?.toLowerCase().includes(query) || 
      u.email?.toLowerCase().includes(query) ||
      u.role?.toLowerCase().includes(query)
    );
  });

  paginatedUsers = computed(() => {
    const data = this.filteredUsers();
    const start = (this.currentPage() - 1) * this.itemsPerPage;
    return data.slice(start, start + this.itemsPerPage);
  });
  
  showModal = signal(false);
  isEditing = signal(false);
  currentId: string | null = null;
  errorMessage = signal<string | null>(null);
  form: FormGroup;

  showConfirmModal = signal(false);
  itemToDelete = signal<string | null>(null);

  // Detail View
  selectedUser = signal<User | null>(null);

  constructor(
    public authService: AuthService,
    private toastService: ToastService,
    private firebaseService: FirebaseService,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      role: ['user', Validators.required],
      status: ['active', Validators.required],
      region: ['']
    });
  }

  ngOnInit() {
    this.firebaseService.listenToPath<User>('users', (data) => {
      // Map Firebase data to our UI-friendly User model
      const mappedUsers = data.map(user => {
        // Normalize Status: Check explicit status first (case-insensitive), fallback to isVerified
        let displayStatus: 'active' | 'inactive' | 'blocked' = 'inactive';
        
        if (user.status) {
          const s = user.status.toLowerCase();
          if (s === 'active') displayStatus = 'active';
          else if (s === 'blocked') displayStatus = 'blocked';
          else displayStatus = 'inactive';
        } else if (user.isVerified) {
          displayStatus = 'active';
        }

        // Normalize Role: case-insensitive
        let rawRole = (user.role || 'user').toLowerCase();
        if (!['admin', 'manager', 'user'].includes(rawRole)) {
            rawRole = 'user';
        }

        return {
          ...user,
          status: displayStatus,
          role: rawRole as 'admin' | 'manager' | 'user'
        };
      });
      
      this.users.set(mappedUsers);
    }, (error) => {
      console.error('Error fetching users:', error);
      if (error.code === 'permission-denied') {
        this.toastService.error('Permission denied accessing Users. Check database rules.');
        this.errorMessage.set('Permission denied. Please check Firestore Rules.');
      }
    });
  }

  updateSearch(event: Event) {
    this.searchQuery.set((event.target as HTMLInputElement).value);
    this.currentPage.set(1);
  }

  openModal() {
    if (!this.authService.isAdmin()) {
      alert("Unauthorized: Only admins can add users.");
      return;
    }
    this.isEditing.set(false);
    this.currentId = null;
    this.errorMessage.set(null);
    this.form.reset({ role: 'user', status: 'active', region: '' });
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }

  edit(item: User) {
    if (!this.authService.isAdmin()) return;
    
    this.isEditing.set(true);
    this.currentId = item.id;
    this.errorMessage.set(null);
    this.form.patchValue(item);
    this.showModal.set(true);
  }

  viewUser(user: User) {
    this.selectedUser.set(user);
  }

  closeViewModal() {
    this.selectedUser.set(null);
  }

  async save() {
    if (!this.authService.isAdmin()) {
      this.errorMessage.set("Unauthorized: Only admins can perform this action.");
      return;
    }
    if (this.form.invalid) return;
    this.errorMessage.set(null);
    
    const formValue = this.form.getRawValue();

    // Transform form data back to the Firebase data structure
    const dataToSave: any = {
      name: formValue.name,
      email: formValue.email,
      role: formValue.role,
      region: formValue.region,
      status: formValue.status, // Save status explicitly
      isVerified: formValue.status === 'active',
      emailVerified: formValue.status === 'active',
    };

    if (!this.isEditing()) {
      dataToSave.createdAt = new Date().toISOString();
    }
    
    try {
      if (this.isEditing() && this.currentId) {
        await this.firebaseService.update('users', this.currentId, dataToSave);
        this.toastService.success('User updated successfully.');
      } else {
        await this.firebaseService.create('users', dataToSave);
        this.toastService.success('User created successfully.');
      }
      this.closeModal();
    } catch (e: any) {
      console.error(e);
      if (e.message?.includes('PERMISSION_DENIED') || e.code === 'PERMISSION_DENIED') {
        const msg = `PERMISSION DENIED: You must enable "write: true" in your Firebase Console rules.`;
        this.errorMessage.set(msg);
        this.toastService.error(msg);
      } else {
        const msg = `Failed to save user. ` + (e.message || 'Unknown error');
        this.errorMessage.set(msg);
        this.toastService.error(msg);
      }
    }
  }

  delete(id: string) {
    if (!this.authService.isAdmin()) {
      alert("Unauthorized: Only admins can delete users.");
      return;
    }
    this.itemToDelete.set(id);
    this.showConfirmModal.set(true);
  }

  closeConfirmModal() {
    this.showConfirmModal.set(false);
    this.itemToDelete.set(null);
  }

  async confirmDelete() {
    const id = this.itemToDelete();
    if (!this.authService.isAdmin() || !id) {
      this.closeConfirmModal();
      return;
    }

    try {
      await this.firebaseService.delete('users', id);
      this.toastService.success('User deleted successfully.');
    } catch (e: any) {
      if (e.message?.includes('PERMISSION_DENIED') || e.code === 'PERMISSION_DENIED') {
        this.toastService.error('Permission Denied: Cannot delete user.');
      } else {
        this.toastService.error('Failed to delete user: ' + (e.message || 'Unknown error'));
      }
    } finally {
      this.closeConfirmModal();
    }
  }
}
