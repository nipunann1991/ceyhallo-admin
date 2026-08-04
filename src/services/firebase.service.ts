
import { Injectable } from '@angular/core';
import { deleteApp, initializeApp, FirebaseApp } from 'firebase/app';
import { 
  getFirestore, 
  Firestore, 
  collection, 
  doc, 
  addDoc, 
  setDoc, 
  getDoc, 
  getDocs,
  updateDoc, 
  deleteDoc, 
  writeBatch,
  onSnapshot,
  query, 
  where
} from 'firebase/firestore';
import { 
  getStorage, 
  FirebaseStorage, 
  ref as storageRef, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject,
  listAll,
  getMetadata
} from 'firebase/storage';
import { createUserWithEmailAndPassword, getAuth, sendPasswordResetEmail, signOut, updateProfile, Auth } from 'firebase/auth';
import { getFunctions, httpsCallable, Functions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyA9t9nkALn-Y8XobFFCX4YtpE3N8qSPO2Y",
  authDomain: "ceyhallo-89e40.firebaseapp.com",
  databaseURL: "https://ceyhallo-89e40-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "ceyhallo-89e40",
  storageBucket: "ceyhallo-89e40.firebasestorage.app",
  messagingSenderId: "253346274750",
  appId: "1:253346274750:web:f511016dfe4946392b2def",
  measurementId: "G-CJK43PN7F7"
};

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  public app: FirebaseApp;
  public firestore: Firestore;
  public storage: FirebaseStorage;
  public auth: Auth;
  public functions: Functions;

  constructor() {
    this.app = initializeApp(firebaseConfig);
    this.firestore = getFirestore(this.app);
    this.storage = getStorage(this.app);
    this.auth = getAuth(this.app);
    this.functions = getFunctions(this.app);
  }

  // --- Firestore ---

  listenToPath<T>(path: string, callback: (data: T[]) => void, errorCallback?: (error: any) => void) {
    const colRef = collection(this.firestore, path);
    return onSnapshot(colRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as T[];
      callback(data);
    }, (error) => {
      if (errorCallback) {
        errorCallback(error);
      } else {
        console.error(`Error listening to ${path}:`, error);
      }
    });
  }

  listenToDocument<T>(collectionPath: string, docId: string, callback: (data: T | null) => void, errorCallback?: (error: any) => void) {
    const docRef = doc(this.firestore, collectionPath, docId);
    return onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        callback({ id: snapshot.id, ...snapshot.data() } as T);
      } else {
        callback(null);
      }
    }, (error) => {
      if (errorCallback) {
        errorCallback(error);
      } else {
        console.error(`Error listening to document ${collectionPath}/${docId}:`, error);
      }
    });
  }

  async getDocument(path: string, id: string): Promise<any> {
    try {
      const docRef = doc(this.firestore, path, id);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        return { id: snapshot.id, ...snapshot.data() };
      }
      return null;
    } catch (error) {
      console.error(`Error getting doc ${path}/${id}:`, error);
      throw error;
    }
  }

  async create(path: string, data: any) {
    const colRef = collection(this.firestore, path);
    const docRef = await addDoc(colRef, data);
    return { id: docRef.id, ...data };
  }

  async createMany(path: string, records: any[]) {
    const created: any[] = [];
    const chunkSize = 500;

    for (let start = 0; start < records.length; start += chunkSize) {
      const batch = writeBatch(this.firestore);
      const chunk = records.slice(start, start + chunkSize);

      chunk.forEach((data) => {
        const docRef = doc(collection(this.firestore, path));
        batch.set(docRef, data);
        created.push({ id: docRef.id, ...data });
      });

      await batch.commit();
    }

    return created;
  }

  async saveMany(path: string, operations: Array<{ id?: string; data: any }>) {
    let created = 0;
    let updated = 0;
    const chunkSize = 500;

    for (let start = 0; start < operations.length; start += chunkSize) {
      const batch = writeBatch(this.firestore);
      const chunk = operations.slice(start, start + chunkSize);

      chunk.forEach((operation) => {
        if (operation.id) {
          batch.update(doc(this.firestore, path, operation.id), operation.data);
          updated += 1;
        } else {
          batch.set(doc(collection(this.firestore, path)), operation.data);
          created += 1;
        }
      });

      await batch.commit();
    }

    return { created, updated };
  }

  async createAuthUserWithProfile(data: any) {
    const secondaryApp = initializeApp(firebaseConfig, `secondary-${Date.now()}`);
    const secondaryAuth = getAuth(secondaryApp);
    const password = this.generateInvitePassword();

    try {
      const credential = await createUserWithEmailAndPassword(secondaryAuth, data.email, password);
      if (data.name) {
        await updateProfile(credential.user, { displayName: data.name });
      }

      const userData = {
        ...data,
        id: credential.user.uid
      };

      await setDoc(doc(this.firestore, 'users', credential.user.uid), userData, { merge: true });
      try {
        await sendPasswordResetEmail(secondaryAuth, data.email);
      } catch (error) {
        // The account and profile are valid even when Firebase email delivery is not configured.
        console.warn('Unable to send the account setup email:', error);
      }
      await signOut(secondaryAuth);

      return userData;
    } finally {
      await deleteApp(secondaryApp);
    }
  }

  private generateInvitePassword(): string {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
    const values = crypto.getRandomValues(new Uint32Array(20));
    return Array.from(values, (value) => alphabet[value % alphabet.length]).join('');
  }
  
  async set(path: string, data: any) {
    // Expects path like 'collection/docId'
    const parts = path.split('/');
    if (parts.length % 2 !== 0) {
       throw new Error('Set operation requires a full document path (collection/docId).');
    }
    const docRef = doc(this.firestore, path);
    await setDoc(docRef, data, { merge: true });
  }

  async update(path: string, id: string, data: any) {
    const docRef = doc(this.firestore, path, id);
    await updateDoc(docRef, data);
  }

  async delete(path: string, id: string) {
    const docRef = doc(this.firestore, path, id);
    await deleteDoc(docRef);
  }

  async deleteDocumentsByField(collectionPath: string, field: string, value: any) {
    try {
      const colRef = collection(this.firestore, collectionPath);
      const q = query(colRef, where(field, '==', value));
      const snapshot = await getDocs(q);
      const promises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(promises);
    } catch (error: any) {
      // Gracefully handle permission errors for cleanup tasks
      if (error.code === 'permission-denied' || error.message?.includes('Missing or insufficient permissions')) {
        console.warn(`[Cleanup] Permission denied for deleting docs in '${collectionPath}'. This is non-fatal if using Storage as primary source.`);
      } else {
        console.error('Error deleting documents by field:', error);
      }
    }
  }

  // --- Storage ---

  async uploadFile(path: string, file: Blob | File, customMetadata?: any): Promise<string> {
    try {
      const sRef = storageRef(this.storage, path);
      // Include custom metadata if provided
      const metadata = customMetadata ? { customMetadata } : undefined;
      
      const snapshot = await uploadBytes(sRef, file, metadata);
      const downloadURL = await getDownloadURL(snapshot.ref);
      return downloadURL;
    } catch (error) {
      console.error('File upload failed:', error);
      throw error;
    }
  }

  /**
   * Lists files and folders (prefixes) at the given path.
   * Filters out .keep files used for folder persistence.
   */
  async listFiles(path: string): Promise<{ items: any[], folders: any[] }> {
    try {
      const listRef = storageRef(this.storage, path);
      const res = await listAll(listRef);
      
      const folders = res.prefixes.map(p => ({
        name: p.name,
        path: p.fullPath
      }));

      // Fetch details for each item in parallel
      const promises = res.items.map(async (itemRef) => {
        try {
          // Skip .keep files
          if (itemRef.name === '.keep') return null;

          const [url, meta] = await Promise.all([
            getDownloadURL(itemRef),
            getMetadata(itemRef)
          ]);
          
          return {
            id: itemRef.name, // Use filename as ID since we don't have a DB ID
            name: itemRef.name,
            url: url,
            path: itemRef.fullPath,
            type: meta.contentType || 'application/octet-stream',
            size: meta.size,
            createdAt: meta.timeCreated,
            uploadedBy: meta.customMetadata?.uploadedBy || 'Unknown'
          };
        } catch (err) {
          console.warn('Skipping file due to load error:', itemRef.name, err);
          return null; 
        }
      });
      
      const results = await Promise.all(promises);
      const items = results
        .filter((item): item is NonNullable<typeof item> => item !== null)
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

      return { items, folders };
    } catch (error) {
      console.error('List files error:', error);
      throw error;
    }
  }

  async deleteFile(path: string): Promise<void> {
    try {
      const sRef = storageRef(this.storage, path);
      await deleteObject(sRef);
    } catch (error) {
      console.error('File delete failed:', error);
      throw error;
    }
  }

  async deleteFolder(path: string): Promise<void> {
    const folderRef = storageRef(this.storage, path);
    const contents = await listAll(folderRef);

    await Promise.all([
      ...contents.items.map((item) => deleteObject(item)),
      ...contents.prefixes.map((folder) => this.deleteFolder(folder.fullPath))
    ]);
  }

  async createFolder(path: string): Promise<void> {
    // Firebase doesn't have real folders, so we create a hidden .keep file
    const keepRef = storageRef(this.storage, `${path}/.keep`);
    await uploadBytes(keepRef, new Blob([]));
  }

  async moveFile(oldPath: string, newPath: string): Promise<void> {
    try {
      // 1. Get original file details
      const oldRef = storageRef(this.storage, oldPath);
      const url = await getDownloadURL(oldRef);
      const metadata = await getMetadata(oldRef);

      // 2. Fetch content
      const response = await fetch(url);
      const blob = await response.blob();

      // 3. Upload to new location
      const newRef = storageRef(this.storage, newPath);
      await uploadBytes(newRef, blob, {
        contentType: metadata.contentType,
        customMetadata: metadata.customMetadata
      });

      // 4. Delete old file
      await deleteObject(oldRef);
    } catch (error) {
      console.error(`Move failed from ${oldPath} to ${newPath}:`, error);
      throw error;
    }
  }

  // --- Functions ---

  async callFunction(functionName: string, data: any): Promise<any> {
    const callable = httpsCallable(this.functions, functionName);
    const result = await callable(data);
    return result.data;
  }
}
