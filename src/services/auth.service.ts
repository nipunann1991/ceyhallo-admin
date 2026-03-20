
import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser,
  reauthenticateWithCredential,
  EmailAuthProvider
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { FirebaseService } from './firebase.service';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private firebaseService = inject(FirebaseService);
  private router: Router = inject(Router);

  currentUser = signal<User | null>(null);
  isLoading = signal<boolean>(true);

  isAdmin = computed(() => {
    return this.currentUser()?.role === 'admin';
  });

  constructor() {
    this.initAuthListener();
  }

  private initAuthListener() {
    onAuthStateChanged(this.firebaseService.auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch user profile from Firestore to get role
        try {
          const userDocRef = doc(this.firebaseService.firestore, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data() as User;
            this.currentUser.set({ id: firebaseUser.uid, ...userData });
          } else {
            // Fallback: User in Auth but not in Firestore (e.g. deleted manually or create failed)
            const newUser: User = {
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
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      } else {
        this.currentUser.set(null);
        if (this.router.url !== '/login') {
           await this.router.navigate(['/login']);
        }
      }
      this.isLoading.set(false);
    });
  }

  async login(email: string, pass: string) {
    this.isLoading.set(true);
    try {
      await signInWithEmailAndPassword(this.firebaseService.auth, email, pass);
    } catch (error) {
      throw error;
    } finally {
      this.isLoading.set(false);
    }
  }

  async register(email: string, pass: string) {
    this.isLoading.set(true);
    try {
      const credential = await createUserWithEmailAndPassword(this.firebaseService.auth, email, pass);
      
      // Create user document
      const newUser: User = {
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
    } catch (error) {
      throw error;
    } finally {
      this.isLoading.set(false);
    }
  }

  async logout() {
    await signOut(this.firebaseService.auth);
    this.currentUser.set(null);
    await this.router.navigate(['/login']);
  }

  async verifyCurrentPassword(password: string): Promise<void> {
    const user = this.firebaseService.auth.currentUser;
    if (!user || !user.email) throw new Error('No user logged in');

    const credential = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, credential);
  }
}
