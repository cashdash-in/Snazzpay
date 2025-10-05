
'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Factory, Lock, Loader2, User, Mail } from "lucide-react";
import Link from "next/link";
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import type { Vendor } from '@/app/vendors/page';
import { FirebaseError } from 'firebase/app';
import { getCollection } from '@/services/firestore';


export default function VendorLoginPage() {
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

        // In a real OTP flow, this would send an OTP.
        toast({
            title: "OTP Sent",
            description: "An OTP has been sent to your registered mobile number.",
        });

        setTimeout(() => {
            setIsLoading(false);
        }, 1000);
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
            <Card className="w-full max-w-sm shadow-lg">
                <CardHeader className="text-center">
                    <Factory className="mx-auto h-12 w-12 text-primary" />
                    <CardTitle>SnazzPay Vendor Portal</CardTitle>
                    <CardDescription>Log in to your vendor dashboard using OTP.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="loginId">Email or Mobile Number</Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                id="loginId" 
                                type="text" 
                                placeholder="Your registered email or mobile" 
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
                        Are you a seller?{" "}
                        <Link href="/seller/login" className="text-primary hover:underline">
                            Login Here
                        </Link>
                         <span className="mx-1">|</span>
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
