
export interface MediaItem {
  id: string;
  name: string;
  url: string;
  path: string; // Storage path used for deletion
  type: string; // MIME type
  size: number; // Bytes
  createdAt: string;
  uploadedBy?: string;
}
