
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

export default function SellerSignupPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSignup = async () => {
        setIsLoading(true);
        if (!email || !password || !companyName) {
            toast({ variant: 'destructive', title: "Missing Fields", description: "Please fill out all required fields." });
            setIsLoading(false);
            return;
        }

        if (!auth || !db) {
            toast({ variant: 'destructive', title: "Firebase Not Configured", description: "Please check your Firebase configuration settings." });
            setIsLoading(false);
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            await updateProfile(user, {
                displayName: companyName,
            });

            // Create a document for the seller in Firestore
            await setDoc(doc(db, "sellers", user.uid), {
                uid: user.uid,
                email: user.email,
                companyName: companyName,
                createdAt: new Date().toISOString(),
            });

            toast({
                title: "Signup Successful!",
                description: "Your account has been created. Redirecting to login...",
            });

            router.push('/auth/login');

        } catch (error: any) {
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
                    case 'permission-denied':
                        title = 'Firestore Security Error';
                        description = "Could not create seller profile. Please ensure your Firestore security rules allow 'create' on the 'sellers' collection and that you have enabled Firestore in the Firebase console.";
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
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
            <Card className="w-full max-w-sm shadow-lg">
                <CardHeader className="text-center">
                    <ShieldCheck className="mx-auto h-12 w-12 text-primary" />
                    <CardTitle>Create a Seller Account</CardTitle>
                    <CardDescription>Join SnazzPay to manage your orders.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
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
                         {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing Up...</> : "Create Account"}
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
