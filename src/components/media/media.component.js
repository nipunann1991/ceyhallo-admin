var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FirebaseService } from '../../services/firebase.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { ConfirmModalComponent } from '../ui/confirm-modal.component';
import { PaginationControlsComponent } from '../ui/pagination-controls.component';
import { ModalComponent } from '../ui/modal.component';
import { optimizeImage } from '../../utils/image-optimizer';
import { FormsModule } from '@angular/forms';
let MediaComponent = class MediaComponent {
    constructor() {
        this.authService = inject(AuthService);
        this.firebaseService = inject(FirebaseService);
        this.toastService = inject(ToastService);
        // State
        this.currentPath = signal('uploads');
        this.files = signal([]);
        this.folders = signal([]);
        this.searchQuery = signal('');
        this.isUploading = signal(false);
        this.uploadProgress = signal(0);
        this.isLoading = signal(false);
        this.isDragging = signal(false); // New drag state
        // Selection & Bulk Actions
        this.selectedPaths = signal(new Set());
        this.showBulkDeleteModal = signal(false);
        this.isBulkDeleting = signal(false);
        // Pagination
        this.itemsPerPage = 24; // Increased for smaller icons
        this.currentPage = signal(1);
        // Delete State (Single)
        this.showConfirmModal = signal(false);
        this.itemToDelete = signal(null);
        // Create Folder State
        this.showCreateFolderModal = signal(false);
        this.newFolderName = signal('');
        this.isCreatingFolder = signal(false);
        // Move State
        this.showMoveModal = signal(false);
        this.isMoving = signal(false);
        this.moveTargetFolder = signal(null); // Null = current root of picker
        this.movePickerPath = signal('uploads'); // Independent navigation for picker
        this.movePickerFolders = signal([]); // Folders shown in picker
        this.breadcrumbs = computed(() => {
            const path = this.currentPath();
            const parts = path.split('/').filter(p => p);
            // Build array of { name, path }
            let accum = '';
            return parts.map(part => {
                accum = accum ? `${accum}/${part}` : part;
                return { name: part, path: accum };
            });
        });
        this.filteredFiles = computed(() => {
            const query = this.searchQuery().toLowerCase();
            const sorted = [...this.files()].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            if (!query)
                return sorted;
            return sorted.filter(f => f.name.toLowerCase().includes(query));
        });
        this.filteredFolders = computed(() => {
            const query = this.searchQuery().toLowerCase();
            if (!query)
                return this.folders();
            return this.folders().filter(f => f.name.toLowerCase().includes(query));
        });
        this.paginatedFiles = computed(() => {
            const data = this.filteredFiles();
            const start = (this.currentPage() - 1) * this.itemsPerPage;
            return data.slice(start, start + this.itemsPerPage);
        });
        this.isAllSelected = computed(() => {
            const visible = this.paginatedFiles();
            if (visible.length === 0)
                return false;
            return visible.every(f => this.selectedPaths().has(f.path));
        });
    }
    ngOnInit() {
        if (!this.authService.currentUser())
            return;
        this.loadFiles();
    }
    async loadFiles(path) {
        const targetPath = path || this.currentPath();
        this.isLoading.set(true);
        try {
            const result = await this.firebaseService.listFiles(targetPath);
            this.files.set(result.items);
            this.folders.set(result.folders);
            if (path) {
                this.currentPath.set(path);
                this.currentPage.set(1);
                this.selectedPaths.set(new Set()); // Reset selection on nav
            }
        }
        catch (e) {
            if (e?.code !== 'permission-denied') {
                console.error('Media load error:', e);
                this.toastService.error('Failed to load media library');
            }
        }
        finally {
            this.isLoading.set(false);
        }
    }
    // --- Navigation ---
    navigateTo(path) {
        this.loadFiles(path);
    }
    navigateUp() {
        const parts = this.currentPath().split('/');
        if (parts.length > 1) {
            parts.pop();
            this.navigateTo(parts.join('/'));
        }
    }
    updateSearch(event) {
        this.searchQuery.set(event.target.value);
        this.currentPage.set(1);
        this.selectedPaths.set(new Set());
    }
    // --- Folder Creation ---
    openCreateFolder() {
        this.newFolderName.set('');
        this.showCreateFolderModal.set(true);
    }
    async createFolder() {
        const name = this.newFolderName().trim().replace(/[^a-zA-Z0-9-_ ]/g, '');
        if (!name)
            return;
        this.isCreatingFolder.set(true);
        const newPath = `${this.currentPath()}/${name}`;
        try {
            await this.firebaseService.createFolder(newPath);
            this.toastService.success(`Folder '${name}' created`);
            this.showCreateFolderModal.set(false);
            this.loadFiles(); // Refresh
        }
        catch (e) {
            this.toastService.error('Failed to create folder: ' + e.message);
        }
        finally {
            this.isCreatingFolder.set(false);
        }
    }
    // --- Selection ---
    toggleSelection(path) {
        this.selectedPaths.update(set => {
            const newSet = new Set(set);
            if (newSet.has(path)) {
                newSet.delete(path);
            }
            else {
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
            }
            else {
                visibleFiles.forEach(f => newSet.add(f.path));
            }
            return newSet;
        });
    }
    clearSelection() {
        this.selectedPaths.set(new Set());
    }
    // --- Upload ---
    async handleUpload(rawFiles) {
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
                const path = `${this.currentPath()}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
                const metadata = {
                    uploadedBy: this.authService.currentUser()?.name || 'User',
                    originalName: file.name
                };
                await this.firebaseService.uploadFile(path, file, metadata);
                completed++;
                this.uploadProgress.set(Math.round((completed / rawFiles.length) * 100));
            }
            catch (e) {
                if (e.code === 'storage/unauthorized' || e.code === 'permission-denied') {
                    this.toastService.error(`Permission denied: ${rawFile.name}`);
                }
                else {
                    this.toastService.error(`Failed to upload ${rawFile.name}`);
                }
            }
        }
        this.isUploading.set(false);
        if (completed > 0) {
            this.toastService.success(`Uploaded ${completed} file(s)`);
            this.loadFiles();
        }
    }
    async onFileSelected(event) {
        const input = event.target;
        if (!input.files || input.files.length === 0)
            return;
        await this.handleUpload(Array.from(input.files));
        input.value = '';
    }
    // --- Drag and Drop ---
    onDragOver(event) {
        event.preventDefault();
        event.stopPropagation();
        if (!this.isDragging()) {
            this.isDragging.set(true);
        }
    }
    onDragLeave(event) {
        event.preventDefault();
        event.stopPropagation();
        this.isDragging.set(false);
    }
    async onDrop(event) {
        event.preventDefault();
        event.stopPropagation();
        this.isDragging.set(false);
        const files = event.dataTransfer?.files;
        if (files && files.length > 0) {
            await this.handleUpload(Array.from(files));
        }
    }
    copyUrl(url) {
        navigator.clipboard.writeText(url).then(() => {
            this.toastService.success('URL copied');
        }).catch(() => this.toastService.error('Failed to copy URL'));
    }
    formatBytes(bytes, decimals = 2) {
        if (!+bytes)
            return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    }
    // --- Delete ---
    requestDelete(item) {
        this.itemToDelete.set(item);
        this.showConfirmModal.set(true);
    }
    closeConfirmModal() {
        this.showConfirmModal.set(false);
        this.itemToDelete.set(null);
    }
    async confirmDelete() {
        const item = this.itemToDelete();
        if (!item)
            return;
        try {
            await this.firebaseService.deleteFile(item.path);
            // Cleanup DB silently (Best Effort)
            try {
                await this.firebaseService.deleteDocumentsByField('media', 'path', item.path);
            }
            catch (e) { }
            this.toastService.success('File deleted');
            this.files.update(current => current.filter(f => f.path !== item.path));
        }
        catch (e) {
            if (e.code === 'storage/object-not-found') {
                this.files.update(current => current.filter(f => f.path !== item.path));
                this.toastService.success('File removed (was already deleted)');
            }
            else {
                this.toastService.error('Delete failed: ' + e.message);
            }
        }
        finally {
            this.closeConfirmModal();
        }
    }
    requestBulkDelete() {
        if (this.selectedPaths().size === 0)
            return;
        this.showBulkDeleteModal.set(true);
    }
    closeBulkDeleteModal() {
        this.showBulkDeleteModal.set(false);
    }
    async confirmBulkDelete() {
        const paths = Array.from(this.selectedPaths());
        if (paths.length === 0)
            return;
        this.isBulkDeleting.set(true);
        let successCount = 0;
        try {
            const promises = paths.map(async (path) => {
                try {
                    await this.firebaseService.deleteFile(path);
                    try {
                        await this.firebaseService.deleteDocumentsByField('media', 'path', path);
                    }
                    catch (e) { }
                    successCount++;
                }
                catch (e) {
                    if (e.code === 'storage/object-not-found')
                        successCount++;
                }
            });
            await Promise.all(promises);
            this.toastService.success(`Deleted ${successCount} items.`);
            this.selectedPaths.set(new Set());
            this.loadFiles();
        }
        catch (e) {
            this.toastService.error('Bulk delete error: ' + e.message);
        }
        finally {
            this.isBulkDeleting.set(false);
            this.closeBulkDeleteModal();
        }
    }
    // --- Move Items ---
    openMoveModal() {
        if (this.selectedPaths().size === 0)
            return;
        this.movePickerPath.set('uploads'); // Start at root
        this.loadPickerFolders('uploads');
        this.showMoveModal.set(true);
    }
    async loadPickerFolders(path) {
        try {
            const result = await this.firebaseService.listFiles(path);
            this.movePickerFolders.set(result.folders);
        }
        catch (e) {
            console.error('Picker load error', e);
        }
    }
    navigatePicker(path) {
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
            const promises = sourcePaths.map(async (oldPath) => {
                const fileName = oldPath.split('/').pop();
                if (!fileName)
                    return;
                const newPath = `${destPath}/${fileName}`;
                await this.firebaseService.moveFile(oldPath, newPath);
                // Update DB Ref if exists
                try {
                    // This assumes a simple query update, but Firestore doesn't have a simple 'update where'.
                    // For now, we accept the file is moved in storage. The old DB record will point to dead link.
                    // Ideally we'd fetch the doc by path and update it. 
                    // In this purely storage-driven view, updating the DB isn't strictly required for the view to work.
                }
                catch (e) { }
                successCount++;
            });
            await Promise.all(promises);
            this.toastService.success(`Moved ${successCount} items.`);
            this.showMoveModal.set(false);
            this.selectedPaths.set(new Set());
            this.loadFiles(); // Refresh current view (items should disappear)
        }
        catch (e) {
            this.toastService.error('Move failed: ' + e.message);
        }
        finally {
            this.isMoving.set(false);
        }
    }
};
MediaComponent = __decorate([
    Component({
        selector: 'app-media',
        standalone: true,
        imports: [CommonModule, ConfirmModalComponent, PaginationControlsComponent, ModalComponent, FormsModule],
        templateUrl: './media.component.html'
    })
], MediaComponent);
export { MediaComponent };
