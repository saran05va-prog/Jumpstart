interface FileSystemDirectoryHandle {
  name: string;
  queryPermission(descriptor?: FileSystemPermissionDescriptor): Promise<PermissionState>;
  requestPermission(descriptor?: FileSystemPermissionDescriptor): Promise<PermissionState>;
  values(): AsyncIterableIterator<FileSystemHandle>;
  getDirectoryHandle(name: string): Promise<FileSystemDirectoryHandle>;
  getFileHandle(name: string, options?: FileSystemGetFileOptions): Promise<FileSystemFileHandle>;
  removeEntry(name: string, options?: FileSystemRemoveEntryOptions): Promise<void>;
}

interface FileSystemFileHandle {
  name: string;
  getFile(): Promise<File>;
  createWritable(options?: FileSystemCreateWritableOptions): Promise<FileSystemWritableFileStream>;
}

interface FileSystemWritableFileStream extends WritableStream {
  write(data: string | Blob | ArrayBuffer | ArrayBufferView): Promise<void>;
  close(): Promise<void>;
}

interface FileSystemHandle {
  kind: "file" | "directory";
  name: string;
}

interface FileSystemPermissionDescriptor {
  mode?: "read" | "readwrite";
}

interface FileSystemGetFileOptions {
  create?: boolean;
}

interface FileSystemRemoveEntryOptions {
  recursive?: boolean;
}

interface FileSystemCreateWritableOptions {
  keepExistingData?: boolean;
}

interface Window {
  showDirectoryPicker(options?: {
    mode?: "read" | "readwrite";
    id?: string;
    startIn?: "desktop" | "documents" | "downloads" | "music" | "pictures" | "videos";
  }): Promise<FileSystemDirectoryHandle>;
}
