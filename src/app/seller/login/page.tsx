
'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Store, Mail, Lock, Loader2, Phone } from "lucide-react";
import Link from "next/link";
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { FirebaseError } from 'firebase/app';
import type { SellerUser } from '@/app/seller-accounts/page';
import { getCollection } from '@/services/firestore';


export default function SellerLoginPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [loginId, setLoginId] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async () => {
        setIsLoading(true);
        
        if (!loginId || !password) {
            toast({ variant: 'destructive', title: "Invalid Input", description: "Please enter your login credential and password." });
            setIsLoading(false);
            return;
        }

        let userEmail = loginId;
        let isApproved = false;
        
        try {
            const allSellers = await getCollection<SellerUser>('seller_users');

            if (/^\d+$/.test(loginId)) { // It's a phone number
                const seller = allSellers.find(s => s.phone === loginId && s.status === 'approved');

                if (!seller) {
                    throw new Error("No approved seller account found with this mobile number.");
                }
                userEmail = seller.email;
                isApproved = true;
            }

            const userCredential = await signInWithEmailAndPassword(auth, userEmail, password);
            const loggedInUser = userCredential.user;
            
            // If logging in with email, we still need to check for approval
            if (!isApproved) {
                const seller = allSellers.find(s => s.email === userEmail && s.status === 'approved');
                if (seller) {
                    isApproved = true;
                }
            }

            if (!isApproved) {
                 await auth.signOut();
                 toast({ variant: 'destructive', title: "Access Denied", description: `Your account is not approved as a seller. Please contact support.` });
                 setIsLoading(false);
                 return;
            }

            const idToken = await loggedInUser.getIdToken();
            
            await fetch('/api/auth/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken, role: 'seller' }),
            });
            
            toast({ title: "Login Successful", description: "Redirecting you to your dashboard." });
            router.push('/seller/dashboard');
            router.refresh();

        } catch (error: any) {
            console.error("Seller Login failed:", error);
             let description = error.message || 'An unexpected error occurred during login.';
             if (error instanceof FirebaseError) {
                if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-email') {
                    description = 'Invalid credentials. Please check your email/mobile and password and try again.';
                }
             }
            toast({ variant: 'destructive', title: "Login Error", description: description });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
            <Card className="w-full max-w-sm shadow-lg">
                <CardHeader className="text-center">
                    <Store className="mx-auto h-12 w-12 text-primary" />
                    <CardTitle>SnazzPay Seller Central</CardTitle>
                    <CardDescription>Log in to your seller dashboard.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="loginId">Email or Mobile Number</Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                id="loginId" 
                                type="text" 
                                placeholder="you@example.com or 9876543210" 
                                value={loginId}
                                onChange={(e) => setLoginId(e.target.value)}
                                className="pl-9" 
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                         <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                id="password" 
                                type="password" 
                                placeholder="Enter your password" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                    <Button className="w-full" onClick={handleLogin} disabled={isLoading}>
                        {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Logging In...</> : "Login as Seller"}
                    </Button>
                    <p className="text-xs text-center text-muted-foreground">
                        Don't have an account?{" "}
                        <Link href="/auth/signup" className="text-primary hover:underline">
                            Sign Up Here
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}
