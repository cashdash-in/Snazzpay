
import { db } from '@/lib/firebase';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where, DocumentData, writeBatch } from 'firebase/firestore';

/**
 * Robust utility to recursively remove 'undefined' values and handle Firestore FieldValues.
 */
const sanitizeForFirestore = (data: any): any => {
  if (data === undefined) return null;
  if (data === null || typeof data !== 'object') return data;
  
  if (Array.isArray(data)) {
    return data.map(sanitizeForFirestore);
  }

  // Preserve Firestore FieldValues (like increment, serverTimestamp)
  if (data.constructor && data.constructor.name !== 'Object' && data.constructor.name !== 'Array') {
      return data; 
  }

  const sanitized: any = {};
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      const value = data[key];
      sanitized[key] = sanitizeForFirestore(value);
    }
  }
  return sanitized;
};

export const getCollection = async <T>(collectionName: string): Promise<T[]> => {
    if (!db) return [];
    try {
        const q = query(collection(db, collectionName));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as T));
    } catch (error) {
        console.error(`Error getting collection ${collectionName}:`, error);
        return [];
    }
};

export const getDocument = async <T>(collectionName: string, id: string): Promise<T | null> => {
    if (!db) return null;
    try {
        const docRef = doc(db, collectionName, id);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as T : null;
    } catch (error) {
        return null;
    }
};

export const saveDocument = async (collectionName: string, data: DocumentData, id: string) => {
    if (!db || !id) return;
    const docRef = doc(db, collectionName, id);
    const sanitizedData = sanitizeForFirestore({ ...data, id });
    await setDoc(docRef, sanitizedData, { merge: true });
    return id;
};

export const addDocument = async (collectionName: string, data: DocumentData) => {
    if (!db) return;
    const newDocRef = doc(collection(db, collectionName));
    const sanitizedData = sanitizeForFirestore({ ...data, id: newDocRef.id });
    await setDoc(newDocRef, sanitizedData);
    return newDocRef.id;
};

export const batchUpdateDocuments = async (collectionName: string, docIds: string[], updateData: DocumentData) => {
    if (!db || docIds.length === 0) return;
    const batch = writeBatch(db);
    const sanitizedUpdate = sanitizeForFirestore(updateData);
    docIds.forEach(id => {
        const docRef = doc(db, collectionName, id);
        batch.update(docRef, sanitizedUpdate);
    });
    await batch.commit();
};

export const updateDocument = async (collectionName: string, id: string, data: any) => {
    if (!db) return;
    const docRef = doc(db, collectionName, id);
    const sanitizedData = sanitizeForFirestore(data);
    await updateDoc(docRef, sanitizedData);
};

export const deleteDocument = async (collectionName: string, id: string) => {
    if (!db) return;
    await deleteDoc(doc(db, collectionName, id));
};

export const createChat = async (chatId: string, participants: string[], participantNames: { [key: string]: string }): Promise<string> => {
    if (!db) throw new Error("Firestore not ready");
    const chatRef = doc(db, 'chats', chatId);
    const docSnap = await getDoc(chatRef);
    if (!docSnap.exists()) {
        await setDoc(chatRef, { id: chatId, participants, participantNames, createdAt: new Date() });
    }
    return chatId;
};

export const sendMessage = async (chatId: string, senderId: string, content: any) => {
    if (!db) return;
    const messagesRef = collection(db, `chats/${chatId}/messages`);
    const messageData = { chatId, senderId, content, timestamp: new Date() };
    await setDoc(doc(messagesRef), messageData);
    await updateDoc(doc(db, 'chats', chatId), { lastMessage: content, lastMessageTimestamp: new Date() });
};
