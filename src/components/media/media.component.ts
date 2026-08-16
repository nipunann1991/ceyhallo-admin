
import { Component, OnDestroy, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FirebaseService } from '../../services/firebase.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { MediaItem } from '../../models/media.model';
import { ConfirmModalComponent } from '../ui/confirm-modal.component';
import { PaginationControlsComponent } from '../ui/pagination-controls.component';
import { ModalComponent } from '../ui/modal.component';
import { optimizeImage } from '../../utils/image-optimizer';
import { FormsModule } from '@angular/forms';

interface MediaFolder {
  name: string;
  path: string;
}

interface MediaFileReference {
  id: string;
  name: string;
  path: string;
}

interface MediaFolderCache {
  fileRefs: MediaFileReference[];
  folders: MediaFolder[];
}

@Component({
  selector: 'app-media',
  standalone: true,
  imports: [CommonModule, ConfirmModalComponent, PaginationControlsComponent, ModalComponent, FormsModule],
  templateUrl: './media.component.html'
})
export class MediaComponent implements OnInit, OnDestroy {
  authService = inject(AuthService);
  firebaseService = inject(FirebaseService);
  toastService = inject(ToastService);

  // State
  currentPath = signal('uploads');
  files = signal<MediaItem[]>([]);
  fileRefs = signal<MediaFileReference[]>([]);
  folders = signal<MediaFolder[]>([]);
  
  searchQuery = signal('');
  unassociatedOnly = signal(false);
  associatedMediaKeys = signal<Set<string>>(new Set());
  isLoadingAssociations = signal(false);
  isUploading = signal(false);
  uploadProgress = signal(0);
  isLoading = signal(false);
  isLoadingPage = signal(false);
  isDragging = signal(false); // New drag state

  // Selection & Bulk Actions
  selectedPaths = signal<Set<string>>(new Set());
  showBulkDeleteModal = signal(false);
  isBulkDeleting = signal(false);

  // Pagination
  itemsPerPage = 36;
  currentPage = signal(1);

  // Delete State (Single)
  showConfirmModal = signal(false);
  itemToDelete = signal<MediaItem | null>(null);

  // Create Folder State
  showCreateFolderModal = signal(false);
  newFolderName = signal('');
  isCreatingFolder = signal(false);
  showFolderDeleteModal = signal(false);
  folderToDelete = signal<MediaFolder | null>(null);
  isDeletingFolder = signal(false);

  // Move State
  showMoveModal = signal(false);
  isMoving = signal(false);
  moveTargetFolder = signal<MediaFolder | null>(null); // Null = current root of picker
  movePickerPath = signal('uploads'); // Independent navigation for picker
  movePickerFolders = signal<MediaFolder[]>([]); // Folders shown in picker
  private folderCache = new Map<string, MediaFolderCache>();
  private loadedFileCache = new Map<string, MediaItem>();
  private associationUnsubscribers: Array<() => void> = [];
  private associationsLoaded = false;

  breadcrumbs = computed(() => {
    const path = this.currentPath();
    const parts = path.split('/').filter(p => p).slice(path.startsWith('uploads') ? 1 : 0);
    // Build array of { name, path }
    let accum = path.startsWith('uploads') ? 'uploads' : '';
    return parts.map(part => {
      accum = accum ? `${accum}/${part}` : part;
      return { name: part, path: accum };
    });
  });

  filteredFileRefs = computed(() => {
    const query = this.searchQuery().toLowerCase();
    const refs = this.fileRefs();
    if (!query) return refs;
    return refs.filter(f => f.name.toLowerCase().includes(query));
  });

  filteredFiles = computed(() => {
    const associatedKeys = this.associatedMediaKeys();
    const showUnassociatedOnly = this.unassociatedOnly();
    if (!showUnassociatedOnly) return this.files();
    return this.files().filter((file) => file.type.startsWith('image/') && !this.isAssociatedFile(file, associatedKeys));
  });

  filteredFolders = computed(() => {
    const query = this.searchQuery().toLowerCase();
    if (!query) return this.folders();
    return this.folders().filter(f => f.name.toLowerCase().includes(query));
  });

  paginatedFiles = computed(() => {
    return this.filteredFiles();
  });

  paginationTotalItems = computed(() => {
    return this.filteredFileRefs().length;
  });

  isAllSelected = computed(() => {
    const visible = this.paginatedFiles();
    if (visible.length === 0) return false;
    return visible.every(f => this.selectedPaths().has(f.path));
  });

  ngOnInit() {
    if (!this.authService.currentUser()) return;
    this.loadFiles();
  }

  ngOnDestroy() {
    this.associationUnsubscribers.forEach((unsubscribe) => unsubscribe());
  }

  async loadFiles(path?: string, forceRefresh = false) {
    const targetPath = path ?? this.currentPath();
    this.isLoading.set(true);
    try {
      const cached = this.folderCache.get(targetPath);
      const result = cached && !forceRefresh
        ? cached
        : await this.firebaseService.listFileReferences(targetPath);
      if (!cached || forceRefresh) {
        this.folderCache.set(targetPath, result);
      }
      this.fileRefs.set(result.fileRefs);
      this.folders.set(result.folders);
      
      if (path !== undefined) {
        this.currentPath.set(path);
        this.currentPage.set(1);
        this.selectedPaths.set(new Set()); // Reset selection on nav
      }

      await this.loadFilesForPage(this.currentPage());
    } catch (e: any) {
      if (e?.code !== 'permission-denied') {
         console.error('Media load error:', e);
         this.toastService.error('Failed to load media library');
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  async onPageChange(page: number) {
    this.currentPage.set(page);
    this.selectedPaths.set(new Set());
    await this.loadFilesForPage(page);
  }

  private async loadFilesForPage(page: number) {
    const start = (page - 1) * this.itemsPerPage;
    const refs = this.filteredFileRefs().slice(start, start + this.itemsPerPage);
    const pathsToLoad = refs
      .map((ref) => ref.path)
      .filter((path) => !this.loadedFileCache.has(path));

    this.isLoadingPage.set(true);
    this.files.set([]);
    try {
      if (pathsToLoad.length > 0) {
        const items = await this.firebaseService.getFilesByPaths(pathsToLoad);
        items.forEach((item) => this.loadedFileCache.set(item.path, item));
      }

      this.files.set(refs
        .map((ref) => this.loadedFileCache.get(ref.path))
        .filter((item): item is MediaItem => Boolean(item)));
    } catch (e: any) {
      if (e?.code !== 'permission-denied') {
        console.error('Media page load error:', e);
        this.toastService.error('Failed to load media page');
      }
    } finally {
      this.isLoadingPage.set(false);
    }
  }

  // --- Navigation ---

  navigateTo(path: string) {
    this.loadFiles(path);
  }

  navigateUp() {
    const parts = this.currentPath().split('/').filter(Boolean);
    if (parts.length > 1) {
      parts.pop();
      this.navigateTo(parts.join('/'));
    }
  }

  updateSearch(event: Event) {
    this.searchQuery.set((event.target as HTMLInputElement).value);
    this.currentPage.set(1);
    this.selectedPaths.set(new Set()); 
    this.loadFilesForPage(1);
  }

  async toggleUnassociatedOnly(checked: boolean) {
    this.unassociatedOnly.set(checked);
    this.currentPage.set(1);
    this.selectedPaths.set(new Set());
    if (checked) {
      this.ensureAssociationIndex();
    }
  }

  refreshMedia() {
    this.invalidateCurrentFolderCache();
    this.loadFiles(undefined, true);
  }

  // --- Folder Creation ---

  openCreateFolder() {
    this.newFolderName.set('');
    this.showCreateFolderModal.set(true);
  }

  async createFolder() {
    const name = this.newFolderName().trim().replace(/[^a-zA-Z0-9-_ ]/g, '');
    if (!name) return;

    this.isCreatingFolder.set(true);
    const newPath = this.joinStoragePath(this.currentPath(), name);

    try {
      await this.firebaseService.createFolder(newPath);
      this.toastService.success(`Folder '${name}' created`);
      this.showCreateFolderModal.set(false);
      this.invalidateCurrentFolderCache();
      this.loadFiles(undefined, true); // Refresh
    } catch (e: any) {
      this.toastService.error('Failed to create folder: ' + e.message);
    } finally {
      this.isCreatingFolder.set(false);
    }
  }

  requestDeleteFolder(folder: MediaFolder) {
    this.folderToDelete.set(folder);
    this.showFolderDeleteModal.set(true);
  }

  closeFolderDeleteModal() {
    this.showFolderDeleteModal.set(false);
    this.folderToDelete.set(null);
  }

  async confirmDeleteFolder() {
    const folder = this.folderToDelete();
    if (!folder) return;

    this.isDeletingFolder.set(true);
    try {
      await this.firebaseService.deleteFolder(folder.path);
      this.invalidateFolderCache(this.currentPath());
      this.invalidateFolderCache(folder.path);
      this.folders.update((current) => current.filter((item) => item.path !== folder.path));
      this.toastService.success(`Deleted folder '${folder.name}' and its contents.`);
      this.closeFolderDeleteModal();
    } catch (error: any) {
      this.toastService.error('Folder deletion failed: ' + error.message);
    } finally {
      this.isDeletingFolder.set(false);
    }
  }

  // --- Selection ---

  toggleSelection(path: string) {
    this.selectedPaths.update(set => {
      const newSet = new Set(set);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  }

  toggleSelectAll() {
    const visibleFiles = this.paginatedFiles();
    const allSelected = this.isAllSelected();
    
    this.selectedPaths.update(set => {
      const newSet = new Set(set);
      if (allSelected) {
        visibleFiles.forEach(f => newSet.delete(f.path));
      } else {
        visibleFiles.forEach(f => newSet.add(f.path));
      }
      return newSet;
    });
  }

  clearSelection() {
    this.selectedPaths.set(new Set());
  }

  // --- Upload ---

  async handleUpload(rawFiles: File[]) {
    if (!this.authService.currentUser()) {
        this.toastService.error('You must be logged in to upload files.');
        return;
    }

    this.isUploading.set(true);
    this.uploadProgress.set(0);

    let completed = 0;

    for (const rawFile of rawFiles) {
      try {
        const file = await optimizeImage(rawFile);
        
        // Use current path
        const path = this.joinStoragePath(this.currentPath(), `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`);
        
        const metadata = {
           uploadedBy: this.authService.currentUser()?.name || 'User',
           originalName: file.name
        };

        await this.firebaseService.uploadFile(path, file, metadata);
        
        completed++;
        this.uploadProgress.set(Math.round((completed / rawFiles.length) * 100));
        
      } catch (e: any) {
        if (e.code === 'storage/unauthorized' || e.code === 'permission-denied') {
           this.toastService.error(`Permission denied: ${rawFile.name}`);
        } else {
           this.toastService.error(`Failed to upload ${rawFile.name}`);
        }
      }
    }

    this.isUploading.set(false);
    if (completed > 0) {
       this.toastService.success(`Uploaded ${completed} file(s)`);
       this.invalidateCurrentFolderCache();
       this.loadFiles(undefined, true); 
    }
  }

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    await this.handleUpload(Array.from(input.files));
    input.value = '';
  }

  // --- Drag and Drop ---

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (!this.isDragging()) {
       this.isDragging.set(true);
    }
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  async onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      await this.handleUpload(Array.from(files));
    }
  }

  copyUrl(url: string) {
    navigator.clipboard.writeText(url).then(() => {
      this.toastService.success('URL copied');
    }).catch(() => this.toastService.error('Failed to copy URL'));
  }

  formatBytes(bytes: number, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  }

  // --- Delete ---

  requestDelete(item: MediaItem) {
    this.itemToDelete.set(item);
    this.showConfirmModal.set(true);
  }

  closeConfirmModal() {
    this.showConfirmModal.set(false);
    this.itemToDelete.set(null);
  }

  async confirmDelete() {
    const item = this.itemToDelete();
    if (!item) return;

    try {
      await this.firebaseService.deleteFile(item.path);
      
      // Cleanup DB silently (Best Effort)
      try {
        await this.firebaseService.deleteDocumentsByField('media', 'path', item.path);
      } catch (e) {}

      this.toastService.success('File deleted');
      this.invalidateCurrentFolderCache();
      this.fileRefs.update(current => current.filter(f => f.path !== item.path));
      this.files.update(current => current.filter(f => f.path !== item.path));
      this.loadedFileCache.delete(item.path);
    } catch (e: any) {
      if (e.code === 'storage/object-not-found') {
         this.fileRefs.update(current => current.filter(f => f.path !== item.path));
         this.files.update(current => current.filter(f => f.path !== item.path));
         this.loadedFileCache.delete(item.path);
         this.toastService.success('File removed (was already deleted)');
      } else {
         this.toastService.error('Delete failed: ' + e.message);
      }
    } finally {
      this.closeConfirmModal();
    }
  }

  requestBulkDelete() {
    if (this.selectedPaths().size === 0) return;
    this.showBulkDeleteModal.set(true);
  }

  closeBulkDeleteModal() {
    this.showBulkDeleteModal.set(false);
  }

  async confirmBulkDelete() {
    const paths = Array.from(this.selectedPaths());
    if (paths.length === 0) return;

    this.isBulkDeleting.set(true);
    let successCount = 0;

    try {
      const promises = paths.map(async (path) => {
        try {
          await this.firebaseService.deleteFile(path);
          try { await this.firebaseService.deleteDocumentsByField('media', 'path', path); } catch(e){}
          successCount++;
        } catch (e: any) {
          if (e.code === 'storage/object-not-found') successCount++;
        }
      });

      await Promise.all(promises);
      this.toastService.success(`Deleted ${successCount} items.`);
      this.selectedPaths.set(new Set());
      this.invalidateCurrentFolderCache();
      paths.forEach((path) => this.loadedFileCache.delete(path));
      this.loadFiles(undefined, true);
    } catch (e: any) {
      this.toastService.error('Bulk delete error: ' + e.message);
    } finally {
      this.isBulkDeleting.set(false);
      this.closeBulkDeleteModal();
    }
  }

  // --- Move Items ---

  openMoveModal() {
    if (this.selectedPaths().size === 0) return;
    this.movePickerPath.set('uploads'); // Start at the media library root
    this.loadPickerFolders('uploads');
    this.showMoveModal.set(true);
  }

  async loadPickerFolders(path: string) {
    try {
      const result = await this.firebaseService.listFileReferences(path);
      this.movePickerFolders.set(result.folders);
    } catch (e) {
      console.error('Picker load error', e);
    }
  }

  navigatePicker(path: string) {
    this.movePickerPath.set(path);
    this.loadPickerFolders(path);
  }

  navigatePickerUp() {
    const parts = this.movePickerPath().split('/');
    if (parts.length > 1) {
      parts.pop();
      this.navigatePicker(parts.join('/'));
    }
  }

  async confirmMove() {
    const destPath = this.movePickerPath();
    const sourcePaths = Array.from(this.selectedPaths());
    
    // Prevent moving into self (simplified check)
    if (destPath === this.currentPath()) {
       this.toastService.info('Destination is the same as source.');
       return;
    }

    this.isMoving.set(true);
    let successCount = 0;
    
    try {
      const promises = sourcePaths.map(async (oldPath: string) => {
         const fileName = oldPath.split('/').pop();
         if (!fileName) return;
         const newPath = this.joinStoragePath(destPath, fileName);
         await this.firebaseService.moveFile(oldPath, newPath);
         
         // Update DB Ref if exists
         try {
            // This assumes a simple query update, but Firestore doesn't have a simple 'update where'.
            // For now, we accept the file is moved in storage. The old DB record will point to dead link.
            // Ideally we'd fetch the doc by path and update it. 
            // In this purely storage-driven view, updating the DB isn't strictly required for the view to work.
         } catch(e) {}
         
         successCount++;
      });

      await Promise.all(promises);
      this.toastService.success(`Moved ${successCount} items.`);
      this.showMoveModal.set(false);
      this.selectedPaths.set(new Set());
      this.invalidateFolderCache(this.currentPath());
      this.invalidateFolderCache(destPath);
      this.loadFiles(undefined, true); // Refresh current view (items should disappear)
    } catch (e: any) {
      this.toastService.error('Move failed: ' + e.message);
    } finally {
      this.isMoving.set(false);
    }
  }

  private joinStoragePath(parent: string, child: string) {
    return [parent, child].filter(Boolean).join('/');
  }

  private invalidateCurrentFolderCache() {
    this.invalidateFolderCache(this.currentPath());
  }

  private invalidateFolderCache(path: string) {
    this.folderCache.delete(path);
    this.loadedFileCache.clear();
  }

  private ensureAssociationIndex() {
    if (this.associationsLoaded || this.isLoadingAssociations()) return;
    this.associationsLoaded = true;
    this.isLoadingAssociations.set(true);

    const collectionNames = [
      'businesses',
      'restaurants',
      'organizations',
      'groceries',
      'banners',
      'events',
      'news',
      'offers',
      'jobs',
      'categories',
      'taxonomy_business',
      'hub_sections',
      'push_queue',
      'settings',
      'email_templates',
      'email_queue',
      'countries'
    ];
    const refsByCollection: Record<string, string[]> = {};
    const loadedCollections = new Set<string>();

    const rebuild = () => {
      const keys = new Set<string>();
      Object.values(refsByCollection)
        .flat()
        .forEach((value) => this.addMediaReference(keys, value));
      this.associatedMediaKeys.set(keys);
      this.isLoadingAssociations.set(loadedCollections.size < collectionNames.length);
    };

    this.associationUnsubscribers = collectionNames.map((collectionName) =>
      this.firebaseService.listenToPath<any>(collectionName, (items) => {
        refsByCollection[collectionName] = items.flatMap((item) => this.collectMediaReferences(item));
        loadedCollections.add(collectionName);
        rebuild();
      }, () => {
        refsByCollection[collectionName] = [];
        loadedCollections.add(collectionName);
        rebuild();
      })
    );
  }

  private isAssociatedFile(file: MediaItem, associatedKeys: Set<string>) {
    return associatedKeys.has(file.url) || associatedKeys.has(file.path);
  }

  private addMediaReference(keys: Set<string>, value: unknown) {
    if (!value || typeof value !== 'string') return;
    const trimmed = value.trim();
    if (!trimmed) return;

    keys.add(trimmed);
    const storagePath = this.extractStoragePath(trimmed);
    if (storagePath) keys.add(storagePath);
  }

  private collectMediaReferences(value: unknown): string[] {
    if (!value) return [];

    if (typeof value === 'string') {
      const trimmed = value.trim();
      return this.looksLikeMediaReference(trimmed) ? [trimmed] : [];
    }

    if (Array.isArray(value)) {
      return value.flatMap((item) => this.collectMediaReferences(item));
    }

    if (typeof value === 'object') {
      return Object.values(value).flatMap((item) => this.collectMediaReferences(item));
    }

    return [];
  }

  private looksLikeMediaReference(value: string) {
    if (!value) return false;
    if (value.includes('firebasestorage.googleapis.com') || value.includes('/o/')) return true;
    return /^(uploads|businesses|banners|events|news|offers|jobs|categories|hub_icons|notifications)\//.test(value);
  }

  private extractStoragePath(url: string) {
    const match = url.match(/\/o\/([^?]+)/);
    if (!match?.[1]) return '';

    try {
      return decodeURIComponent(match[1]);
    } catch {
      return match[1];
    }
  }
}
