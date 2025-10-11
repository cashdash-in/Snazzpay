'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Mail, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { FirebaseError } from 'firebase/app';

export default function ForgotPasswordPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSent, setIsSent] = useState(false);

    const handleResetPassword = async () => {
        if (!email) {
            toast({ variant: 'destructive', title: "Email Required", description: "Please enter your email address." });
            return;
        }
        setIsLoading(true);

        try {
            await sendPasswordResetEmail(auth, email);
            setIsSent(true);
            toast({ title: "Reset Link Sent", description: "Please check your email for a password reset link." });
        } catch (error: any) {
            console.error("Password Reset Error:", error);
            let errorMessage = 'An unexpected error occurred.';
            if (error instanceof FirebaseError) {
                if (error.code === 'auth/user-not-found') {
                    errorMessage = 'No account found with this email address.';
                } else {
                    errorMessage = error.message;
                }
            }
            toast({ variant: 'destructive', title: "Error", description: errorMessage });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
            <Card className="w-full max-w-sm shadow-lg">
                <CardHeader className="text-center">
                    <ShieldCheck className="mx-auto h-12 w-12 text-primary" />
                    <CardTitle>Reset Password</CardTitle>
                    <CardDescription>Enter your email to receive a password reset link.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {isSent ? (
                        <div className="text-center text-green-600">
                            <p>A password reset link has been sent to <strong>{email}</strong>. Please check your inbox.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    id="email" 
                                    type="email" 
                                    placeholder="Enter your registered email" 
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="pl-9" 
                                />
                            </div>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                    {!isSent && (
                        <Button className="w-full" onClick={handleResetPassword} disabled={isLoading}>
                            {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</> : "Send Reset Link"}
                        </Button>
                    )}
                    <Button variant="ghost" asChild>
                         <Link href="/auth/login" className="text-sm">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Login
                        </Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
