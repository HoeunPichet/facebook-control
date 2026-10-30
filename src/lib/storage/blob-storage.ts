import { put, list, del } from '@vercel/blob';
import fs from 'fs';
import path from 'path';
import { ActivityLog, ActivityLogSchema } from '../types';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const HAS_BLOB_TOKEN = !!process.env.BLOB_READ_WRITE_TOKEN;
const LOCAL_STORAGE_DIR = path.join(process.cwd(), '.blob-local');

/**
 * Ensures the local fallback directory exists when running without BLOB_READ_WRITE_TOKEN.
 */
function ensureLocalDir(subPath?: string): string {
  const targetDir = subPath ? path.join(LOCAL_STORAGE_DIR, path.dirname(subPath)) : LOCAL_STORAGE_DIR;
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  return targetDir;
}

/**
 * Normalizes blob pathname to remove leading slashes.
 */
function cleanPath(pathname: string): string {
  return pathname.replace(/^\/+/, '');
}

/**
 * Simple in-process mutex queue for preventing race conditions during updateJson calls.
 */
const lockQueues = new Map<string, Promise<unknown>>();

async function acquireLock<T>(key: string, task: () => Promise<T>): Promise<T> {
  const previousLock = lockQueues.get(key) || Promise.resolve();
  let release: () => void;
  const currentLock = new Promise<void>((resolve) => {
    release = resolve;
  });
  lockQueues.set(key, previousLock.then(() => currentLock));

  try {
    await previousLock;
    return await task();
  } finally {
    release!();
    if (lockQueues.get(key) === currentLock) {
      lockQueues.delete(key);
    }
  }
}

export class BlobStorageService {
  /**
   * Reads a JSON document from storage.
   * Returns defaultValue if the file does not exist or is malformed.
   */
  static async getJson<T>(pathname: string, defaultValue: T): Promise<T> {
    const cleaned = cleanPath(pathname);

    if (HAS_BLOB_TOKEN) {
      try {
        const { blobs } = await list({ prefix: cleaned, limit: 1 });
        const targetBlob = blobs.find((b) => b.pathname === cleaned);
        if (!targetBlob) {
          return defaultValue;
        }

        // Fetch from blob CDN with cache busting for fresh data
        const res = await fetch(`${targetBlob.url}?t=${Date.now()}`, {
          cache: 'no-store',
        });
        if (!res.ok) {
          return defaultValue;
        }

        const text = await res.text();
        return JSON.parse(text) as T;
      } catch (err) {
        console.error(`[BlobStorage] Error reading blob ${cleaned}:`, err);
        return defaultValue;
      }
    } else {
      // Local development fallback
      try {
        const localPath = path.join(LOCAL_STORAGE_DIR, cleaned);
        if (!fs.existsSync(localPath)) {
          return defaultValue;
        }
        const text = fs.readFileSync(localPath, 'utf8');
        return JSON.parse(text) as T;
      } catch (err) {
        console.error(`[BlobStorage Local] Error reading file ${cleaned}:`, err);
        return defaultValue;
      }
    }
  }

  /**
   * Writes a JSON document to storage.
   */
  static async putJson<T>(
    pathname: string,
    data: T
  ): Promise<{ url: string; pathname: string }> {
    const cleaned = cleanPath(pathname);
    const content = JSON.stringify(data, null, 2);

    if (HAS_BLOB_TOKEN) {
      try {
        // Upload to Vercel Blob with public read access
        const blob = await put(cleaned, content, {
          access: 'public',
          addRandomSuffix: false,
          contentType: 'application/json',
          token: process.env.BLOB_READ_WRITE_TOKEN,
        });
        return { url: blob.url, pathname: cleaned };
      } catch (err) {
        console.error(`[BlobStorage] Error writing blob ${cleaned}:`, err);
        throw err;
      }
    } else {
      // Local development fallback
      ensureLocalDir(cleaned);
      const localPath = path.join(LOCAL_STORAGE_DIR, cleaned);
      fs.writeFileSync(localPath, content, 'utf8');
      const mockUrl = `/api/blob/local?pathname=${encodeURIComponent(cleaned)}`;
      return { url: mockUrl, pathname: cleaned };
    }
  }

  /**
   * Atomically updates a JSON document with mutex locking to prevent concurrent overwrites.
   */
  static async updateJson<T>(
    pathname: string,
    updater: (current: T) => T | Promise<T>,
    defaultValue: T
  ): Promise<T> {
    const cleaned = cleanPath(pathname);
    return acquireLock(cleaned, async () => {
      const current = await this.getJson<T>(cleaned, defaultValue);
      const updated = await updater(current);
      await this.putJson(cleaned, updated);
      return updated;
    });
  }

  /**
   * Uploads binary media (e.g. handbag product images) to Blob storage.
   */
  static async uploadMedia(
    file: Buffer | Blob,
    filename: string,
    contentType: string = 'image/jpeg'
  ): Promise<string> {
    const safeFilename = `products/${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    if (HAS_BLOB_TOKEN) {
      const blob = await put(safeFilename, file, {
        access: 'public',
        addRandomSuffix: false,
        contentType,
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
      return blob.url;
    } else {
      // Local media upload
      ensureLocalDir(safeFilename);
      const localPath = path.join(LOCAL_STORAGE_DIR, safeFilename);
      if (Buffer.isBuffer(file)) {
        fs.writeFileSync(localPath, file);
      } else {
        const arrayBuffer = await file.arrayBuffer();
        fs.writeFileSync(localPath, Buffer.from(arrayBuffer));
      }
      return `/api/blob/local?pathname=${encodeURIComponent(safeFilename)}`;
    }
  }

  /**
   * Records an audit activity log entry into /logs/activity.json.
   * Keeps the most recent 500 entries to prevent infinite growth.
   */
  static async recordActivity(entry: Omit<ActivityLog, 'id' | 'timestamp'>): Promise<void> {
    try {
      const newLog: ActivityLog = ActivityLogSchema.parse({
        id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: new Date().toISOString(),
        ...entry,
      });

      await this.updateJson<ActivityLog[]>('/logs/activity.json', (logs) => {
        const list = Array.isArray(logs) ? logs : [];
        list.unshift(newLog);
        return list.slice(0, 500); // Retain latest 500 logs
      }, []);
    } catch (err) {
      console.error('[BlobStorage] Failed to record activity log:', err);
    }
  }
}

