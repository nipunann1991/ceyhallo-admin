var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Injectable, signal } from '@angular/core';
let ToastService = class ToastService {
    constructor() {
        this.toasts = signal([]);
        this.counter = 0;
    }
    show(message, type = 'info') {
        const id = this.counter++;
        const toast = { id, message, type };
        this.toasts.update(current => [...current, toast]);
        // Auto dismiss
        setTimeout(() => {
            this.remove(id);
        }, 3000);
    }
    success(message) {
        this.show(message, 'success');
    }
    error(message) {
        this.show(message, 'error');
    }
    info(message) {
        this.show(message, 'info');
    }
    remove(id) {
        this.toasts.update(current => current.filter(t => t.id !== id));
    }
};
ToastService = __decorate([
    Injectable({
        providedIn: 'root'
    })
], ToastService);
export { ToastService };
