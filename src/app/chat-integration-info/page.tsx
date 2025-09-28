'use client';

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect, useRef, FormEvent } from "react";
import { getDocs, collection, query, where, addDoc, onSnapshot, orderBy, doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader2, Send } from "lucide-react";
import { format } from "date-fns";
import type { SellerUser } from "@/app/seller-accounts/page";
import type { Vendor } from "@/app/vendors/page";

type ChatUser = {
    id: string;
    name: string;
    role: 'admin' | 'seller' | 'vendor';
};

type Message = {
    id: string;
    chatId: string;
    senderId: string;
    text: string;
    timestamp: Date;
};

type Chat = {
    id: string;
    participants: string[]; // array of user IDs
    participantNames: { [key: string]: string };
    lastMessage?: string;
    lastMessageTimestamp?: Date;
};

function ChatWindow({ activeChat, currentUser }: { activeChat: Chat; currentUser: ChatUser }) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!activeChat.id) return;
        setLoading(true);

        const q = query(collection(db, `chats/${activeChat.id}/messages`), orderBy("timestamp", "asc"));
        
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const msgs: Message[] = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                msgs.push({
                    id: doc.id,
                    ...data,
                    timestamp: data.timestamp?.toDate()
                } as Message);
            });
            setMessages(msgs);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching messages:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [activeChat.id]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSendMessage = async (e: FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !currentUser.id || !activeChat.id) return;

        const messageData = {
            chatId: activeChat.id,
            senderId: currentUser.id,
            text: newMessage,
            timestamp: new Date(),
        };

        try {
            await addDoc(collection(db, `chats/${activeChat.id}/messages`), messageData);

            // Update the last message on the chat document
            const chatRef = doc(db, "chats", activeChat.id);
            await setDoc(chatRef, {
                lastMessage: newMessage,
                lastMessageTimestamp: messageData.timestamp
            }, { merge: true });

            setNewMessage('');
        } catch (error) {
            console.error("Error sending message:", error);
        }
    };

    const otherParticipantName = Object.values(activeChat.participantNames).find(name => name !== currentUser.name);

    return (
        <div className="flex flex-col h-full">
            <header className="p-4 border-b flex items-center gap-4">
                <Avatar>
                    <AvatarFallback>{otherParticipantName?.[0].toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                    <h3 className="font-semibold">{otherParticipantName}</h3>
                </div>
            </header>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loading ? <Loader2 className="animate-spin mx-auto"/> : (
                    messages.map(message => {
                        const isSender = message.senderId === currentUser.id;
                        return (
                            <div key={message.id} className={`flex items-end gap-2 ${isSender ? 'justify-end' : 'justify-start'}`}>
                                {!isSender && <Avatar className="h-8 w-8"><AvatarFallback>{activeChat.participantNames[message.senderId]?.[0]}</AvatarFallback></Avatar>}
                                <div className={`max-w-xs md:max-w-md p-3 rounded-2xl ${isSender ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-muted rounded-bl-none'}`}>
                                    <p className="text-sm">{message.text}</p>
                                    <p className={`text-xs mt-1 ${isSender ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{message.timestamp ? format(message.timestamp, 'p') : ''}</p>
                                </div>
                                {isSender && <Avatar className="h-8 w-8"><AvatarFallback>{currentUser.name[0]}</AvatarFallback></Avatar>}
                            </div>
                        )
                    })
                )}
                <div ref={messagesEndRef} />
            </div>
            <footer className="p-4 border-t">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                    <Input value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Type a message..." />
                    <Button type="submit"><Send className="h-4 w-4"/></Button>
                </form>
            </footer>
        </div>
    );
}


export default function ChatPage() {
    const { user } = useAuth();
    const [currentUser, setCurrentUser] = useState<ChatUser | null>(null);
    const [allUsers, setAllUsers] = useState<ChatUser[]>([]);
    const [chats, setChats] = useState<Chat[]>([]);
    const [activeChat, setActiveChat] = useState<Chat | null>(null);
    const [loadingUsers, setLoadingUsers] = useState(true);

    useEffect(() => {
        if (!user) return;
        
        // Define current user based on auth
        const role = localStorage.getItem('userRole') || 'admin';
        const cUser: ChatUser = {
            id: user.uid,
            name: user.displayName || user.email || 'User',
            role: role as ChatUser['role'],
        };
        setCurrentUser(cUser);

        // Fetch all potential chat partners
        const fetchUsers = async () => {
            setLoadingUsers(true);
            const users: ChatUser[] = [];
            
            // Add admin user(s)
            // This is a simplification. A real app would query a 'users' collection.
            if(cUser.role !== 'admin') {
                users.push({ id: 'ADMIN_USER_ID', name: 'Admin', role: 'admin' });
            }

            // Fetch sellers
            const approvedSellers: SellerUser[] = JSON.parse(localStorage.getItem('approved_sellers') || '[]');
            approvedSellers.forEach(s => {
                if (s.id !== cUser.id) users.push({ id: s.id, name: s.companyName, role: 'seller' });
            });

            // Fetch vendors
            const approvedVendors: Vendor[] = JSON.parse(localStorage.getItem('vendors_db') || '[]').filter((v: Vendor) => v.status === 'approved');
             approvedVendors.forEach(v => {
                if (v.id !== cUser.id) users.push({ id: v.id, name: v.name, role: 'vendor' });
            });
            
            setAllUsers(users);
            setLoadingUsers(false);
        };

        fetchUsers();
    }, [user]);

     useEffect(() => {
        if (!currentUser) return;
        
        const q = query(collection(db, "chats"), where("participants", "array-contains", currentUser.id));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const userChats = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                lastMessageTimestamp: doc.data().lastMessageTimestamp?.toDate(),
            } as Chat)).sort((a,b) => (b.lastMessageTimestamp?.getTime() || 0) - (a.lastMessageTimestamp?.getTime() || 0));
            setChats(userChats);
        });

        return () => unsubscribe();

    }, [currentUser]);

    const handleCreateOrSelectChat = async (partner: ChatUser) => {
        if (!currentUser) return;

        const sortedParticipants = [currentUser.id, partner.id].sort();
        const chatId = sortedParticipants.join('_');

        const chatRef = doc(db, "chats", chatId);
        const chatSnap = await getDoc(chatRef);

        if (chatSnap.exists()) {
            setActiveChat({ id: chatSnap.id, ...chatSnap.data() } as Chat);
        } else {
            const newChat: Chat = {
                id: chatId,
                participants: sortedParticipants,
                participantNames: {
                    [currentUser.id]: currentUser.name,
                    [partner.id]: partner.name,
                },
            };
            await setDoc(chatRef, newChat);
            setActiveChat(newChat);
        }
    };


    return (
        <AppShell title="Internal Chat">
            <div className="h-[calc(100vh-10rem)] border rounded-lg flex">
                <aside className="w-1/3 border-r flex flex-col">
                    <header className="p-4 border-b">
                        <CardTitle>Conversations</CardTitle>
                    </header>
                    <div className="flex-1 overflow-y-auto">
                        {loadingUsers ? <Loader2 className="animate-spin m-4"/> : (
                             chats.map(chat => {
                                const otherParticipantId = chat.participants.find(p => p !== currentUser?.id);
                                const otherParticipantName = otherParticipantId ? chat.participantNames[otherParticipantId] : 'Unknown';
                                return (
                                    <div key={chat.id} onClick={() => setActiveChat(chat)} className={`p-4 border-b cursor-pointer hover:bg-muted ${activeChat?.id === chat.id ? 'bg-muted' : ''}`}>
                                        <div className="flex items-center gap-3">
                                             <Avatar className="h-10 w-10">
                                                <AvatarFallback>{otherParticipantName[0].toUpperCase()}</AvatarFallback>
                                             </Avatar>
                                             <div className="flex-1 truncate">
                                                <p className="font-semibold">{otherParticipantName}</p>
                                                <p className="text-sm text-muted-foreground truncate">{chat.lastMessage || 'No messages yet'}</p>
                                             </div>
                                             {chat.lastMessageTimestamp && <p className="text-xs text-muted-foreground">{format(chat.lastMessageTimestamp, 'p')}</p>}
                                        </div>
                                    </div>
                                )
                             })
                        )}
                         <p className="p-2 text-xs text-muted-foreground border-t">Start a new chat:</p>
                        {allUsers.map(u => {
                            // Don't show users we already have a chat with
                             if (chats.some(c => c.participants.includes(u.id))) return null;
                            return (
                                <div key={u.id} onClick={() => handleCreateOrSelectChat(u)} className="p-4 border-b cursor-pointer hover:bg-muted">
                                    <p>{u.name} <span className="text-xs text-muted-foreground">({u.role})</span></p>
                                </div>
                            )
                        })}
                    </div>
                </aside>
                <main className="w-2/3">
                    {activeChat && currentUser ? (
                        <ChatWindow activeChat={activeChat} currentUser={currentUser} />
                    ) : (
                        <div className="h-full flex items-center justify-center text-muted-foreground">
                            <p>Select a conversation to start chatting.</p>
                        </div>
                    )}
                </main>
            </div>
        </AppShell>
    );
}
