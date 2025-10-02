
'use server';

import { db } from '@/lib/firebase';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where, DocumentData, writeBatch } from 'firebase/firestore';

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
        console.error(`Error getting document ${id} from ${collectionName}:`, error);
        return null;
    }
};

export const saveDocument = async (collectionName: string, data: { id: string } & DocumentData) => {
    if (!db) throw new Error("Firestore is not initialized.");
    const docRef = doc(db, collectionName, data.id);
    await setDoc(docRef, data, { merge: true });
    return docRef.id;
};

export const addDocument = async (collectionName: string, data: DocumentData) => {
    if (!db) throw new Error("Firestore is not initialized.");
    const newDocRef = doc(collection(db, collectionName));
    await setDoc(newDocRef, { ...data, id: newDocRef.id });
    return newDocRef.id;
};

export const updateDocument = async (collectionName: string, id: string, data: any) => {
    if (!db) throw new Error("Firestore is not initialized.");
    const docRef = doc(db, collectionName, id);
    await updateDoc(docRef, data);
};

export const deleteDocument = async (collectionName: string, id: string) => {
    if (!db) throw new Error("Firestore is not initialized.");
    await deleteDoc(doc(db, collectionName, id));
};

export const createChat = async (chatId: string, participants: string[], participantNames: { [key: string]: string }): Promise<string> => {
    if (!db) throw new Error("Firestore is not initialized.");
    
    const chatRef = doc(db, 'chats', chatId);
    const docSnap = await getDoc(chatRef);

    if (!docSnap.exists()) {
        await setDoc(chatRef, { 
            id: chatId,
            participants,
            participantNames,
            createdAt: new Date(),
        });
    }
    return chatId;
};

export const sendMessage = async (chatId: string, senderId: string, content: any) => {
    if (!db) throw new Error("Firestore is not initialized.");
    
    const messagesRef = collection(db, `chats/${chatId}/messages`);
    const messageData = {
        chatId,
        senderId,
        content,
        timestamp: new Date(),
    };

    const newDoc = doc(messagesRef);
    await setDoc(newDoc, messageData);
    
    // Also update the last message on the chat itself for previews
    await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: content,
        lastMessageTimestamp: new Date(),
    });
    
    return newDoc.id;
};
