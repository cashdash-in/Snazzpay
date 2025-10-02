
'use server';
import { db } from '@/lib/firebase';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where, DocumentData, writeBatch } from 'firebase/firestore';

export const getCollection = async <T>(collectionName: string): Promise<T[]> => {
    if (!db) {
        console.error("Firestore is not initialized.");
        return [];
    }
    try {
        const q = query(collection(db, collectionName));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as T));
    } catch (error) {
        console.error(`Error getting collection ${collectionName}:`, error);
        throw new Error(`Could not load ${collectionName} from Firestore.`);
    }
};

export const getDocument = async <T>(collectionName: string, id: string): Promise<T | null> => {
    if (!db) {
        console.error("Firestore is not initialized.");
        return null;
    }
    try {
        const docRef = doc(db, collectionName, id);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as T : null;
    } catch (error) {
        console.error(`Error getting document ${id} from ${collectionName}:`, error);
        throw new Error(`Could not load document ${id} from ${collectionName}.`);
    }
};

export const saveDocument = async (collectionName: string, data: DocumentData, id: string) => {
    if (!db) throw new Error("Firestore is not initialized.");
    if (!id) throw new Error("Document ID must be provided.");
    
    const docRef = doc(db, collectionName, id);
    // Ensure the data object contains the id, then save the whole object.
    const dataToSave = { ...data, id };
    await setDoc(docRef, dataToSave, { merge: true });
    return id;
};

export const addDocument = async (collectionName: string, data: DocumentData) => {
    if (!db) throw new Error("Firestore is not initialized.");
    const newDocRef = doc(collection(db, collectionName));
    // Save the data along with the newly generated ID.
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

export interface ChatUser {
    id: string;
    name: string;
    role: 'admin' | 'seller' | 'vendor';
    email: string;
}

export interface Chat {
    id: string;
    participants: string[];
    participantNames: { [key: string]: string };
    lastMessage?: {
        type: 'text' | 'image';
        content: string;
    };
    lastMessageTimestamp?: Date;
    createdAt: Date;
}

export interface Message {
    id: string;
    chatId: string;
    senderId: string;
    content: {
        type: 'text' | 'image';
        content: string;
    };
    timestamp: Date;
}


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
