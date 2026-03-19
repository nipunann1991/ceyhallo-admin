
import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FirebaseService } from '../../../services/firebase.service';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { Category } from '../../../models/category.model';
import { ModalComponent } from '../../ui/modal.component';
import { ConfirmModalComponent } from '../../ui/confirm-modal.component';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ModalComponent, ConfirmModalComponent],
  templateUrl: './categories.component.html'
})
export class CategoriesComponent implements OnInit {
  authService = inject(AuthService);
  firebaseService = inject(FirebaseService);
  toastService = inject(ToastService);
  private fb: FormBuilder = inject(FormBuilder);

  categories = signal<Category[]>([]);
  searchQuery = signal('');

  filteredCategories = computed(() => {
    const query = this.searchQuery().toLowerCase();
    const list = this.categories().sort((a, b) => (a.order || 0) - (b.order || 0));
    if (!query) return list;
    return list.filter(c => 
      c.label?.toLowerCase().includes(query) || 
      c.tab?.toLowerCase().includes(query)
    );
  });

  // Modal State
  showModal = signal(false);
  isEditing = signal(false);
  isUploading = signal(false);
  currentId: string | null = null;
  errorMessage = signal<string | null>(null);
  form: FormGroup;
  
  // Confirmation State
  showConfirmModal = signal(false);
  itemToDelete = signal<string | null>(null);
  
  // Drag State
  draggedIndex: number | null = null;

  constructor() {
    this.form = this.fb.group({
      label: ['', Validators.required],
      icon: ['', Validators.required],
      tab: ['', Validators.required],
      order: [1, [Validators.required, Validators.min(1)]],
      hasNotification: [false],
      isActive: [true]
    });
  }

  ngOnInit() {
    this.firebaseService.listenToPath<Category>('categories', (data) => {
      // Ensure isActive is boolean (default true if missing)
      const filteredData = data.filter(c => c.label !== 'Popular' && c.label !== 'Featured');
      const sanitized = filteredData.map(c => ({
        ...c,
        isActive: c.isActive !== false
      }));
      this.categories.set(sanitized);
    });
  }

  updateSearch(event: Event) {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  // --- Show/Hide (Active Status) ---

  async toggleStatus(category: Category, event: Event) {
    event.stopPropagation(); // Prevent row click or drag start
    if (!this.authService.isAdmin()) {
        this.toastService.error('Unauthorized');
        return; 
    }

    const newStatus = !category.isActive;
    
    // Optimistic update locally
    this.categories.update(cats => cats.map(c => c.id === category.id ? { ...c, isActive: newStatus } : c));

    try {
      await this.firebaseService.update('categories', category.id, { isActive: newStatus });
      this.toastService.success(`Category ${newStatus ? 'Visible' : 'Hidden'}`);
    } catch (e) {
      console.error(e);
      // Revert on error
      this.categories.update(cats => cats.map(c => c.id === category.id ? { ...c, isActive: !newStatus } : c));
      this.toastService.error('Failed to update status');
    }
  }





  // --- Drag & Drop Reordering ---

  onDragStart(event: DragEvent, index: number) {
    if (this.searchQuery()) {
        event.preventDefault();
        return;
    }
    this.draggedIndex = index;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', index.toString());
    }
  }

  onDragOver(event: DragEvent) {
    if (this.searchQuery()) return;
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  async onDrop(event: DragEvent, dropIndex: number) {
    if (this.searchQuery()) return;
    event.preventDefault();

    if (this.draggedIndex === null || this.draggedIndex === dropIndex) {
      this.draggedIndex = null;
      return;
    }

    const currentCats = [...this.filteredCategories()];
    const [draggedItem] = currentCats.splice(this.draggedIndex, 1);
    currentCats.splice(dropIndex, 0, draggedItem);

    const updates: Promise<void>[] = [];
    const updatedFullList = [...this.categories()];

    currentCats.forEach((cat, index) => {
      const newOrder = index + 1;
      if (cat.order !== newOrder) {
        cat.order = newOrder;
        updates.push(this.firebaseService.update('categories', cat.id, { order: newOrder }));
        
        // Update local ref
        const match = updatedFullList.find(c => c.id === cat.id);
        if (match) match.order = newOrder;
      }
    });

    this.categories.set(updatedFullList);
    this.draggedIndex = null;

    if (updates.length > 0) {
      try {
        await Promise.all(updates);
        this.toastService.success('Order updated');
      } catch (e) {
        console.error(e);
        this.toastService.error('Failed to save new order');
      }
    }
  }

  // --- Create / Edit ---

  openModal() {
    if (!this.authService.isAdmin()) {
      this.toastService.error("Unauthorized: Only admins can manage categories.");
      return;
    }
    this.isEditing.set(false);
    this.isUploading.set(false);
    this.currentId = null;
    this.errorMessage.set(null);
    
    const maxOrder = this.categories().reduce((max, c) => Math.max(max, c.order || 0), 0);
    
    this.form.reset({
      label: '',
      icon: '',
      tab: '',
      order: maxOrder + 1,
      hasNotification: false,
      isActive: true
    });
    this.showModal.set(true);
  }

  edit(item: Category) {
    if (!this.authService.isAdmin()) return;
    this.isEditing.set(true);
    this.isUploading.set(false);
    this.currentId = item.id;
    this.errorMessage.set(null);
    this.form.patchValue({
      ...item,
      isActive: item.isActive !== false // Handle missing field as true
    });
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    this.isUploading.set(true);
    this.errorMessage.set(null);

    try {
      const path = `categories/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      const url = await this.firebaseService.uploadFile(path, file);
      this.form.patchValue({ icon: url });
    } catch (e: any) {
      this.errorMessage.set('Image upload failed.');
      this.toastService.error('Image upload failed.');
    } finally {
      this.isUploading.set(false);
    }
  }

  async save() {
    if (!this.authService.isAdmin()) {
      this.errorMessage.set("Unauthorized.");
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    
    const formValue = this.form.getRawValue();
    const dataToSave = { ...formValue };

    try {
      if (this.isEditing() && this.currentId) {
        // Update
        await this.firebaseService.update('categories', this.currentId, dataToSave);
        this.toastService.success('Category updated successfully.');
      } else {
        // Create
        const newId = `cat-${Date.now()}`;
        await this.firebaseService.set(`categories/${newId}`, { ...dataToSave, id: newId });
        this.toastService.success('Category created successfully.');
      }
      this.closeModal();
    } catch (e: any) {
      this.errorMessage.set(e.message);
      this.toastService.error('Save failed: ' + e.message);
    }
  }

  // --- Delete ---

  delete(id: string) {
    if (!this.authService.isAdmin()) return;
    this.itemToDelete.set(id);
    this.showConfirmModal.set(true);
  }

  closeConfirmModal() {
    this.showConfirmModal.set(false);
    this.itemToDelete.set(null);
  }

  async confirmDelete() {
    const id = this.itemToDelete();
    if (!id) return;

    try {
      await this.firebaseService.delete('categories', id);
      this.toastService.success('Category deleted successfully.');
    } catch (e: any) {
      this.toastService.error('Delete failed: ' + e.message);
    } finally {
      this.closeConfirmModal();
    }
  }
}
