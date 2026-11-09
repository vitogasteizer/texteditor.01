/**
 * Firebase პირადი ღრუბლოვანი სინქრონიზაციის სერვისი (Private Cloud Sync).
 * თითოეულ მომხმარებელს გააჩნია იზოლირებული პირადი სივრცე /user_sync/{userId}/documents/{docId},
 * რაც უზრუნველყოფს, რომ ატვირთული დოკუმენტები ხელმისაწვდომია მხოლოდ ამ მომხმარებლისთვის
 * და სხვა მომხმარებლები მათ ვერ ხედავენ.
 */

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Doc } from '../App';

const STORAGE_KEY_USER_ID = 'avma_user_cloud_id';

/**
 * აბრუნებს ან ქმნის უნიკალურ, მუდმივ მომხმარებლის ID-ს მოწყობილობისთვის
 */
export function getOrCreateUserCloudId(): string {
  if (typeof window === 'undefined') return 'usr_default';
  let uid = localStorage.getItem(STORAGE_KEY_USER_ID);
  if (!uid || uid.trim().length === 0) {
    const timestamp = Date.now().toString(36);
    const rand = Math.random().toString(36).substring(2, 8);
    uid = `usr_${timestamp}_${rand}`;
    localStorage.setItem(STORAGE_KEY_USER_ID, uid);
  }
  return uid;
}

/**
 * აბრუნებს მიმდინარე მომხმარებლის ID-ს
 */
export function getUserCloudId(): string {
  return getOrCreateUserCloudId();
}

/**
 * მომხმარებლის ID-ს შეცვლა (სხვა მოწყობილობის ID-ს მიერთება)
 */
export function setUserCloudId(newId: string): { success: boolean; error?: string } {
  if (typeof window === 'undefined') {
    return { success: false, error: 'გარემო არ არის მხარდაჭერილი' };
  }
  const cleanId = newId.trim();
  // ვალიდაცია: მხოლოდ ასოები, ციფრები, დეფისი და ქვედა ხაზი, 3-64 სიმბოლო
  const validRegex = /^[a-zA-Z0-9_\-]{3,64}$/;
  if (!validRegex.test(cleanId)) {
    return {
      success: false,
      error: 'პირადი ID უნდა შედგებოდეს 3-დან 64 სიმბოლომდე (ლათინური ასოები, ციფრები, _ ან -).',
    };
  }

  localStorage.setItem(STORAGE_KEY_USER_ID, cleanId);
  return { success: true };
}

/**
 * ახალი, სუფთა პირადი ID-ს გენერირება
 */
export function generateNewUserCloudId(): string {
  const timestamp = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 8);
  const newId = `usr_${timestamp}_${rand}`;
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_USER_ID, newId);
  }
  return newId;
}

export interface CloudSyncResult {
  success: boolean;
  syncedCount: number;
  totalCount: number;
  error?: string;
}

/**
 * ერთი დოკუმენტის სინქრონიზაცია მომხმარებლის პირად ღრუბელში
 */
export async function syncSingleDocumentToFirebase(document: Doc): Promise<void> {
  const userId = getOrCreateUserCloudId();
  const docRef = doc(db, 'user_sync', userId, 'documents', document.id);

  await setDoc(docRef, {
    id: document.id,
    name: document.name,
    updatedAt: document.updatedAt || Date.now(),
    createdAt: document.createdAt || Date.now(),
    content: document.content,
    pageSize: document.pageSize || 'Letter',
    pageOrientation: document.pageOrientation || 'portrait',
    pageMargins: document.pageMargins || { top: 1, bottom: 1, left: 1, right: 1 },
    pageColor: document.pageColor || '#FFFFFF',
    userId: userId,
  });
}

/**
 * ყველა ლოკალური დოკუმენტის სინქრონიზაცია მომხმარებლის პირად ღრუბელში
 */
export async function syncAllDocumentsToFirebase(
  documents: Doc[],
  onProgress?: (current: number, total: number, docName: string) => void
): Promise<CloudSyncResult> {
  if (!documents || documents.length === 0) {
    return { success: true, syncedCount: 0, totalCount: 0 };
  }

  const userId = getOrCreateUserCloudId();
  let synced = 0;

  try {
    for (let i = 0; i < documents.length; i++) {
      const d = documents[i];
      if (onProgress) {
        onProgress(i + 1, documents.length, d.name);
      }
      const docRef = doc(db, 'user_sync', userId, 'documents', d.id);
      await setDoc(docRef, {
        id: d.id,
        name: d.name,
        updatedAt: d.updatedAt || Date.now(),
        createdAt: d.createdAt || Date.now(),
        content: d.content,
        pageSize: d.pageSize || 'Letter',
        pageOrientation: d.pageOrientation || 'portrait',
        pageMargins: d.pageMargins || { top: 1, bottom: 1, left: 1, right: 1 },
        pageColor: d.pageColor || '#FFFFFF',
        userId: userId,
      });
      synced++;
    }

    return {
      success: true,
      syncedCount: synced,
      totalCount: documents.length,
    };
  } catch (error) {
    console.error('პირადი ღრუბლოვანი სინქრონიზაციის შეცდომა:', error);
    return {
      success: false,
      syncedCount: synced,
      totalCount: documents.length,
      error: error instanceof Error ? error.message : 'უცნობი შეცდომა',
    };
  }
}

/**
 * მომხმარებლის პირადი ღრუბლიდან დოკუმენტების სიის წაკითხვა
 */
export async function fetchUserCloudDocuments(specificUserId?: string): Promise<Doc[]> {
  try {
    const userId = specificUserId?.trim() || getOrCreateUserCloudId();
    const userDocsCol = collection(db, 'user_sync', userId, 'documents');
    const q = query(userDocsCol, orderBy('updatedAt', 'desc'));
    const snap = await getDocs(q);

    if (snap.empty) {
      return [];
    }

    return snap.docs.map(d => {
      const data = d.data();
      return {
        id: data.id || d.id,
        name: data.name || 'უსათაურო',
        updatedAt: data.updatedAt || Date.now(),
        createdAt: data.createdAt || Date.now(),
        content: data.content || '<p><br></p>',
        pageSize: data.pageSize || 'Letter',
        pageOrientation: data.pageOrientation || 'portrait',
        pageMargins: data.pageMargins || { top: 1, bottom: 1, left: 1, right: 1 },
        pageColor: data.pageColor || '#FFFFFF',
        googleDriveId: undefined,
      } as Doc;
    });
  } catch (error) {
    console.error('პირადი ღრუბლის დოკუმენტების წაკითხვის შეცდომა:', error);
    return [];
  }
}

/**
 * დოკუმენტის წაშლა მომხმარებლის პირადი ღრუბლიდან
 */
export async function deleteUserCloudDocument(docId: string): Promise<boolean> {
  try {
    const userId = getOrCreateUserCloudId();
    const docRef = doc(db, 'user_sync', userId, 'documents', docId);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error('ღრუბლიდან წაშლის შეცდომა:', error);
    return false;
  }
}
