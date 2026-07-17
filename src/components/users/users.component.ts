
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
import { ADMIN_PAGE_OPTIONS, ALL_ADMIN_PAGE_PATHS } from '../../constants/admin-pages';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ModalComponent, ConfirmModalComponent, PaginationControlsComponent],
  templateUrl: './users.component.html'
})
export class UsersComponent implements OnInit {
  showTitle = input(true);
  readonly pageOptions = ADMIN_PAGE_OPTIONS;
  selectedAllowedPages = signal<string[]>([]);
  activeTab = signal<'admins' | 'users'>('admins');
  newUserAllowedPages = signal<string[]>([]);
  
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

  filteredAdminUsers = computed(() =>
    this.filteredUsers().filter((user) => user.role !== 'user')
  );

  filteredNormalUsers = computed(() =>
    this.filteredUsers().filter((user) => user.role === 'user')
  );

  paginatedUsers = computed(() => {
    const data = this.filteredNormalUsers();
    const start = (this.currentPage() - 1) * this.itemsPerPage;
    return data.slice(start, start + this.itemsPerPage);
  });

  paginatedAdminUsers = computed(() => {
    const data = this.filteredAdminUsers();
    const start = (this.currentPage() - 1) * this.itemsPerPage;
    return data.slice(start, start + this.itemsPerPage);
  });

  paginatedDirectoryUsers = computed(() =>
    this.activeTab() === 'admins' ? this.paginatedAdminUsers() : this.paginatedUsers()
  );

  directoryUsersCount = computed(() =>
    this.activeTab() === 'admins' ? this.filteredAdminUsers().length : this.filteredNormalUsers().length
  );

  showModal = signal(false);
  isEditing = signal(false);
  currentId: string | null = null;
  errorMessage = signal<string | null>(null);
  form: FormGroup;

  showConfirmModal = signal(false);
  itemToDelete = signal<string | null>(null);
  showAccessModal = signal(false);
  accessUser = signal<User | null>(null);

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
        if (!['admin', 'editor', 'user', 'manager'].includes(rawRole)) {
            rawRole = 'user';
        }

        return {
          ...user,
          status: displayStatus,
          role: rawRole as 'admin' | 'editor' | 'user' | 'manager',
          allowedPages: Array.isArray(user.allowedPages) ? user.allowedPages : []
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

  setActiveTab(tab: 'admins' | 'users') {
    this.activeTab.set(tab);
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
    this.selectedAllowedPages.set([]);
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
    this.selectedAllowedPages.set(item.role === 'admin' ? [...ALL_ADMIN_PAGE_PATHS] : [...(item.allowedPages || [])]);
    this.showModal.set(true);
  }

  viewUser(user: User) {
    this.selectedUser.set(user);
  }

  closeViewModal() {
    this.selectedUser.set(null);
  }

  togglePageAccess(path: string, checked: boolean) {
    this.selectedAllowedPages.update((current) => {
      const pages = new Set(current);
      if (checked) {
        pages.add(path);
      } else {
        pages.delete(path);
      }
      return Array.from(pages);
    });
  }

  isPageSelected(path: string) {
    return this.selectedAllowedPages().includes(path);
  }

  getRoleLabel(role: User['role']) {
    return role === 'admin' ? 'Administrator' : role === 'editor' || role === 'manager' ? 'Editor' : 'User';
  }

  canAssignPages(role: User['role']) {
    return role !== 'admin';
  }

  getUserInitials(name?: string | null) {
    const value = (name || '').trim();
    if (!value) return 'U';
    return value.slice(0, 2).toUpperCase();
  }

  updateRole(role: User['role']) {
    this.form.patchValue({ role });
    if (role === 'admin') {
      this.selectedAllowedPages.set([...ALL_ADMIN_PAGE_PATHS]);
    } else if (this.isEditing()) {
      const existingPages = this.users().find(user => user.id === this.currentId)?.allowedPages || [];
      this.selectedAllowedPages.set(role === 'editor' ? Array.from(new Set([...existingPages, '/media'])) : [...existingPages]);
    } else {
      this.selectedAllowedPages.set(role === 'editor' ? ['/media'] : []);
    }
  }

  getAllowedPageLabels(user: User | null) {
    if (!user) return [];
    const allowedPaths = user.role === 'admin' ? ALL_ADMIN_PAGE_PATHS : (user.allowedPages || []);
    return this.pageOptions
      .filter((page) => allowedPaths.includes(page.path))
      .map((page) => page.label);
  }

  async save() {
    if (!this.authService.isAdmin()) {
      this.errorMessage.set("Unauthorized: Only admins can perform this action.");
      return;
    }
    if (this.form.invalid) return;
    this.errorMessage.set(null);
    
    const formValue = this.form.getRawValue();
    const existingUser = this.isEditing() && this.currentId
      ? this.users().find((user) => user.id === this.currentId)
      : undefined;
    const isStandardUser = formValue.role === 'user';
    const dataToSave: any = isStandardUser
      ? {
          name: formValue.name,
          email: formValue.email,
          role: 'user',
          source: existingUser?.source || 'admin',
          ...(formValue.region ? { region: formValue.region } : {})
        }
      : {
          name: formValue.name,
          email: formValue.email,
          role: formValue.role,
          allowedPages: formValue.role === 'admin'
            ? [...ALL_ADMIN_PAGE_PATHS]
            : formValue.role === 'editor'
              ? Array.from(new Set([...this.selectedAllowedPages(), '/media']))
              : [...this.selectedAllowedPages()],
          region: formValue.region,
          status: formValue.status,
          isVerified: formValue.status === 'active',
          emailVerified: formValue.status === 'active'
        };

    if (!this.isEditing()) {
      dataToSave.createdAt = new Date().toISOString();
    }
    
    try {
      if (this.isEditing() && this.currentId) {
        await this.firebaseService.update('users', this.currentId, dataToSave);
        this.toastService.success('User updated successfully.');
      } else {
        await this.firebaseService.createAuthUserWithProfile(dataToSave);
        this.toastService.success('User created successfully.');
      }
      this.closeModal();
    } catch (e: any) {
      console.error(e);
      if (e.message?.includes('PERMISSION_DENIED') || e.code === 'PERMISSION_DENIED' || e.code === 'permission-denied') {
        const msg = `Permission denied. Only an authorized admin account can create users.`;
        this.errorMessage.set(msg);
        this.toastService.error(msg);
      } else {
        const msg = `Failed to save user. ` + (e.message || 'Unknown error');
        this.errorMessage.set(msg);
        this.toastService.error(msg);
      }
    }
  }

  delete(user: User) {
    if (!this.authService.isAdmin()) {
      alert("Unauthorized: Only admins can delete users.");
      return;
    }
    if (user.role === 'admin') {
      this.toastService.error('Admin users cannot be deleted.');
      return;
    }
    this.itemToDelete.set(user.id);
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

    if (this.users().find((user) => user.id === id)?.role === 'admin') {
      this.toastService.error('Admin users cannot be deleted.');
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
