import { Component, ElementRef, ViewChild, AfterViewInit, forwardRef, input, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import Quill from 'quill';

@Component({
  selector: 'app-rich-text-editor',
  standalone: true,
  imports: [CommonModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RichTextEditorComponent),
      multi: true
    }
  ],
  template: `
    <div class="bg-white rounded-lg border border-slate-300 overflow-hidden transition-shadow focus-within:ring-2 focus-within:ring-orange-500 focus-within:border-orange-500 flex flex-col resize-y" 
         [style.height]="height()">
      <div #editorContainer class="flex-1 overflow-hidden"></div>
    </div>
  `
})
export class RichTextEditorComponent implements AfterViewInit, OnDestroy, ControlValueAccessor {
  height = input<string>('200px');
  placeholder = input<string>('');

  @ViewChild('editorContainer') editorContainer!: ElementRef;
  quill!: Quill;
  
  onChange = (value: any) => {};
  onTouched = () => {};
  
  private initialValue: string = '';

  ngAfterViewInit() {
    if (!this.editorContainer) return;

    this.quill = new Quill(this.editorContainer.nativeElement, {
      theme: 'snow',
      placeholder: this.placeholder(),
      modules: {
        toolbar: [
          [{ 'header': [1, 2, 3, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ 'list': 'ordered'}, { 'list': 'bullet' }],
          [{ 'color': [] }, { 'background': [] }],
          ['link', 'clean']
        ]
      }
    });

    if (this.initialValue) {
      this.quill.clipboard.dangerouslyPasteHTML(this.initialValue);
    }

    this.quill.on('text-change', () => {
      const html = this.quill.root.innerHTML;
      const text = this.quill.getText();
      // If text is empty, set form value to empty string to avoid <p><br></p>
      if (text.trim().length === 0 && (html === '<p><br></p>' || html === '')) {
          this.onChange('');
      } else {
          this.onChange(html);
      }
    });

    this.quill.on('selection-change', (range) => {
      if (!range) {
        this.onTouched();
      }
    });
  }

  ngOnDestroy() {
    // Cleanup handled by DOM removal
  }

  writeValue(value: any): void {
    if (this.quill) {
      if (value) {
         this.quill.clipboard.dangerouslyPasteHTML(value);
      } else {
         this.quill.setText('');
      }
    } else {
      this.initialValue = value || '';
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    if (this.quill) {
      this.quill.enable(!isDisabled);
    }
  }
}