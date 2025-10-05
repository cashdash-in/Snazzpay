
'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Loader2, Mail, Lock } from "lucide-react";
import Link from "next/link";
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { getCollection, saveDocument } from '@/services/firestore';
import type { Collaborator } from '@/app/collaborators/page';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { FirebaseError } from 'firebase/app';
import { Checkbox } from '@/components/ui/checkbox';

export default function CollaboratorLoginPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [loginId, setLoginId] = useState('');
    const [password, setPassword] = useState('');
    const [agreed, setAgreed] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async () => {
        setIsLoading(true);
        if (!loginId || !password) {
            toast({ variant: 'destructive', title: "Login ID and password required" });
            setIsLoading(false);
            return;
        }
        
        if (!agreed) {
            toast({ variant: 'destructive', title: 'Agreement Required', description: 'You must accept the terms and conditions.' });
            setIsLoading(false);
            return;
        }

        try {
            let userEmail = loginId;
            // In a real app with Firebase Auth, you need the email to sign in.
            // If the user provides a mobile number, we first find their email.
            if (!loginId.includes('@')) {
                const allCollaborators = await getCollection<Collaborator>('collaborators');
                const collaborator = allCollaborators.find(c => c.phone === loginId);
                if (collaborator && collaborator.email) {
                    userEmail = collaborator.email;
                } else {
                    throw new Error("No account found with this mobile number, or the account has no associated email.");
                }
            }

            // For prototype purposes, we simulate success if the user exists and is approved.
            // In a real app, this would use `signInWithEmailAndPassword`.
            const allCollaborators = await getCollection<Collaborator>('collaborators');
            const collaborator = allCollaborators.find(c => c.email === userEmail);
            
            if (!collaborator || collaborator.status !== 'approved') {
                 throw new Error("Invalid credentials or account not approved.");
            }
            
            // Simulate successful login and session creation
            localStorage.setItem('loggedInCollaboratorMobile', collaborator.phone);

            toast({
                title: "Login Successful!",
                description: "Redirecting to your dashboard.",
            });
            router.push('/collaborator/dashboard');

        } catch (error: any) {
            console.error("Login error:", error);
            let errorMessage = 'An unexpected error occurred during login.';
             if (error instanceof FirebaseError) {
                if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
                     errorMessage = 'Invalid credentials. Please check your email/mobile and password.';
                }
            } else {
                 errorMessage = error.message;
            }
            toast({ variant: 'destructive', title: "Login Failed", description: errorMessage });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
            <Card className="w-full max-w-sm shadow-lg">
                <CardHeader className="text-center">
                    <UserPlus className="mx-auto h-12 w-12 text-primary" />
                    <CardTitle>Guest Collaborator Portal</CardTitle>
                    <CardDescription>Login with your registered Email or Mobile number.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="loginId">Email or Mobile Number</Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                id="loginId" 
                                type="text" 
                                placeholder="Your email or mobile number" 
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
                            I agree to the <Link href="/terms-and-conditions" target="_blank" className="underline text-primary">Collaborator Terms</Link>.
                        </Label>
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                    <Button className="w-full" onClick={handleLogin} disabled={isLoading}>
                        {isLoading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Logging In...</> : "Login"}
                    </Button>
                    <p className="text-xs text-center text-muted-foreground">
                        Don't have an account?{" "}
                        <Link href="/collaborator/signup" className="text-primary hover:underline">
                            Sign Up Here
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}
