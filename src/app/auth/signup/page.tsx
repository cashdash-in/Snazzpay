
'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Mail, Lock, Loader2, User } from "lucide-react";
import Link from "next/link";
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc } from "firebase/firestore";
import { FirebaseError } from 'firebase/app';
import { v4 as uuidv4 } from 'uuid';

type SellerUser = {
    id: string;
    companyName: string;
    email: string;
    status: 'pending' | 'approved' | 'rejected';
};

const ADMIN_EMAIL = "admin@snazzpay.com";

export default function SellerSignupPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSignup = async () => {
        setIsLoading(true);
        if (!email || !password) {
            toast({ variant: 'destructive', title: "Missing Fields", description: "Please fill out email and password." });
            setIsLoading(false);
            return;
        }

        if (!auth || !db) {
            toast({ variant: 'destructive', title: "Firebase Not Configured", description: "Please check your Firebase configuration settings." });
            setIsLoading(false);
            return;
        }
        
        // Special case for creating the admin user
        if (email === ADMIN_EMAIL) {
            try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                await updateProfile(userCredential.user, {
                    displayName: "Super Admin",
                });
                toast({
                    title: "Admin Account Created!",
                    description: "You can now log in using these credentials.",
                });
                await auth.signOut();
                router.push('/auth/login');
            } catch (error: any) {
                let description = "An unexpected error occurred during admin creation.";
                if (error instanceof FirebaseError && error.code === 'auth/email-already-in-use') {
                    description = 'The admin account already exists. Please proceed to login.';
                }
                toast({
                    variant: 'destructive',
                    title: "Admin Creation Failed",
                    description: description,
                });
            } finally {
                setIsLoading(false);
            }
            return;
        }

        // Standard seller signup
        if (!companyName) {
            toast({ variant: 'destructive', title: "Missing Fields", description: "Please fill out all required fields." });
            setIsLoading(false);
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            await updateProfile(user, {
                displayName: companyName,
            });

            const newSellerRequest: SellerUser = {
                id: user.uid,
                companyName: companyName,
                email: user.email || '',
                status: 'pending',
            };

            const existingRequestsJSON = localStorage.getItem('seller_users');
            const existingRequests: SellerUser[] = existingRequestsJSON ? JSON.parse(existingRequestsJSON) : [];
            localStorage.setItem('seller_users', JSON.stringify([...existingRequests, newSellerRequest]));

            toast({
                title: "Registration Submitted!",
                description: "Your account is pending admin approval. You will be notified once it's reviewed.",
            });

            await auth.signOut();
            router.push('/auth/login');

        } catch (error: any)
          {
            console.error("Signup failed:", error);
            let title = "Signup Failed";
            let description = 'An unexpected error occurred during signup.';
            
            if (error instanceof FirebaseError) {
                switch (error.code) {
                    case 'auth/email-already-in-use':
                        description = 'This email address is already in use by another account.';
                        break;
                    case 'auth/weak-password':
                        description = 'The password is too weak. It must be at least 6 characters long.';
                        break;
                    case 'auth/invalid-email':
                        description = 'The email address is not valid.';
                        break;
                    default:
                        description = `An error occurred: ${error.message}`;
                }
            }
            
            toast({
                variant: 'destructive',
                title: title,
                description: description,
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
            <Card className="w-full max-w-sm shadow-lg">
                <CardHeader className="text-center">
                    <ShieldCheck className="mx-auto h-12 w-12 text-primary" />
                    <CardTitle>Create an Account</CardTitle>
                    <CardDescription>Join SnazzPay to manage your orders. Enter admin@snazzpay.com to create the admin user.</CardDescription>
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
                    {email !== ADMIN_EMAIL && (
                    <div className="space-y-2">
                        <Label htmlFor="companyName">Company Name</Label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                id="companyName" 
                                type="text" 
                                placeholder="Your Company LLC" 
                                value={companyName}
                                onChange={(e) => setCompanyName(e.target.value)}
                                className="pl-9" 
                            />
                        </div>
                    </div>
                    )}
                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                         <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                id="password" 
                                type="password" 
                                placeholder="Must be at least 6 characters" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                    <Button className="w-full" onClick={handleSignup} disabled={isLoading}>
                         {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing Up...</> : "Submit for Approval"}
                    </Button>
                    <div className="text-xs text-center text-muted-foreground space-x-1">
                        <Link href="/seller" className="text-primary hover:underline">
                            Learn more about selling.
                        </Link>
                        <span>|</span>
                        <Link href="/auth/login" className="text-primary hover:underline">
                            Login Here
                        </Link>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}
