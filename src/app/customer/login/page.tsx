
'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Phone, Lock, Wallet } from "lucide-react";
import Link from "next/link";
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export default function CustomerLoginPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [mobileNumber, setMobileNumber] = useState('');
    const [password, setPassword] = useState('');
    // isLoading state is removed as it was causing the component to get stuck.

    const handleLogin = () => {
        if (mobileNumber.length < 10 || !password) {
            toast({ variant: 'destructive', title: "Invalid Input", description: "Please enter a valid 10-digit mobile number and password." });
            return;
        }
        
        // This is a simulated login. In a real app, you would have proper authentication.
        try {
            localStorage.setItem('loggedInUserMobile', mobileNumber);
            toast({
                title: "Login Successful",
                description: "Redirecting you to your customer dashboard.",
            });
            // The router push is now the primary action.
            router.push('/customer/dashboard');
        } catch (error) {
            console.error("Login failed:", error);
            toast({
                variant: 'destructive',
                title: "Login Error",
                description: "An unexpected error occurred during login."
            });
        }
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
            <Card className="w-full max-w-sm shadow-lg">
                <CardHeader className="text-center">
                    <Wallet className="mx-auto h-12 w-12 text-primary" />
                    <CardTitle>Snazzify Customer Portal</CardTitle>
                    <CardDescription>Log in to view your orders and wallet.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="mobile-number">Mobile Number (User ID)</Label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                id="mobile-number" 
                                type="tel" 
                                placeholder="Your 10-digit mobile number" 
                                value={mobileNumber}
                                onChange={(e) => setMobileNumber(e.target.value)}
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
                    <p className="text-xs text-center text-muted-foreground pt-2">
                        New here? Don't worry. Just enter your mobile number and a new password to register automatically.
                    </p>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                    <Button className="w-full" onClick={handleLogin} disabled={!mobileNumber || !password}>
                        Login or Register
                    </Button>
                    <Link href="/secure-cod" className="text-sm text-primary hover:underline cursor-pointer">
                        Back to Main Page
                    </Link>
                </CardFooter>
            </Card>
        </div>
    );
}
