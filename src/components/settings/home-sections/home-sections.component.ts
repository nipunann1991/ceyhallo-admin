import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FirebaseService } from '../../../services/firebase.service';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { ModalComponent } from '../../ui/modal.component';
import { ConfirmModalComponent } from '../../ui/confirm-modal.component';
import { TaxonomyItem } from '../../../models/taxonomy.model';
import { FilterData, HomeSection } from '../../../models/home-section.model';
import { HomeSectionAppCategory, HomeSectionDataSource, HomeSectionFilterType, HomeSectionLinkType, HomeSectionType } from '../../../enums/home-section.enums';

@Component({
  selector: 'app-home-sections',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ModalComponent, ConfirmModalComponent],
  templateUrl: './home-sections.component.html'
})
export class HomeSectionsComponent implements OnInit {
  authService = inject(AuthService);
  firebaseService = inject(FirebaseService);
  toastService = inject(ToastService);
  private fb: FormBuilder = inject(FormBuilder);

  isSaving = signal(false);
  isLoading = signal(true);
  
  sections = signal<HomeSection[]>([]);
  draggedIndex: number | null = null;

  // Configuration Modal
  showConfigModal = signal(false);
  configForm: FormGroup;
  editingIndex: number | null = null;

  // Delete Confirmation
  showDeleteModal = signal(false);
  deleteIndex: number | null = null;

  // Data for Dropdowns
  businessCategories = signal<TaxonomyItem[]>([]);

  constructor() {
    this.configForm = this.fb.group({
      title: [''], // Not mandatory
      subTitle: [''],
      type: [HomeSectionType.ContentCarousel, Validators.required],
      dataSource: [HomeSectionDataSource.Businesses, Validators.required],
      filterType: [[]],
      // We will use separate controls for different filter values to avoid collision
      filterValue_category: [[]], 
      filterValue_businessCategory: [[]],
      filterValue_text: [''],
      linkTitle: ['Link URL'],
      linkUrl: [''],
      linkType: [HomeSectionLinkType.Custom],
      appCategory: [HomeSectionAppCategory.Businesses],
      excludedCategories: [[]],
      limit: [10, [Validators.required, Validators.min(1), Validators.max(50)]]
    });

    // Reset filter value if data source changes
    this.configForm.get('dataSource')?.valueChanges.subscribe(() => {
       this.configForm.patchValue({ 
         filterValue_category: [],
         filterValue_businessCategory: [],
         filterValue_text: ''
       });
    });

    this.configForm.get('linkType')?.valueChanges.subscribe(linkType => {
      const linkUrlControl = this.configForm.get('linkUrl');
      if (linkType === HomeSectionLinkType.AppCategory) {
        linkUrlControl?.disable();
        this.updateLinkUrlFromAppCategory();
      } else {
        linkUrlControl?.enable();
      }
    });

    this.configForm.get('appCategory')?.valueChanges.subscribe(() => {
      if (this.configForm.get('linkType')?.value === HomeSectionLinkType.AppCategory) {
        this.updateLinkUrlFromAppCategory();
      }
    });
  }

  updateLinkUrlFromAppCategory() {
    const appCategory = this.configForm.get('appCategory')?.value;
    if (appCategory) {
      this.configForm.get('linkUrl')?.setValue(`/${appCategory}`);
    }
  }

  ngOnInit() {
    this.loadData();
    this.loadTaxonomies();
  }

  loadTaxonomies() {
    this.firebaseService.listenToPath<TaxonomyItem>('taxonomy_business', (data) => {
       this.businessCategories.set(data.sort((a,b) => a.name.localeCompare(b.name)));
    });
  }

  async loadData() {
    this.isLoading.set(true);
    try {
      const doc = await this.firebaseService.getDocument('settings', 'app_config');
      
      console.log('App Config Home Sections (DB):', doc?.homeSections);

      if (doc && doc.homeSections && Array.isArray(doc.homeSections)) {
        let loadedSections = doc.homeSections.sort((a: HomeSection, b: HomeSection) => (a.order || 0) - (b.order || 0));
        
        // Migration check for old schema
        if (loadedSections.length > 0) {
           loadedSections = this.migrateLegacySections(loadedSections);
        }

        this.sections.set(loadedSections);
      } else {
        // Initialize with default setup if empty
        this.sections.set(this.migrateLegacySections(this.getDefaultLegacySections()));
      }
    } catch (e) {
      this.toastService.error('Failed to load home sections.');
    } finally {
      this.isLoading.set(false);
    }
  }

  getDefaultLegacySections(): any[] {
    return [
        { id: 'banners', label: 'Main Banners', title: '', enabled: true, order: 1 },
        { id: 'categories', label: 'Categories Grid', title: 'Categories', subTitle: 'Explore', enabled: true, order: 2 },
        { id: 'latest_offers', label: 'Latest Offers', title: 'Hot Deals', enabled: true, order: 3 },
        { id: 'featured_businesses', label: 'Featured Businesses', title: 'Featured Businesses', enabled: true, order: 4 },
        { id: 'news_feed', label: 'News Feed', title: 'Latest News', enabled: true, order: 5 }
    ];
  }

  getTemplateForDataSource(ds: string): string {
    if (ds === HomeSectionDataSource.Banners) return 'banners';
    if (ds === HomeSectionDataSource.Businesses) return 'featured_businesses';
    if (ds === HomeSectionDataSource.Offers) return 'latest_offers';
    if (ds === HomeSectionDataSource.News) return 'news_feed';
    if (ds === HomeSectionDataSource.Categories) return 'categories';
    return 'featured_businesses';
  }

  migrateLegacySections(oldSections: any[]): HomeSection[] {
    return oldSections.map(s => {
       // Check if already migrated, but also ensure new fields exist
       if (s.filterData) {
         s.linkTitle = s.linkTitle || '';
         s.linkUrl = s.linkUrl || '';
         s.linkType = s.linkType || HomeSectionLinkType.Custom;
         s.appCategory = s.appCategory || HomeSectionAppCategory.Businesses;
         return s as HomeSection;
       }

       // Handle legacy 'featured' value migration to 'isFeatured'
       let currentFilterType = s.filterType || HomeSectionFilterType.All;
       if (currentFilterType === 'featured') currentFilterType = HomeSectionFilterType.Featured;

       // Convert single filterType to array
       let filterTypes: string[] = [];
       if (Array.isArray(currentFilterType)) {
          filterTypes = currentFilterType;
       } else if (currentFilterType && currentFilterType !== HomeSectionFilterType.All) {
          filterTypes = [currentFilterType];
       }

       // Construct FilterData
       const filterData: FilterData[] = [];
       
       // Legacy filterValue handling
       let legacyValues: string[] = [];
       if (Array.isArray(s.filterValue)) {
          legacyValues = s.filterValue;
       } else if (s.filterValue) {
          legacyValues = [String(s.filterValue)];
       }

       filterTypes.forEach(type => {
          if (type === HomeSectionFilterType.Featured) {
             filterData.push({ filterType: HomeSectionFilterType.Featured, filterValue: true });
          } else if (type === HomeSectionFilterType.Category || type === HomeSectionFilterType.BusinessCategory) {
             legacyValues.forEach(val => {
                filterData.push({ filterType: type, filterValue: val });
             });
          }
       });

       let newSec: HomeSection = {
          id: s.id,
          title: s.title || '',
          subTitle: s.subTitle || '',
          enabled: s.enabled,
          order: s.order,
          filterData: filterData,
          linkTitle: s.linkTitle || '',
          linkUrl: s.linkUrl || '',
          linkType: s.linkType || HomeSectionLinkType.Custom,
          appCategory: s.appCategory || HomeSectionAppCategory.Businesses,
          limit: s.limit || 10,
          dataSource: s.dataSource,
          type: s.type,
          template: s.template
       };

       // Backward compatibility for very old structure without dataSource/type
       if (!newSec.dataSource) {
           if (s.id.includes('banner')) {
              newSec.dataSource = HomeSectionDataSource.Banners;
              newSec.type = HomeSectionType.BannerCarousel;
              newSec.template = 'banners';
           } else if (s.id.includes('categories')) {
              newSec.dataSource = HomeSectionDataSource.Categories;
              newSec.type = HomeSectionType.CategoryGrid;
              newSec.template = 'categories';
           } else if (s.id.includes('offer')) {
              newSec.dataSource = HomeSectionDataSource.Offers;
              newSec.type = HomeSectionType.ContentCarousel;
              newSec.template = 'latest_offers';
           } else if (s.id.includes('news')) {
              newSec.dataSource = HomeSectionDataSource.News;
              newSec.type = HomeSectionType.ContentList;
              newSec.template = 'news_feed';
           } else if (s.id.includes('business')) {
              newSec.dataSource = HomeSectionDataSource.Businesses;
              newSec.type = HomeSectionType.ContentCarousel;
              newSec.filterData = [{ filterType: HomeSectionFilterType.Featured, filterValue: true }];
              newSec.template = 'featured_businesses';
           } else {
              // Fallback
              newSec.dataSource = HomeSectionDataSource.Businesses;
              newSec.type = HomeSectionType.ContentCarousel;
              newSec.template = 'featured_businesses';
           }
       }

       // Ensure template is set if dataSource is present but template is missing (intermediate migration)
       if (newSec.dataSource && !newSec.template) {
          newSec.template = this.getTemplateForDataSource(newSec.dataSource);
       }

       return newSec as HomeSection;
    });
  }

  // --- Actions ---

  addSection() {
    this.editingIndex = null;
    this.configForm.reset({
      title: 'New Section',
      subTitle: '',
      dataSource: HomeSectionDataSource.Businesses,
      type: HomeSectionType.ContentCarousel,
      filterType: [],
      filterValue_category: [],
      filterValue_businessCategory: [],
      filterValue_text: '',
      linkTitle: 'Link URL',
      linkUrl: '',
      linkType: HomeSectionLinkType.Custom,
      appCategory: HomeSectionAppCategory.Businesses,
      excludedCategories: [],
      limit: 10
    });
    this.showConfigModal.set(true);
  }

  editSection(index: number) {
    this.editingIndex = index;
    const section = this.sections()[index];
    
    // Decompose filterData into form controls
    const filterTypes: string[] = [];
    let categoryValues: string[] = [];
    let businessCategoryValues: string[] = [];
    let textValues: string[] = [];

    if (section.filterData) {
       section.filterData.forEach(fd => {
          if (!filterTypes.includes(fd.filterType)) {
             filterTypes.push(fd.filterType);
          }
          if (fd.filterType === HomeSectionFilterType.Category) {
             if ([HomeSectionDataSource.Businesses, HomeSectionDataSource.Jobs].includes(section.dataSource)) {
                if (fd.filterValue) categoryValues.push(String(fd.filterValue));
             } else {
                if (fd.filterValue) textValues.push(String(fd.filterValue));
             }
          } else if (fd.filterType === HomeSectionFilterType.BusinessCategory) {
             if (fd.filterValue) businessCategoryValues.push(String(fd.filterValue));
          }
       });
    }

    this.configForm.patchValue({
      title: section.title,
      subTitle: section.subTitle || '',
      dataSource: section.dataSource,
      type: section.type,
      filterType: filterTypes,
      filterValue_category: categoryValues,
      filterValue_businessCategory: businessCategoryValues,
      filterValue_text: textValues.join(', '),
      linkTitle: section.linkTitle || 'Link URL',
      linkUrl: section.linkUrl || '',
      linkType: section.linkType || HomeSectionLinkType.Custom,
      appCategory: section.appCategory || HomeSectionAppCategory.Businesses,
      excludedCategories: section.excludedCategories || [],
      limit: section.limit || 10
    });
    this.showConfigModal.set(true);
  }

  saveConfig() {
    if (this.configForm.invalid) return;
    
    const val = this.configForm.value;
    const filterTypes = (val.filterType || []) as string[];
    
    // Construct FilterData
    const filterData: FilterData[] = [];

    if (filterTypes.includes(HomeSectionFilterType.Featured)) {
       filterData.push({ filterType: HomeSectionFilterType.Featured, filterValue: true });
    }

    if (filterTypes.includes(HomeSectionFilterType.Category)) {
       if ([HomeSectionDataSource.Businesses, HomeSectionDataSource.Jobs].includes(val.dataSource)) {
          const cats = (val.filterValue_category || []) as string[];
          cats.forEach(cat => {
             filterData.push({ filterType: HomeSectionFilterType.Category, filterValue: cat });
          });
       } else {
          const textValue = (val.filterValue_text || '') as string;
          textValue.split(',').map(s => s.trim()).filter(s => s).forEach(val => {
             filterData.push({ filterType: HomeSectionFilterType.Category, filterValue: val });
          });
       }
    }

    if (filterTypes.includes(HomeSectionFilterType.BusinessCategory)) {
       const busCats = (val.filterValue_businessCategory || []) as string[];
       busCats.forEach(cat => {
          filterData.push({ filterType: HomeSectionFilterType.BusinessCategory, filterValue: cat });
       });
    }

    // Template Logic based on DataSource mapping
    const templateValue = this.getTemplateForDataSource(val.dataSource);

    const newSection: HomeSection = {
      id: this.editingIndex !== null ? this.sections()[this.editingIndex].id : `sec_${Date.now()}`,
      order: this.editingIndex !== null ? this.sections()[this.editingIndex].order : this.sections().length + 1,
      enabled: this.editingIndex !== null ? this.sections()[this.editingIndex].enabled : true,
      title: val.title || '',
      subTitle: val.subTitle || '',
      dataSource: val.dataSource,
      type: val.type,
      template: templateValue,
      filterData: filterData,
      linkTitle: val.linkTitle || 'Link URL',
      linkUrl: val.linkUrl || '',
      linkType: val.linkType,
      appCategory: val.appCategory,
      excludedCategories: val.excludedCategories || [],
      limit: val.limit
    };

    console.log('Section Saved:', newSection);

    this.sections.update(current => {
      const updated = [...current];
      if (this.editingIndex !== null) {
        updated[this.editingIndex] = newSection;
      } else {
        updated.push(newSection);
      }
      return updated;
    });

    this.showConfigModal.set(false);
  }

  confirmRemove(index: number) {
    this.deleteIndex = index;
    this.showDeleteModal.set(true);
  }

  removeSection() {
    if (this.deleteIndex === null) return;
    this.sections.update(current => {
      const updated = [...current];
      updated.splice(this.deleteIndex!, 1);
      return updated;
    });
    this.showDeleteModal.set(false);
    this.deleteIndex = null;
  }

  toggleEnabled(index: number) {
    this.sections.update(current => {
      const updated = [...current];
      updated[index] = { ...updated[index], enabled: !updated[index].enabled };
      return updated;
    });
  }

  onFilterTypeChange(event: Event, type: string) {
    const checkbox = event.target as HTMLInputElement;
    let currentTypes = (this.configForm.get('filterType')?.value || []) as string[];
    if (!Array.isArray(currentTypes)) currentTypes = currentTypes ? [currentTypes] : [];

    if (checkbox.checked) {
      if (type === HomeSectionFilterType.All) {
        currentTypes = [];
      } else {
        if (!currentTypes.includes(type)) {
          currentTypes.push(type);
        }
      }
    } else {
      currentTypes = currentTypes.filter(t => t !== type);
    }
    this.configForm.get('filterType')?.setValue(currentTypes);
  }

  isFilterTypeSelected(type: string): boolean {
    const currentTypes = this.configForm.get('filterType')?.value;
    if (type === HomeSectionFilterType.All) {
      return !currentTypes || currentTypes.length === 0;
    }
    if (Array.isArray(currentTypes)) {
      return currentTypes.includes(type);
    }
    return currentTypes === type;
  }

  getFilterTypeDisplay(filterData: FilterData[]): string {
    if (!filterData || filterData.length === 0) return 'All';
    
    return filterData.map(fd => {
      if (fd.filterType === HomeSectionFilterType.Featured) return 'Featured';
      if (fd.filterType === HomeSectionFilterType.Category) return 'Category';
      if (fd.filterType === HomeSectionFilterType.BusinessCategory) return 'Business Category';
      return fd.filterType;
    }).join(' + ');
  }

  getFilterValueDisplay(filterData: FilterData[]): string {
    if (!filterData || filterData.length === 0) return '';
    
    const values: string[] = [];
    filterData.forEach(fd => {
       // Check for non-empty string values, ignore booleans
       if (typeof fd.filterValue === 'string' && fd.filterValue) {
          values.push(fd.filterValue);
       }
    });
    
    return values.join(', ');
  }

  onCategoryChange(event: Event, categoryName: string, type: HomeSectionFilterType.Category | HomeSectionFilterType.BusinessCategory) {
    const checkbox = event.target as HTMLInputElement;
    const controlName = type === HomeSectionFilterType.Category ? 'filterValue_category' : 'filterValue_businessCategory';
    const currentValues = (this.configForm.get(controlName)?.value || []) as string[];
    
    let newValues: string[] = [];

    if (checkbox.checked) {
      if (!currentValues.includes(categoryName)) {
        newValues = [...currentValues, categoryName];
      } else {
        newValues = currentValues;
      }
    } else {
      newValues = currentValues.filter(v => v !== categoryName);
    }

    this.configForm.get(controlName)?.setValue(newValues);

    if (type === HomeSectionFilterType.Category) {
        this.updateLinkUrlWithFilters(newValues);
    }
  }

  updateLinkUrlWithFilters(categories: string[]) {
    let currentUrl = this.configForm.get('linkUrl')?.value || '';
    if (currentUrl === null || currentUrl === undefined) currentUrl = '';

    const parts = currentUrl.split('?');
    const baseUrl = parts[0];
    const queryParamsString = parts[1] || '';
    
    const params = new URLSearchParams(queryParamsString);
    
    if (categories.length > 0) {
      params.set('filterBy', categories.join(','));
    } else {
      params.delete('filterBy');
    }
    
    const newQueryString = params.toString().replace(/%2C/g, ',');
    const newUrl = newQueryString ? `${baseUrl}?${newQueryString}` : baseUrl;
    
    this.configForm.get('linkUrl')?.setValue(newUrl);
  }

  isCategorySelected(categoryName: string, type: HomeSectionFilterType.Category | HomeSectionFilterType.BusinessCategory): boolean {
    const controlName = type === HomeSectionFilterType.Category ? 'filterValue_category' : 'filterValue_businessCategory';
    const currentValues = this.configForm.get(controlName)?.value;
    if (Array.isArray(currentValues)) {
      return currentValues.includes(categoryName);
    }
    return false;
  }

  onExcludedCategoryChange(event: Event, categoryName: string) {
    const checkbox = event.target as HTMLInputElement;
    const control = this.configForm.get('excludedCategories');
    const currentValues = (control?.value || []) as string[];
    
    let newValues: string[] = [];

    if (checkbox.checked) {
      if (!currentValues.includes(categoryName)) {
        newValues = [...currentValues, categoryName];
      } else {
        newValues = currentValues;
      }
    } else {
      newValues = currentValues.filter(v => v !== categoryName);
    }
    
    control?.setValue(newValues);
    this.updateLinkUrlWithExclusions(newValues);
  }

  updateLinkUrlWithExclusions(excludedCategories: string[]) {
    let currentUrl = this.configForm.get('linkUrl')?.value || '';
    
    // Handle case where URL might be null/undefined
    if (currentUrl === null || currentUrl === undefined) currentUrl = '';

    const parts = currentUrl.split('?');
    const baseUrl = parts[0];
    const queryParamsString = parts[1] || '';
    
    const params = new URLSearchParams(queryParamsString);
    
    if (excludedCategories.length > 0) {
      params.set('excludeBy', excludedCategories.join(','));
    } else {
      params.delete('excludeBy');
    }
    
    const newQueryString = params.toString().replace(/%2C/g, ','); // Keep commas readable
    const newUrl = newQueryString ? `${baseUrl}?${newQueryString}` : baseUrl;
    
    this.configForm.get('linkUrl')?.setValue(newUrl);
  }

  isExcludedCategorySelected(categoryName: string): boolean {
    const currentValues = this.configForm.get('excludedCategories')?.value;
    if (Array.isArray(currentValues)) {
      return currentValues.includes(categoryName);
    }
    return false;
  }

  // --- Drag and Drop ---

  onDragStart(event: DragEvent, index: number) {
    this.draggedIndex = index;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', index.toString());
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  onDrop(event: DragEvent, dropIndex: number) {
    event.preventDefault();
    if (this.draggedIndex === null || this.draggedIndex === dropIndex) return;

    this.sections.update(current => {
      const updated = [...current];
      const [moved] = updated.splice(this.draggedIndex!, 1);
      updated.splice(dropIndex, 0, moved);
      return updated;
    });
    
    this.draggedIndex = null;
  }

  // --- Persistence ---

  async save() {
    if (!this.authService.isAdmin()) {
      this.toastService.error('Unauthorized action.');
      return;
    }

    this.isSaving.set(true);
    try {
      // Create a clean version of sections to ensure only desired properties are saved.
      const sectionsToSave = this.sections().map((s, i) => ({
        id: s.id,
        order: i + 1,
        enabled: s.enabled,
        title: s.title,
        subTitle: s.subTitle || '',
        dataSource: s.dataSource,
        type: s.type,
        template: s.template || '',
        filterData: s.filterData || [],
        linkTitle: s.linkTitle || '',
        linkUrl: s.linkUrl || '',
        linkType: s.linkType || HomeSectionLinkType.Custom,
        appCategory: s.appCategory || HomeSectionAppCategory.Businesses,
        excludedCategories: s.excludedCategories || [],
        limit: s.limit || 10
      }));

      console.log('--- SAVING SECTIONS TO DB ---', JSON.stringify(sectionsToSave, null, 2));

      // Use update to avoid overwriting other app_config fields
      await this.firebaseService.update('settings', 'app_config', {
        homeSections: sectionsToSave
      });
      
      this.sections.set(sectionsToSave);
      this.toastService.success('Home layout saved successfully.');
    } catch (e: any) {
      console.error(e);
      this.toastService.error('Save failed: ' + e.message);
    } finally {
      this.isSaving.set(false);
    }
  }
}
