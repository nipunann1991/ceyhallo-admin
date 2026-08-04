
import { Injectable, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
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
import { ALL_ADMIN_PAGE_PATHS } from '../constants/admin-pages';
import { AuthActions } from '../store/auth.actions';
import { selectAuthError, selectAuthIsLoading, selectCurrentUser } from '../store/auth.selectors';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private firebaseService = inject(FirebaseService);
  private router: Router = inject(Router);
  private store = inject(Store);

  currentUser = this.store.selectSignal(selectCurrentUser);
  isLoading = this.store.selectSignal(selectAuthIsLoading);
  error = this.store.selectSignal(selectAuthError);

  isAdmin = computed(() => {
    return this.currentUser()?.role === 'admin';
  });

  canManageContent = computed(() => {
    const role = this.currentUser()?.role;
    return role === 'admin' || role === 'editor';
  });

  private normalizeAllowedPages(user: User): string[] {
    if (user.role === 'admin') return ALL_ADMIN_PAGE_PATHS;

    const allowedPages = Array.isArray(user.allowedPages)
      ? user.allowedPages.filter((page): page is string => typeof page === 'string' && page.length > 0)
      : [];

    return user.role === 'editor'
      ? Array.from(new Set([...allowedPages, '/media']))
      : allowedPages;
  }

  getAllowedPages(): string[] {
    const user = this.currentUser();
    if (!user) return [];
    return this.normalizeAllowedPages(user);
  }

  canAccessPath(path: string): boolean {
    const user = this.currentUser();
    if (!user) return false;
    if (user.role === 'admin') return true;

    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    if (normalizedPath === '/no-access') return true;
    return this.getAllowedPages().some((allowedPath) =>
      normalizedPath === allowedPath || normalizedPath.startsWith(`${allowedPath}/`)
    );
  }

  getFirstAccessiblePath(): string {
    const allowedPages = this.getAllowedPages();
    return allowedPages[0] || '/no-access';
  }

  hasAccessiblePages(): boolean {
    return this.getAllowedPages().length > 0;
  }

  constructor() {
    this.initAuthListener();
  }

  private initAuthListener() {
    onAuthStateChanged(this.firebaseService.auth, async (firebaseUser) => {
      this.store.dispatch(AuthActions.setLoading({ isLoading: true }));
      if (firebaseUser) {
        // Fetch user profile from Firestore to get role
        try {
          const userDocRef = doc(this.firebaseService.firestore, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data() as User;
            const user = {
              id: firebaseUser.uid,
              ...userData,
              allowedPages: this.normalizeAllowedPages({ id: firebaseUser.uid, ...userData })
            };
            this.store.dispatch(AuthActions.setCurrentUser({ user }));
          } else {
            // Fallback: User in Auth but not in Firestore (e.g. deleted manually or create failed)
            const newUser: User = {
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              name: firebaseUser.displayName || 'User',
              role: 'user',
              allowedPages: [],
              status: 'active',
              createdAt: new Date().toISOString()
            };

            // Restore the document in Firestore
            await setDoc(userDocRef, newUser);
            
            this.store.dispatch(AuthActions.setCurrentUser({ user: newUser }));
          }
          
          if (!this.hasAccessiblePages()) {
            await this.logout();
            return;
          }

          // Redirect if on login page
          if (this.router.url === '/login' || this.router.url === '/') {
             await this.router.navigate([this.getFirstAccessiblePath()]);
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
          this.store.dispatch(AuthActions.setError({ error: 'Unable to load user profile.' }));
        }
      } else {
        this.store.dispatch(AuthActions.setCurrentUser({ user: null }));
        if (this.router.url !== '/login') {
           await this.router.navigate(['/login']);
        }
      }
      this.store.dispatch(AuthActions.setLoading({ isLoading: false }));
    });
  }

  async login(email: string, pass: string) {
    this.store.dispatch(AuthActions.setLoading({ isLoading: true }));
    this.store.dispatch(AuthActions.setError({ error: null }));
    try {
      await signInWithEmailAndPassword(this.firebaseService.auth, email, pass);
    } catch (error) {
      this.store.dispatch(AuthActions.setError({ error: this.toAuthErrorMessage(error) }));
      throw error;
    } finally {
      this.store.dispatch(AuthActions.setLoading({ isLoading: false }));
    }
  }

  async register(email: string, pass: string) {
    this.store.dispatch(AuthActions.setLoading({ isLoading: true }));
    this.store.dispatch(AuthActions.setError({ error: null }));
    try {
      const credential = await createUserWithEmailAndPassword(this.firebaseService.auth, email, pass);
      
      // Create user document
      const newUser: User = {
        id: credential.user.uid,
        email: email,
        name: email.split('@')[0],
        role: 'user', 
        allowedPages: [],
        status: 'active',
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(this.firebaseService.firestore, 'users', credential.user.uid), newUser);
      
      this.store.dispatch(AuthActions.setCurrentUser({ user: newUser }));
      await this.router.navigate([this.getFirstAccessiblePath()]);
    } catch (error) {
      this.store.dispatch(AuthActions.setError({ error: this.toAuthErrorMessage(error) }));
      throw error;
    } finally {
      this.store.dispatch(AuthActions.setLoading({ isLoading: false }));
    }
  }

  async logout() {
    await signOut(this.firebaseService.auth);
    this.store.dispatch(AuthActions.logout());
    await this.router.navigate(['/login']);
  }

  async verifyCurrentPassword(password: string): Promise<void> {
    const user = this.firebaseService.auth.currentUser;
    if (!user || !user.email) throw new Error('No user logged in');

    const credential = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, credential);
  }

  private toAuthErrorMessage(error: unknown) {
    if (error && typeof error === 'object' && 'code' in error) {
      const code = String((error as { code: unknown }).code);
      if (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password') {
        return 'Invalid email or password.';
      }
      if (code === 'auth/too-many-requests') {
        return 'Too many failed attempts. Please try again later.';
      }
    }
    if (error && typeof error === 'object' && 'message' in error) {
      return 'Authentication failed: ' + String((error as { message: unknown }).message);
    }
    return 'Authentication failed.';
  }
}
