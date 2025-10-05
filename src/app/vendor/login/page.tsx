
'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Factory, Lock, Loader2, Mail } from "lucide-react";
import Link from "next/link";
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { FirebaseError } from 'firebase/app';
import { Checkbox } from '@/components/ui/checkbox';
import { getCollection } from '@/services/firestore';
import type { Vendor } from '../page';


export default function VendorLoginPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [loginId, setLoginId] = useState('');
    const [password, setPassword] = useState('');
    const [agreed, setAgreed] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async () => {
        setIsLoading(true);

        if (!loginId || !password) {
            toast({ variant: 'destructive', title: "Login Failed", description: "Please enter your credentials and password." });
            setIsLoading(false);
            return;
        }

        if (!agreed) {
            toast({ variant: 'destructive', title: 'Agreement Required', description: 'You must accept the terms and conditions to log in.' });
            setIsLoading(false);
            return;
        }

        try {
            let userEmail = loginId;

            if (!loginId.includes('@')) {
                const vendors = await getCollection<Vendor>('vendors');
                const vendor = vendors.find(v => v.phone === loginId);
                if (vendor) {
                    userEmail = vendor.email;
                } else {
                    throw new Error("No account found with this mobile number.");
                }
            }

            const userCredential = await signInWithEmailAndPassword(auth, userEmail, password);
            const idToken = await userCredential.user.getIdToken();

            const response = await fetch('/api/auth/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken, role: 'vendor' }),
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error);
            }

            toast({ title: "Vendor Login Successful", description: "Redirecting to vendor dashboard." });
            router.push('/vendor/dashboard');
            router.refresh();

        } catch (error: any) {
            let errorMessage = 'An unexpected error occurred. Please check your credentials or sign up.';
            if (error instanceof FirebaseError) {
                if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
                    errorMessage = 'Invalid credentials. Please check your email/mobile and password, or sign up if you are a new vendor.';
                }
            } else {
                errorMessage = error.message;
            }
            toast({ variant: 'destructive', title: "Vendor Login Error", description: errorMessage, duration: 8000 });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
            <Card className="w-full max-w-sm shadow-lg">
                <CardHeader className="text-center">
                    <Factory className="mx-auto h-12 w-12 text-primary" />
                    <CardTitle>SnazzPay Vendor Portal</CardTitle>
                    <CardDescription>Login to your vendor dashboard.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="loginId">Email or Mobile Number</Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                id="loginId" 
                                placeholder="Your registered email or mobile" 
                                value={loginId}
                                onChange={(e) => setLoginId(e.target.value)}
                                className="pl-9" 
                            />
                        </div>
                    </div>
                     <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <Label htmlFor="password">Password</Label>
                             <Link href="/auth/forgot-password" passHref>
                                <span className="text-xs text-primary hover:underline cursor-pointer">
                                    Forgot Password?
                                </span>
                            </Link>
                        </div>
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
                     <div className="flex items-start space-x-2 pt-2">
                        <Checkbox id="terms" checked={agreed} onCheckedChange={(checked) => setAgreed(checked as boolean)} className="mt-1" />
                        <Label htmlFor="terms" className="text-sm text-muted-foreground">
                            I agree to the <Link href="/terms-and-conditions" target="_blank" className="underline text-primary">Platform Terms and Conditions</Link> for each login session.
                        </Label>
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                    <Button className="w-full" onClick={handleLogin} disabled={isLoading}>
                        {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Logging In...</> : "Login to Vendor Portal"}
                    </Button>
                    <p className="text-xs text-center text-muted-foreground">
                         New here?{" "}
                         <Link href="/auth/signup" className="text-primary hover:underline">
                            Sign Up
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}
