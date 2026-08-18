// 用 IndexedDB 存原始课件文件（Blob），供资料 tab「预览原始课件」使用。
// 不用 localStorage：原始 PDF/PPT/图片可能几 MB，会撑爆 localStorage 的 ~5MB 配额。
const DB_NAME = 'kaoshi-files';
const STORE = 'files';

const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

export const saveFileBlob = async (
  id: string,
  name: string,
  mimeType: string,
  blob: Blob
): Promise<void> => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put({ id, name, mimeType, blob });
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
};

export interface StoredFile {
  id: string;
  name: string;
  mimeType: string;
  blob: Blob;
}

export const getFileBlob = async (id: string): Promise<StoredFile | null> => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => {
      db.close();
      resolve((req.result as StoredFile) || null);
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
};
