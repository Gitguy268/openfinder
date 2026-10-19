// Chromium-only File System Access API members that TypeScript's DOM library does not include.
interface FileSystemHandle {
  queryPermission(options?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>
  requestPermission(options?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>
}
interface DataTransferItem {
  getAsFileSystemHandle?(): Promise<FileSystemHandle | null>
}
interface Window {
  showDirectoryPicker?(options?: { mode?: 'read' | 'readwrite'; id?: string }): Promise<FileSystemDirectoryHandle>
}
interface Navigator {
  userAgentData?: { platform: string }
}
