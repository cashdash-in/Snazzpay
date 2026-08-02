'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Mail, Lock, Loader2, Store } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { FirebaseError } from 'firebase/app';
import { getDocument } from '@/services/firestore';

export default function StaffLoginPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e?: React.FormEvent) => {
        e?.preventDefault();
        setIsLoading(true);

        if (!email || !password) {
            toast({ variant: 'destructive', title: "Login Failed", description: "Please enter your email and password." });
            setIsLoading(false);
            return;
        }

        try {
            // 1. Auth in Firebase
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            
            // 2. Verify Role in Firestore
            const staffDoc = await getDocument<any>('staff_members', userCredential.user.uid);
            
            if (!staffDoc || staffDoc.status !== 'active') {
                await auth.signOut();
                throw new Error("Your account is not active or you do not have permission to access the Shop Portal.");
            }

            const idToken = await userCredential.user.getIdToken();
            
            // 3. Create Session
            const response = await fetch('/api/auth/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken, role: 'staff' }),
            });

            if (!response.ok) throw new Error("Could not initialize session.");

            toast({ title: "Welcome back!", description: `Logged in as ${staffDoc.name}` });
            router.push('/staff/inventory');
            router.refresh();

        } catch (error: any) {
            console.error("Staff Login Error:", error);
            let errorMessage = error.message || 'An unexpected error occurred.';
            if (error instanceof FirebaseError) {
                if (error.code === 'auth/invalid-credential') {
                    errorMessage = 'Invalid email or password.';
                }
            }
            toast({ variant: 'destructive', title: "Login Error", description: errorMessage });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-900 p-4">
            <Card className="w-full max-w-sm shadow-2xl border-none">
                <form onSubmit={handleLogin}>
                    <CardHeader className="text-center space-y-4">
                        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
                            <Store className="h-10 w-10 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-2xl font-black italic tracking-tighter uppercase">Shop Portal</CardTitle>
                            <CardDescription>Restricted access for Shop Team Members.</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input id="email" type="email" placeholder="staff@snazzify.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input id="password" type="password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9" />
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" className="w-full h-12 text-lg font-bold" disabled={isLoading}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                            Login to Shop
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
