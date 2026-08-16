
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
  list,
  listAll,
  getMetadata
} from 'firebase/storage';
import { createUserWithEmailAndPassword, getAuth, sendPasswordResetEmail, signOut, updateProfile, Auth } from 'firebase/auth';
import { getFunctions, httpsCallable, Functions } from 'firebase/functions';

export interface TextSearchMatch {
  collectionPath: string;
  docId: string;
  fieldPath: string;
  occurrences: number;
  preview: string;
}

export interface TextReplaceResult {
  matchedDocuments: number;
  updatedDocuments: number;
  updatedFields: number;
  occurrences: number;
}

const firebaseConfig = {
  apiKey: "AIzaSyA9t9nkALn-Y8XobFFCX4YtpE3N8qSPO2Y",
  authDomain: "ceyhallo-89e40.firebaseapp.com",
  databaseURL: "https://ceyhallo-89e40-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "ceyhallo-89e40",
  storageBucket: "ceyhallo-eu",
  messagingSenderId: "253346274750",
  appId: "1:253346274750:web:f511016dfe4946392b2def",
  measurementId: "G-CJK43PN7F7"
};

const defaultTextReplaceCollections = [
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
  'countries',
  'legal',
  'users'
];

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

  async findTextInKnownCollections(searchText: string, collectionPaths = defaultTextReplaceCollections): Promise<TextSearchMatch[]> {
    const needle = searchText.trim();
    if (!needle) return [];

    const matches: TextSearchMatch[] = [];

    for (const collectionPath of collectionPaths) {
      try {
        const snapshot = await getDocs(collection(this.firestore, collectionPath));
        snapshot.docs.forEach((document) => {
          matches.push(...this.findTextInValue(document.data(), needle, collectionPath, document.id));
        });
      } catch (error) {
        console.warn(`Skipping text search for '${collectionPath}':`, error);
      }
    }

    return matches;
  }

  async replaceTextInKnownCollections(searchText: string, replacementText: string, collectionPaths = defaultTextReplaceCollections): Promise<TextReplaceResult> {
    const needle = searchText.trim();
    if (!needle) {
      return { matchedDocuments: 0, updatedDocuments: 0, updatedFields: 0, occurrences: 0 };
    }

    let matchedDocuments = 0;
    let updatedDocuments = 0;
    let updatedFields = 0;
    let occurrences = 0;
    const pendingWrites: Array<{ path: string; id: string; data: any }> = [];

    for (const collectionPath of collectionPaths) {
      try {
        const snapshot = await getDocs(collection(this.firestore, collectionPath));
        snapshot.docs.forEach((document) => {
          const result = this.replaceTextInValue(document.data(), needle, replacementText);
          if (result.occurrences > 0) {
            matchedDocuments += 1;
            updatedFields += result.fields;
            occurrences += result.occurrences;
            pendingWrites.push({ path: collectionPath, id: document.id, data: result.value });
          }
        });
      } catch (error) {
        console.warn(`Skipping text replace for '${collectionPath}':`, error);
      }
    }

    for (let start = 0; start < pendingWrites.length; start += 500) {
      const batch = writeBatch(this.firestore);
      pendingWrites.slice(start, start + 500).forEach((write) => {
        batch.set(doc(this.firestore, write.path, write.id), write.data);
      });
      await batch.commit();
      updatedDocuments += pendingWrites.slice(start, start + 500).length;
    }

    return { matchedDocuments, updatedDocuments, updatedFields, occurrences };
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

  async listFilesPage(path: string, pageToken?: string, maxResults = 48): Promise<{ items: any[], folders: any[], nextPageToken?: string }> {
    try {
      const listRef = storageRef(this.storage, path);
      const res = await list(listRef, { maxResults, pageToken });

      const folders = res.prefixes.map(p => ({
        name: p.name,
        path: p.fullPath
      }));

      const promises = res.items.map(async (itemRef) => {
        try {
          if (itemRef.name === '.keep') return null;

          const [url, meta] = await Promise.all([
            getDownloadURL(itemRef),
            getMetadata(itemRef)
          ]);

          return {
            id: itemRef.fullPath,
            name: itemRef.name,
            url,
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

      return { items, folders, nextPageToken: res.nextPageToken };
    } catch (error) {
      console.error('List files page error:', error);
      throw error;
    }
  }

  async listFileReferences(path: string): Promise<{ fileRefs: Array<{ id: string; name: string; path: string }>, folders: any[] }> {
    try {
      const listRef = storageRef(this.storage, path);
      const res = await listAll(listRef);

      const folders = res.prefixes
        .map(p => ({
          name: p.name,
          path: p.fullPath
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      const fileRefs = res.items
        .filter((itemRef) => itemRef.name !== '.keep')
        .map((itemRef) => ({
          id: itemRef.fullPath,
          name: itemRef.name,
          path: itemRef.fullPath
        }))
        .sort((a, b) => b.name.localeCompare(a.name));

      return { fileRefs, folders };
    } catch (error) {
      console.error('List file references error:', error);
      throw error;
    }
  }

  async getFilesByPaths(paths: string[]): Promise<any[]> {
    const promises = paths.map(async (path) => {
      const itemRef = storageRef(this.storage, path);

      try {
        const [url, meta] = await Promise.all([
          getDownloadURL(itemRef),
          getMetadata(itemRef)
        ]);

        return {
          id: itemRef.fullPath,
          name: itemRef.name,
          url,
          path: itemRef.fullPath,
          type: meta.contentType || 'application/octet-stream',
          size: meta.size,
          createdAt: meta.timeCreated,
          uploadedBy: meta.customMetadata?.uploadedBy || 'Unknown'
        };
      } catch (err) {
        console.warn('Skipping file due to load error:', path, err);
        return null;
      }
    });

    const results = await Promise.all(promises);
    return results.filter((item): item is NonNullable<typeof item> => item !== null);
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

  private findTextInValue(value: unknown, needle: string, collectionPath: string, docId: string, fieldPath = ''): TextSearchMatch[] {
    if (typeof value === 'string') {
      const occurrences = this.countOccurrences(value, needle);
      return occurrences > 0
        ? [{
          collectionPath,
          docId,
          fieldPath: fieldPath || '(document)',
          occurrences,
          preview: this.buildSearchPreview(value, needle)
        }]
        : [];
    }

    if (Array.isArray(value)) {
      return value.flatMap((item, index) => this.findTextInValue(item, needle, collectionPath, docId, `${fieldPath}[${index}]`));
    }

    if (this.isPlainObject(value)) {
      return Object.entries(value).flatMap(([key, item]) => {
        const nextPath = fieldPath ? `${fieldPath}.${key}` : key;
        return this.findTextInValue(item, needle, collectionPath, docId, nextPath);
      });
    }

    return [];
  }

  private replaceTextInValue(value: unknown, needle: string, replacement: string): { value: unknown; occurrences: number; fields: number } {
    if (typeof value === 'string') {
      const occurrences = this.countOccurrences(value, needle);
      return {
        value: occurrences > 0 ? value.split(needle).join(replacement) : value,
        occurrences,
        fields: occurrences > 0 ? 1 : 0
      };
    }

    if (Array.isArray(value)) {
      let occurrences = 0;
      let fields = 0;
      const nextValue = value.map((item) => {
        const result = this.replaceTextInValue(item, needle, replacement);
        occurrences += result.occurrences;
        fields += result.fields;
        return result.value;
      });
      return { value: nextValue, occurrences, fields };
    }

    if (this.isPlainObject(value)) {
      let occurrences = 0;
      let fields = 0;
      const nextValue = Object.fromEntries(
        Object.entries(value).map(([key, item]) => {
          const result = this.replaceTextInValue(item, needle, replacement);
          occurrences += result.occurrences;
          fields += result.fields;
          return [key, result.value];
        })
      );
      return { value: nextValue, occurrences, fields };
    }

    return { value, occurrences: 0, fields: 0 };
  }

  private countOccurrences(value: string, needle: string) {
    if (!needle) return 0;
    return value.split(needle).length - 1;
  }

  private buildSearchPreview(value: string, needle: string) {
    const index = value.indexOf(needle);
    if (index === -1) return value.slice(0, 120);
    const start = Math.max(0, index - 48);
    const end = Math.min(value.length, index + needle.length + 48);
    return `${start > 0 ? '...' : ''}${value.slice(start, end)}${end < value.length ? '...' : ''}`;
  }

  private isPlainObject(value: unknown): value is Record<string, unknown> {
    if (!value || Object.prototype.toString.call(value) !== '[object Object]') return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  }
}
