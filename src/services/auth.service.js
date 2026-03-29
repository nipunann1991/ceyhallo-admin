var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { FirebaseService } from './firebase.service';
let AuthService = class AuthService {
    constructor() {
        this.firebaseService = inject(FirebaseService);
        this.router = inject(Router);
        this.currentUser = signal(null);
        this.isLoading = signal(true);
        this.isAdmin = computed(() => {
            return this.currentUser()?.role === 'admin';
        });
        this.initAuthListener();
    }
    initAuthListener() {
        onAuthStateChanged(this.firebaseService.auth, async (firebaseUser) => {
            if (firebaseUser) {
                // Fetch user profile from Firestore to get role
                try {
                    const userDocRef = doc(this.firebaseService.firestore, 'users', firebaseUser.uid);
                    const userDoc = await getDoc(userDocRef);
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        this.currentUser.set({ id: firebaseUser.uid, ...userData });
                    }
                    else {
                        // Fallback: User in Auth but not in Firestore (e.g. deleted manually or create failed)
                        const newUser = {
                            id: firebaseUser.uid,
                            email: firebaseUser.email || '',
                            name: firebaseUser.displayName || 'User',
                            role: 'user',
                            status: 'active',
                            createdAt: new Date().toISOString()
                        };
                        // Restore the document in Firestore
                        await setDoc(userDocRef, newUser);
                        this.currentUser.set(newUser);
                    }
                    // Redirect if on login page
                    if (this.router.url === '/login' || this.router.url === '/') {
                        await this.router.navigate(['/dashboard']);
                    }
                }
                catch (error) {
                    console.error('Error fetching user profile:', error);
                }
            }
            else {
                this.currentUser.set(null);
                if (this.router.url !== '/login') {
                    await this.router.navigate(['/login']);
                }
            }
            this.isLoading.set(false);
        });
    }
    async login(email, pass) {
        this.isLoading.set(true);
        try {
            await signInWithEmailAndPassword(this.firebaseService.auth, email, pass);
        }
        catch (error) {
            throw error;
        }
        finally {
            this.isLoading.set(false);
        }
    }
    async register(email, pass) {
        this.isLoading.set(true);
        try {
            const credential = await createUserWithEmailAndPassword(this.firebaseService.auth, email, pass);
            // Create user document
            const newUser = {
                id: credential.user.uid,
                email: email,
                name: email.split('@')[0],
                role: 'user',
                status: 'active',
                createdAt: new Date().toISOString()
            };
            await setDoc(doc(this.firebaseService.firestore, 'users', credential.user.uid), newUser);
            this.currentUser.set(newUser);
            await this.router.navigate(['/dashboard']);
        }
        catch (error) {
            throw error;
        }
        finally {
            this.isLoading.set(false);
        }
    }
    async logout() {
        await signOut(this.firebaseService.auth);
        this.currentUser.set(null);
        await this.router.navigate(['/login']);
    }
    async verifyCurrentPassword(password) {
        const user = this.firebaseService.auth.currentUser;
        if (!user || !user.email)
            throw new Error('No user logged in');
        const credential = EmailAuthProvider.credential(user.email, password);
        await reauthenticateWithCredential(user, credential);
    }
};
AuthService = __decorate([
    Injectable({
        providedIn: 'root'
    })
], AuthService);
export { AuthService };
