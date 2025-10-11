'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Loader2, Phone, User, Mail, Lock } from "lucide-react";
import Link from "next/link";
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { saveDocument } from '@/services/firestore';
import { v4 as uuidv4 } from 'uuid';
import type { Collaborator } from '@/app/collaborators/page';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { FirebaseError } from 'firebase/app';


export default function CollaboratorSignupPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [formData, setFormData] = useState({ name: '', phone: '', email: '', password: '' });
    const [isLoading, setIsLoading] = useState(false);

    const handleSignup = async () => {
        setIsLoading(true);
        if (!formData.name || !formData.phone || !formData.email || !formData.password) {
            toast({ variant: 'destructive', title: "Missing Information", description: "All fields including password are required." });
            setIsLoading(false);
            return;
        }

        if (formData.password.length < 6) {
             toast({ variant: 'destructive', title: "Weak Password", description: "Password must be at least 6 characters long." });
             setIsLoading(false);
             return;
        }

        try {
            // First, create the user in Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);

            // Then, save their details in Firestore
            const newCollaboratorRequest: Omit<Collaborator, 'id'> = {
                name: formData.name,
                phone: formData.phone,
                email: formData.email,
                status: 'pending',
                linkedTo: 'admin' // Default link to admin
            };
            
            await saveDocument('collaborators', newCollaboratorRequest, userCredential.user.uid);
            
            toast({
                title: "Registration Successful!",
                description: "Your application has been submitted for approval. You will be notified once it's reviewed.",
            });
            await auth.signOut(); // Sign out after registration
            router.push('/collaborator/login');

        } catch (error: any) {
             let description = "An unexpected error occurred.";
             if (error instanceof FirebaseError) {
                if (error.code === 'auth/email-already-in-use') {
                    description = 'This email is already registered. Please try logging in.';
                }
             }
             toast({
                variant: 'destructive',
                title: "Registration Failed",
                description,
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
            <Card className="w-full max-w-sm shadow-lg">
                <CardHeader className="text-center">
                    <UserPlus className="mx-auto h-12 w-12 text-primary" />
                    <CardTitle>Become a Guest Collaborator</CardTitle>
                    <CardDescription>Share products and earn commissions.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input id="name" value={formData.name} onChange={(e) => setFormData(p => ({...p, name: e.target.value}))} placeholder="Your full name" />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="phone">Mobile Number</Label>
                        <Input id="phone" type="tel" value={formData.phone} onChange={(e) => setFormData(p => ({...p, phone: e.target.value}))} placeholder="Your 10-digit mobile number" />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData(p => ({...p, email: e.target.value}))} placeholder="Your email address" />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                         <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                id="password" 
                                type="password" 
                                placeholder="Must be at least 6 characters" 
                                value={formData.password}
                                onChange={(e) => setFormData(p => ({...p, password: e.target.value}))}
                                className="pl-9"
                            />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                    <Button className="w-full" onClick={handleSignup} disabled={isLoading}>
                        {isLoading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Submitting...</> : 'Submit for Approval'}
                    </Button>
                    <p className="text-xs text-center text-muted-foreground">
                        Already have an account?{" "}
                        <Link href="/collaborator/login" className="text-primary hover:underline">
                            Login Here
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}
