
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
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async () => {
        setIsLoading(true);
        
        if (!loginId) {
            toast({ variant: 'destructive', title: "Invalid Input", description: "Please enter your email or mobile number." });
            setIsLoading(false);
            return;
        }

        // In a real OTP flow, this would send an OTP to the user's registered phone number.
        // For now, we simulate the start of this process.
        toast({
            title: "OTP Sent",
            description: "An OTP has been sent to your registered mobile number.",
        });

        // The rest of the logic would be handled on an OTP verification page.
        // We'll keep this disabled for now until the full OTP flow is built.
        
        // Simulating completion for prototype purposes:
        // In a real flow, you would verify the OTP then sign the user in with a custom token.
        setTimeout(() => {
            setIsLoading(false);
            // router.push('/seller/verify-otp'); // Example of next step
        }, 1000);
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
            <Card className="w-full max-w-sm shadow-lg">
                <CardHeader className="text-center">
                    <Store className="mx-auto h-12 w-12 text-primary" />
                    <CardTitle>SnazzPay Seller Central</CardTitle>
                    <CardDescription>Log in to your seller dashboard using OTP.</CardDescription>
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
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                    <Button className="w-full" onClick={handleLogin} disabled={isLoading}>
                        {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending OTP...</> : "Send OTP"}
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
