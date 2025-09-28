
'use server';

import { db } from '@/lib/firebase';
import { collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, query, where, DocumentData, writeBatch } from 'firebase/firestore';
import type { EditableOrder } from '@/app/orders/page';
import type { PartnerData } from '@/app/partner-pay/page';
import type { LogisticsPartnerData } from '@/app/logistics-secure/dashboard/page';
import type { SellerUser } from '@/app/partner-pay/page';
import type { TopUpRequest } from '@/app/partner-pay/page';
import type { CashCode } from '@/app/settle/page';
import type { ShaktiCardData } from '@/components/shakti-card';


// Generic CRUD operations
const getCollection = async <T>(collectionName: string): Promise<T[]> => {
    if (!db) return [];
    const q = query(collection(db, collectionName));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
};

const getDocument = async <T>(collectionName: string, id: string): Promise<T | null> => {
    if (!db) return null;
    const docRef = doc(db, collectionName, id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as T : null;
};

const saveDocument = async (collectionName: string, data: any, id?: string) => {
    if (!db) throw new Error("Firestore is not initialized.");
    const docRef = id ? doc(db, collectionName, id) : doc(collection(db, collectionName));
    await setDoc(docRef, { ...data, id: docRef.id }, { merge: true });
    return docRef.id;
};

const updateDocument = async (collectionName: string, id: string, data: any) => {
    if (!db) throw new Error("Firestore is not initialized.");
    const docRef = doc(db, collectionName, id);
    await updateDoc(docRef, data);
};

const deleteDocument = async (collectionName: string, id: string) => {
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
export const getSellerUsers = async (): Promise<SellerUser[]> => getCollection<SellerUser>('seller_users');

// This function can now be called from the client-side safely
// because of the new Firestore security rules.
export const saveSellerUser = async (user: SellerUser) => {
    if (!db) throw new Error("Firestore is not initialized.");
    // The ID of the document will be the Firebase Auth user's UID
    const docRef = doc(db, 'seller_users', user.id);
    await setDoc(docRef, user);
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


// Cash Code specific functions
export const getCashCodes = async (): Promise<CashCode[]> => getCollection<CashCode>('cashCodes');
export const saveCashCode = async (code: CashCode) => saveDocument('cashCodes', code, code.code);


// Shakti Card specific functions
export const getShaktiCards = async (): Promise<ShaktiCardData[]> => getCollection<ShaktiCardData>('shakti_cards');
export const getShaktiCardByPhone = async (phone: string): Promise<ShaktiCardData | null> => {
    if (!db) return null;
    const q = query(collection(db, 'shakti_cards'), where("customerPhone", "==", phone));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as ShaktiCardData;
};
export const saveShaktiCard = async (card: ShaktiCardData) => saveDocument('shakti_cards', card, card.cardNumber);
export const updateShaktiCard = async (id: string, data: Partial<ShaktiCardData>) => updateDocument('shakti_cards', id, data);

// Payment Info specific functions
export const getPaymentInfo = async (orderId: string): Promise<any | null> => getDocument<any>('payment_info', orderId);
export const savePaymentInfo = async (orderId: string, data: any) => saveDocument('payment_info', data, orderId);


// Logistics Partner specific functions
export const getLogisticsPartners = async (): Promise<LogisticsPartnerData[]> => getCollection<LogisticsPartnerData>('logisticsPartners');
export const saveLogisticsPartner = async (partner: LogisticsPartnerData) => saveDocument('logisticsPartners', partner, partner.id);


// Transaction (Partner Pay) specific functions
export const getPartnerTransactions = async (partnerId: string): Promise<any[]> => {
     if (!db) return [];
    const q = query(collection(db, `payPartners/${partnerId}/transactions`));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const savePartnerTransaction = async (partnerId: string, transaction: any) => {
    if (!db) throw new Error("Firestore is not initialized.");
    const collectionRef = collection(db, `payPartners/${partnerId}/transactions`);
    const docRef = await addDoc(collectionRef, transaction);
    await updateDoc(docRef, { id: docRef.id });
};

export const updatePartnerTransaction = async (partnerId: string, txId: string, data: any) => {
    if (!db) throw new Error("Firestore is not initialized.");
    const docRef = doc(db, `payPartners/${partnerId}/transactions`, txId);
    await updateDoc(docRef, data);
};

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
    id: string;
    name: string;
    role: 'admin' | 'seller' | 'vendor';
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
export const createChat = async (participants: string[], participantNames: { [key: string]: string }): Promise<string> => {
    if (!db) throw new Error("Firestore is not initialized.");
    
    // Ensure consistent chat ID by sorting participant UIDs
    const sortedParticipants = participants.sort();
    const chatId = sortedParticipants.join('_');
    
    const chatRef = doc(db, 'chats', chatId);
    const docSnap = await getDoc(chatRef);

    if (!docSnap.exists()) {
        await setDoc(chatRef, { 
            id: chatId,
            participants: sortedParticipants,
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
        senderId,
        content,
        timestamp: new Date(),
    };

    await addDoc(messagesRef, messageData);
    
    // Also update the last message on the chat itself for previews
    await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: content,
        lastMessageTimestamp: new Date(),
    });
};
