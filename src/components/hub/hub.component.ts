import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, computed, signal } from '@angular/core';
import { FirebaseService } from '../../services/firebase.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { HubItem, HubSection } from '../../models/hub.model';
import { ConfirmModalComponent } from '../ui/confirm-modal.component';
import { HubSectionModalComponent } from './hub-section-modal.component';
import { HubItemModalComponent } from './hub-item-modal.component';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-hub',
  standalone: true,
  imports: [CommonModule, ConfirmModalComponent, HubSectionModalComponent, HubItemModalComponent, FormsModule],
  templateUrl: './hub.component.html'
})
export class HubComponent implements OnInit {
  authService = inject(AuthService);
  firebaseService = inject(FirebaseService);
  toastService = inject(ToastService);

  sections = signal<HubSection[]>([]);
  locations = signal<any[]>([]);
  selectedCountry = signal<string>('AE');
  showArchived = signal(false);
  
  // Reorder State
  isReordering = signal(false);
  draggedSectionIndex: number | null = null;
  draggedItem: HubItem | null = null;
  
  // Menu State
  sectionMenuOpen = signal<string>('');
  
  // Computed Data Grouping
  filteredSections = computed(() => {
    const archived = this.showArchived();
    return this.sections()
      .filter(s => {
        const matchesCountry = s.countryCode === this.selectedCountry();
        const matchesArchive = archived ? s.isArchived === true : !s.isArchived;
        return matchesCountry && matchesArchive;
      })
      .map(s => ({
        ...s,
        items: (s.items || []).filter(i => archived ? i.isArchived === true : !i.isArchived)
      }))
      .sort((a, b) => a.order - b.order);
  });

  // Modals
  showSectionModal = signal(false);
  editingSection = signal<HubSection | null>(null);

  showItemModal = signal(false);
  editingItem = signal<HubItem | null>(null);
  targetSectionId = signal<string>('');

  // Delete Confirmations
  showConfirmModal = signal(false);
  itemToDeleteId = signal<string | null>(null);
  
  showSectionDeleteModal = signal(false);
  sectionToDelete = signal<HubSection | null>(null);

  showArchiveConfirmModal = signal(false);
  itemToArchive = signal<HubItem | HubSection | null>(null);

  // Accordion State
  expandedSectionId = signal<string | null>(null);

  ngOnInit() {
    // Listen to sections (items are nested inside)
    this.firebaseService.listenToPath<HubSection>('hub_sections', (data) => {
      const processed = data.map(s => ({
        ...s,
        // Ensure items are sorted by order
        items: (s.items || []).sort((a, b) => a.order - b.order)
      }));
      this.sections.set(processed);
      
      // Expand first section by default
      const first = this.filteredSections()[0];
      if (first) {
        this.expandedSectionId.set(first.id);
      }
    });

    this.firebaseService.listenToPath<any>('countries', (data) => {
      this.locations.set(data);
    });
  }

  toggleSection(id: string) {
    this.expandedSectionId.set(this.expandedSectionId() === id ? null : id);
  }

  toggleSectionMenu(id: string) {
    this.sectionMenuOpen.set(this.sectionMenuOpen() === id ? '' : id);
  }

  // --- Section Management ---
  openAddSection() {
    this.editingSection.set(null);
    this.showSectionModal.set(true);
  }

  editSection(section: HubSection) {
    this.editingSection.set(section);
    this.showSectionModal.set(true);
  }

  deleteSectionRequest(section: HubSection) {
    if (!this.authService.isAdmin()) return;
    this.sectionToDelete.set(section);
    this.showSectionDeleteModal.set(true);
  }

  async confirmDeleteSection() {
    const section = this.sectionToDelete();
    if (!section) return;
    
    // Check if items exist
    if (section.items && section.items.length > 0) {
        this.toastService.error('Cannot delete section with items. Remove items first.');
        this.showSectionDeleteModal.set(false);
        return;
    }

    try {
      await this.firebaseService.delete('hub_sections', section.id);
      this.toastService.success('Section deleted');
    } catch (e: any) {
      this.toastService.error(e.message);
    } finally {
      this.showSectionDeleteModal.set(false);
    }
  }

  // --- Item Management ---
  openAddItem(sectionId: string) {
    this.editingItem.set(null);
    this.targetSectionId.set(sectionId);
    this.showItemModal.set(true);
  }

  editItem(item: HubItem) {
    this.editingItem.set(item);
    this.targetSectionId.set(item.sectionId);
    this.showItemModal.set(true);
  }

  async duplicateItem(item: HubItem) {
    if (!this.authService.isAdmin()) return;

    // Find parent section
    const allSections = this.sections();
    const parentSection = allSections.find(s => s.items?.some(i => i.id === item.id));
    if (!parentSection || !parentSection.items) return;

    const items = [...parentSection.items];
    const index = items.findIndex(i => i.id === item.id);
    if (index === -1) return;

    const newItem: HubItem = {
      ...item,
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      title: `${item.title} (Copy)`,
      // Insert logic will handle re-ordering, but we set a safe default
      order: index + 2 
    };

    // Insert after original
    items.splice(index + 1, 0, newItem);
    
    // Normalize orders
    items.forEach((it, idx) => it.order = idx + 1);

    try {
      await this.firebaseService.update('hub_sections', parentSection.id, { items });
      this.toastService.success('Item duplicated');
    } catch (e: any) {
      this.toastService.error('Duplicate failed: ' + e.message);
    }
  }

  deleteItem(id: string) {
    if (!this.authService.isAdmin()) return;
    this.itemToDeleteId.set(id);
    this.showConfirmModal.set(true);
  }

  async confirmDeleteItem() {
    const id = this.itemToDeleteId();
    if (!id) return;

    // Find the section that contains this item
    const allSections = this.sections();
    const section = allSections.find(s => s.items?.some(i => i.id === id));

    if (section) {
       const newItems = (section.items || []).filter(i => i.id !== id);
       try {
          // Update the specific section document
          await this.firebaseService.update('hub_sections', section.id, { items: newItems });
          this.toastService.success('Item deleted successfully.');
       } catch (e: any) {
          this.toastService.error('Delete failed: ' + e.message);
       }
    } else {
        this.toastService.error('Item not found.');
    }

    this.showConfirmModal.set(false);
    this.itemToDeleteId.set(null);
  }

  // --- Reordering Logic ---
  toggleReorderMode() {
    if (!this.authService.isAdmin()) return;
    this.isReordering.update(v => !v);
    this.draggedSectionIndex = null;
    this.draggedItem = null;
  }

  // Section Dragging
  onSectionDragStart(event: DragEvent, index: number) {
    if (!this.isReordering()) return;
    this.draggedSectionIndex = index;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', index.toString());
    }
  }

  onSectionDragOver(event: DragEvent) {
    if (!this.isReordering() || this.draggedItem) return;
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  async onSectionDrop(event: DragEvent, dropIndex: number) {
    if (!this.isReordering() || this.draggedSectionIndex === null) return;
    event.preventDefault();

    if (this.draggedSectionIndex === dropIndex) {
      this.draggedSectionIndex = null;
      return;
    }

    const displayList = [...this.filteredSections()];
    const [draggedItem] = displayList.splice(this.draggedSectionIndex, 1);
    displayList.splice(dropIndex, 0, draggedItem);

    // Prepare updates
    const updates: Promise<void>[] = [];
    const fullList = [...this.sections()];

    displayList.forEach((section, index) => {
      const newOrder = index + 1;
      if (section.order !== newOrder) {
        section.order = newOrder;
        updates.push(this.firebaseService.update('hub_sections', section.id, { order: newOrder }));
        
        // Optimistic update local
        const match = fullList.find(s => s.id === section.id);
        if (match) match.order = newOrder;
      }
    });

    this.sections.set(fullList);
    this.draggedSectionIndex = null;

    try {
      await Promise.all(updates);
      this.toastService.success('Section order saved');
    } catch (e: any) {
      console.error(e);
      this.toastService.error('Failed to save order');
    }
  }

  // Item Dragging
  onItemDragStart(event: DragEvent, item: HubItem) {
    if (!this.isReordering()) return;
    event.stopPropagation();
    this.draggedItem = item;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', item.id);
    }
  }

  onItemDragOver(event: DragEvent) {
    if (!this.isReordering() || !this.draggedItem) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  async onItemDrop(event: DragEvent, targetItem: HubItem) {
    if (!this.isReordering() || !this.draggedItem) return;
    event.preventDefault();
    event.stopPropagation();

    const sourceItem = this.draggedItem;
    
    // Only allow sorting within same section
    if (sourceItem.sectionId !== targetItem.sectionId) {
        this.draggedItem = null;
        return;
    }
    
    if (sourceItem.id === targetItem.id) {
        this.draggedItem = null;
        return;
    }

    const section = this.sections().find(s => s.id === sourceItem.sectionId);
    if (!section || !section.items) return;

    const items = [...section.items];
    const sourceIndex = items.findIndex(i => i.id === sourceItem.id);
    const targetIndex = items.findIndex(i => i.id === targetItem.id);

    if (sourceIndex === -1 || targetIndex === -1) return;

    // Move
    const [moved] = items.splice(sourceIndex, 1);
    items.splice(targetIndex, 0, moved);

    // Update orders in the array
    items.forEach((item, index) => {
        item.order = index + 1;
    });

    // Update DB - overwrite the items array in the section
    try {
        await this.firebaseService.update('hub_sections', section.id, { items: items });
        
        // Optimistic local update
        this.sections.update(secs => secs.map(s => s.id === section.id ? { ...s, items: items } : s));
        this.toastService.success('Items reordered');
    } catch (e: any) {
        this.toastService.error('Failed to save order');
    }
    
    this.draggedItem = null;
  }

  async toggleSectionArchive(section: HubSection) {
    if (!this.authService.isAdmin()) return;
    this.itemToArchive.set(section);
    this.showArchiveConfirmModal.set(true);
  }

  async toggleItemArchive(item: HubItem) {
    if (!this.authService.isAdmin()) return;
    this.itemToArchive.set(item);
    this.showArchiveConfirmModal.set(true);
  }

  closeArchiveConfirmModal() {
    this.showArchiveConfirmModal.set(false);
    this.itemToArchive.set(null);
  }

  async confirmArchive() {
    const itemOrSection = this.itemToArchive();
    if (!itemOrSection) return;

    if ('items' in itemOrSection) { // It's a HubSection
      try {
        const newState = !itemOrSection.isArchived;
        await this.firebaseService.update('hub_sections', itemOrSection.id, { isArchived: newState });
        this.toastService.success(newState ? 'Section archived' : 'Section restored');
      } catch (e: any) {
        this.toastService.error(e.message);
      }
    } else { // It's a HubItem
      const section = this.sections().find(s => s.items?.some(i => i.id === itemOrSection.id));
      if (!section || !section.items) return;

      const newItems = section.items.map(i => i.id === itemOrSection.id ? { ...i, isArchived: !i.isArchived } : i);
      try {
        await this.firebaseService.update('hub_sections', section.id, { items: newItems });
        this.toastService.success(!itemOrSection.isArchived ? 'Item archived' : 'Item restored');
      } catch (e: any) {
        this.toastService.error(e.message);
      }
    }
    this.closeArchiveConfirmModal();
  }
}

