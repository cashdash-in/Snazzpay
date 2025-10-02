
'use server';

import { db } from '@/lib/firebase';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where, DocumentData, writeBatch, addDoc } from 'firebase/firestore';
import type { EditableOrder } from '@/app/orders/page';
import type { PartnerData } from '@/app/partner-pay/page';
import type { LogisticsPartnerData } from '@/app/logistics-secure/dashboard/page';
import type { SellerUser as SellerAccount } from '@/app/seller-accounts/page';
import type { TopUpRequest } from '@/app/partner-pay/page';
import type { ShaktiCardData } from '@/components/shakti-card';


// Generic CRUD operations
export const getCollection = async <T>(collectionName: string): Promise<T[]> => {
    if (!db) return [];
    const q = query(collection(db, collectionName));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as T));
};

export const getDocument = async <T>(collectionName: string, id: string): Promise<T | null> => {
    if (!db) return null;
    const docRef = doc(db, collectionName, id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as T : null;
};

export const saveDocument = async (collectionName: string, data: any, id?: string) => {
    if (!db) throw new Error("Firestore is not initialized.");
    const docRef = id ? doc(db, collectionName, id) : doc(collection(db, collectionName));
    await setDoc(docRef, { ...data, id: docRef.id }, { merge: true });
    return docRef.id;
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


// Order specific functions
export const getAllOrders = async (): Promise<EditableOrder[]> => getCollection<EditableOrder>('orders');
export const getOrder = async (id: string): Promise<EditableOrder | null> => getDocument<EditableOrder>('orders', id);
export const saveOrder = async (order: Omit<EditableOrder, 'id'>, id?: string): Promise<string> => saveDocument('orders', order, id);
export const updateOrder = async (id: string, data: Partial<EditableOrder>) => updateDocument('orders', id, data);
export const deleteOrder = async (id: string) => deleteDocument('orders', id);


// Partner Pay specific functions
export const getPayPartners = async (): Promise<PartnerData[]> => getCollection<PartnerData>('payPartners');
export const getPayPartner = async (id: string): Promise<PartnerData | null> => getDocument<PartnerData>('payPartners', id);
export const savePayPartner = async (partner: PartnerData) => saveDocument('payPartners', partner, partner.id);
export const updatePayPartner = async (id: string, data: Partial<PartnerData>) => updateDocument('payPartners', id, data);


// Seller User specific functions
export const getSellerUsers = async (): Promise<SellerAccount[]> => getCollection<SellerAccount>('seller_users');

export const saveSellerUser = async (user: SellerAccount) => {
    if (!db) throw new Error("Firestore is not initialized.");
    const docRef = doc(db, 'users', user.id);
    await setDoc(docRef, { 
        id: user.id, 
        name: user.companyName, 
        email: user.email, 
        role: 'seller' 
    });
};


// TopUp Request specific functions
export const getTopUpRequests = async (): Promise<TopUpRequest[]> => getCollection<TopUpRequest>('topUpRequests');
export const saveTopUpRequest = async (request: Omit<TopUpRequest, 'id'>): Promise<string> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const collectionRef = collection(db, 'topUpRequests');
    const docRef = await addDoc(collectionRef, request);
    await updateDoc(docRef, { id: docRef.id });
    return docRef.id;
};
export const updateTopUpRequest = async (id: string, data: Partial<TopUpRequest>) => updateDocument('topUpRequests', id, data);


// Shakti Card specific functions
export const getShaktiCards = async (): Promise<ShaktiCardData[]> => getCollection<ShaktiCardData>('shakti_cards');
export const saveShaktiCard = async (card: ShaktiCardData) => saveDocument('shakti_cards', card, card.cardNumber);
export const updateShaktiCard = async (id: string, data: Partial<ShaktiCardData>) => updateDocument('shakti_cards', id, data);

// Payment Info specific functions
export const getPaymentInfo = async (orderId: string): Promise<any | null> => getDocument<any>('payment_info', orderId);
export const savePaymentInfo = async (orderId: string, data: any) => saveDocument('payment_info', data, orderId);


// Logistics Partner specific functions
export const getLogisticsPartners = async (): Promise<LogisticsPartnerData[]> => getCollection<LogisticsPartnerData>('logisticsPartners');
export const saveLogisticsPartner = async (partner: LogisticsPartnerData) => saveDocument('logisticsPartners', partner, partner.id);


// Generic Batch Update
export const batchUpdate = async (updates: { collection: string; id: string; data: DocumentData }[]) => {
    if (!db) throw new Error("Firestore is not initialized.");
    const batch = writeBatch(db);
    updates.forEach(u => {
        const docRef = doc(db, u.collection, u.id);
        batch.update(docRef, u.data);
    });
    await batch.commit();
};

// Generic Add Document
export const addDocument = async <T extends DocumentData>(collectionName: string, data: T): Promise<string> => {
  if (!db) throw new Error("Firestore is not initialized.");
  const collectionRef = collection(db, collectionName);
  const docRef = await addDoc(collectionRef, data);
  await updateDoc(docRef, { id: docRef.id });
  return docRef.id;
};

// Chat specific types
export type ChatUser = {
    id: string; // Firebase UID or other unique ID
    name: string;
    role: 'admin' | 'seller' | 'vendor';
    email: string;
};

export type MessageContent = {
    type: 'text' | 'image';
    content: string; // text content or image data URI
};

export type Message = {
    id: string;
    chatId: string;
    senderId: string;
    content: MessageContent;
    timestamp: Date;
};

export type Chat = {
    id: string;
    participants: string[]; // array of user IDs
    participantNames: { [key: string]: string };
    lastMessage?: MessageContent;
    lastMessageTimestamp?: Date;
    createdAt?: Date;
};


// Chat specific functions
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

export const sendMessage = async (chatId: string, senderId: string, content: MessageContent) => {
    if (!db) throw new Error("Firestore is not initialized.");
    
    const messagesRef = collection(db, `chats/${chatId}/messages`);
    const messageData = {
        chatId,
        senderId,
        content,
        timestamp: new Date(),
    };

    const docRef = await addDoc(messagesRef, messageData);
    
    // Also update the last message on the chat itself for previews
    await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: content,
        lastMessageTimestamp: new Date(),
    });
    
    return docRef.id;
};
