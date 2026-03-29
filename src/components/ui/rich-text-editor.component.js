var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Component, ViewChild, forwardRef, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import Quill from 'quill';
let RichTextEditorComponent = class RichTextEditorComponent {
    constructor() {
        this.height = input('200px');
        this.placeholder = input('');
        this.onChange = (value) => { };
        this.onTouched = () => { };
        this.initialValue = '';
    }
    ngAfterViewInit() {
        if (!this.editorContainer)
            return;
        this.quill = new Quill(this.editorContainer.nativeElement, {
            theme: 'snow',
            placeholder: this.placeholder(),
            modules: {
                toolbar: [
                    [{ 'header': [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
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
            }
            else {
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
    writeValue(value) {
        if (this.quill) {
            if (value) {
                this.quill.clipboard.dangerouslyPasteHTML(value);
            }
            else {
                this.quill.setText('');
            }
        }
        else {
            this.initialValue = value || '';
        }
    }
    registerOnChange(fn) {
        this.onChange = fn;
    }
    registerOnTouched(fn) {
        this.onTouched = fn;
    }
    setDisabledState(isDisabled) {
        if (this.quill) {
            this.quill.enable(!isDisabled);
        }
    }
};
__decorate([
    ViewChild('editorContainer')
], RichTextEditorComponent.prototype, "editorContainer", void 0);
RichTextEditorComponent = __decorate([
    Component({
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
], RichTextEditorComponent);
export { RichTextEditorComponent };
