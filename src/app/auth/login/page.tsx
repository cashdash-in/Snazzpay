
'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Mail, Lock, Loader2 } from "lucide-react";
import Link from "next/link";
import { useToast } from '@/hooks/use-toast';
import { useRouter, useSearchParams } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import type { PartnerData } from '@/app/partner-pay/page';

const ADMIN_EMAIL = "admin@snazzpay.com";

export default function SellerLoginPage() {
    const { toast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectedFrom = searchParams.get('redirectedFrom') || '/';

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    
    const { user, loading: authLoading } = useAuth();
    const [pageLoading, setPageLoading] = useState(true);

    useEffect(() => {
        if (!authLoading) {
            if (user) {
                // User is already logged in, check their role and redirect
                const targetPath = user.email === ADMIN_EMAIL ? '/' : '/seller/dashboard';
                router.replace(targetPath);
            } else {
                // No user logged in, safe to show the login form
                setPageLoading(false);
            }
        }
    }, [user, authLoading, router]);


    const handleLogin = async () => {
        setIsLoggingIn(true);
        if (!email || !password) {
            toast({ variant: 'destructive', title: "Invalid Input", description: "Please enter a valid email and password." });
            setIsLoggingIn(false);
            return;
        }

        // Admin login check
        if (email === ADMIN_EMAIL) {
             try {
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                const idToken = await userCredential.user.getIdToken();

                await fetch('/api/auth/session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ idToken }),
                });
                
                toast({ title: "Admin Login Successful", description: "Redirecting to admin dashboard." });
                router.push('/'); // Admin goes to root dashboard
                router.refresh();
                return;
            } catch (error: any) {
                toast({ variant: 'destructive', title: "Admin Login Error", description: 'Invalid credentials for admin.' });
                setIsLoggingIn(false);
                return;
            }
        }
        
        // Seller login check
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const loggedInUser = userCredential.user;
            
            // Check if the seller is approved
            const allPartnersJSON = localStorage.getItem('payPartners');
            const allPartners: PartnerData[] = allPartnersJSON ? JSON.parse(allPartnersJSON) : [];
            const sellerData = allPartners.find(p => p.id === loggedInUser.uid);

            if (!sellerData || sellerData.status !== 'approved') {
                 await auth.signOut(); // Log them out immediately
                 toast({ variant: 'destructive', title: "Login Denied", description: "Your account is not approved yet. Please contact support." });
                 setIsLoggingIn(false);
                 return;
            }

            const idToken = await loggedInUser.getIdToken();
            await fetch('/api/auth/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken }),
            });
            
            toast({ title: "Login Successful", description: "Redirecting you to your dashboard." });
            router.push('/seller/dashboard'); // Sellers go to seller dashboard
            router.refresh();

        } catch (error: any) {
            console.error("Login failed:", error);
            const errorMessage = error.code === 'auth/invalid-credential' 
                ? 'Invalid email or password.' 
                : 'An unexpected error occurred during login.';
            toast({ variant: 'destructive', title: "Login Error", description: errorMessage });
             setIsLoggingIn(false);
        }
    };
    
    if (pageLoading) {
        return (
             <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
            <Card className="w-full max-w-sm shadow-lg">
                <CardHeader className="text-center">
                    <ShieldCheck className="mx-auto h-12 w-12 text-primary" />
                    <CardTitle>SnazzPay Seller Central</CardTitle>
                    <CardDescription>Log in to your dashboard.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                id="email" 
                                type="email" 
                                placeholder="you@example.com" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
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
                    <Button className="w-full" onClick={handleLogin} disabled={isLoggingIn}>
                        {isLoggingIn ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Logging In...</> : "Login"}
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
