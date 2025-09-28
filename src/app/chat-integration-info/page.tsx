'use client';

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect, useRef, FormEvent } from "react";
import { collection, onSnapshot, orderBy, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader2, Send, ImagePlus } from "lucide-react";
import { format } from "date-fns";
import type { SellerUser } from "@/app/seller-accounts/page";
import type { Vendor } from "@/app/vendors/page";
import { createChat, sendMessage, type Message, type Chat, type ChatUser, getCollection } from "@/services/firestore";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";


function ChatWindow({ activeChat, currentUser }: { activeChat: Chat; currentUser: ChatUser }) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

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
        if (!newMessage.trim()) return;

        try {
            await sendMessage(activeChat.id, currentUser.id, { type: 'text', content: newMessage });
            setNewMessage('');
        } catch (error) {
            console.error("Error sending message:", error);
             toast({ variant: 'destructive', title: 'Send Failed', description: 'Could not send message.' });
        }
    };
    
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const dataUri = event.target?.result as string;
            try {
                await sendMessage(activeChat.id, currentUser.id, { type: 'image', content: dataUri });
            } catch (error) {
                console.error("Error sending image:", error);
                toast({ variant: 'destructive', title: 'Image Send Failed', description: 'Could not send the image.' });
            }
        };
        reader.readAsDataURL(file);
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
                                <div className={`max-w-xs md:max-w-md p-1 rounded-2xl ${isSender ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-muted rounded-bl-none'}`}>
                                    {message.content.type === 'text' ? (
                                        <p className="text-sm p-2">{message.content.content}</p>
                                    ) : (
                                        <Image src={message.content.content} alt="Shared image" width={250} height={250} className="rounded-xl object-cover" />
                                    )}
                                    <p className={`text-xs px-2 pb-1 ${isSender ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{message.timestamp ? format(message.timestamp, 'p') : ''}</p>
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
                    <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                    <Button type="button" variant="outline" size="icon" onClick={() => fileInputRef.current?.click()}><ImagePlus className="h-4 w-4"/></Button>
                    <Input value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Type a message..." />
                    <Button type="submit"><Send className="h-4 w-4"/></Button>
                </form>
            </footer>
        </div>
    );
}


export default function ChatPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [currentUser, setCurrentUser] = useState<ChatUser | null>(null);
    const [allUsers, setAllUsers] = useState<ChatUser[]>([]);
    const [chats, setChats] = useState<Chat[]>([]);
    const [activeChat, setActiveChat] = useState<Chat | null>(null);
    const [loadingUsers, setLoadingUsers] = useState(true);

    useEffect(() => {
        if (!user || !db) return;
        
        const role = localStorage.getItem('userRole') || 'admin';
        const cUser: ChatUser = {
            id: user.uid,
            name: user.displayName || user.email || 'User',
            role: role as ChatUser['role'],
        };
        setCurrentUser(cUser);

        const fetchUsers = async () => {
            setLoadingUsers(true);
            try {
                const usersSnapshot = await getDocs(collection(db, "users"));
                const users: ChatUser[] = [];
                usersSnapshot.forEach((doc) => {
                    if (doc.id !== cUser.id) { // Exclude current user from the list
                        users.push(doc.data() as ChatUser);
                    }
                });
                setAllUsers(users);
            } catch (error) {
                console.error("Error fetching users:", error);
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: 'Could not fetch list of users. Check Firestore rules for the `users` collection.'
                });
            }
            setLoadingUsers(false);
        };

        fetchUsers();
    }, [user, toast]);

     useEffect(() => {
        if (!currentUser || !db) return;
        
        const q = query(collection(db, "chats"), where("participants", "array-contains", currentUser.id));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const userChats = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                lastMessageTimestamp: doc.data().lastMessageTimestamp?.toDate(),
            } as Chat)).sort((a,b) => (b.lastMessageTimestamp?.getTime() || 0) - (a.lastMessageTimestamp?.getTime() || 0));
            setChats(userChats);
        }, (err) => {
            console.error("Firestore snapshot error:", err);
            toast({
                variant: 'destructive',
                title: 'Chat Error',
                description: 'Could not load conversations. Check Firestore rules and configuration.'
            });
        });

        return () => unsubscribe();

    }, [currentUser, toast]);

    const handleCreateOrSelectChat = async (partner: ChatUser) => {
        if (!currentUser) return;

        try {
            const chatId = await createChat([currentUser.id, partner.id], {
                [currentUser.id]: currentUser.name,
                [partner.id]: partner.name,
            });

            // Find the full chat object to set as active
             const chatQ = query(collection(db, "chats"), where("id", "==", chatId));
             const querySnapshot = await getDocs(chatQ);
             if(!querySnapshot.empty){
                const chatDoc = querySnapshot.docs[0];
                setActiveChat({ id: chatDoc.id, ...chatDoc.data() } as Chat);
             }

        } catch (error: any) {
            console.error("Error creating or selecting chat:", error);
            toast({ variant: 'destructive', title: 'Chat Error', description: error.message });
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
                                                <AvatarFallback>{otherParticipantName?.[0]?.toUpperCase()}</AvatarFallback>
                                             </Avatar>
                                             <div className="flex-1 truncate">
                                                <p className="font-semibold">{otherParticipantName}</p>
                                                <p className="text-sm text-muted-foreground truncate">{chat.lastMessage?.type === 'image' ? 'Image' : chat.lastMessage?.content || 'No messages yet'}</p>
                                             </div>
                                             {chat.lastMessageTimestamp && <p className="text-xs text-muted-foreground">{format(chat.lastMessageTimestamp, 'p')}</p>}
                                        </div>
                                    </div>
                                )
                             })
                        )}
                         <p className="p-2 text-xs text-muted-foreground border-t">Start a new chat:</p>
                        {allUsers.map(u => {
                            if (chats.some(c => c.participants.includes(u.id))) return null;
                            return (
                                <div key={u.id} onClick={() => handleCreateOrSelectChat(u)} className="p-4 border-b cursor-pointer hover:bg-muted">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-10 w-10">
                                            <AvatarFallback>{u.name[0].toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-semibold">{u.name}</p>
                                            <p className="text-sm text-muted-foreground capitalize">{u.role}</p>
                                        </div>
                                    </div>
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
