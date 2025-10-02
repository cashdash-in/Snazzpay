
'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Phone, Wallet, Loader2 } from "lucide-react";
import Link from "next/link";
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { sanitizePhoneNumber } from '@/lib/utils';
import { getCollection } from '@/services/firestore';
import type { EditableOrder } from '@/app/orders/page';

export default function CustomerLoginPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [mobileNumber, setMobileNumber] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async () => {
        setIsLoading(true);
        if (mobileNumber.length < 10) {
            toast({ variant: 'destructive', title: "Invalid Input", description: "Please enter a valid 10-digit mobile number." });
            setIsLoading(false);
            return;
        }
        
        try {
            const sanitizedMobile = sanitizePhoneNumber(mobileNumber);
            const allOrders = await getCollection<EditableOrder>('orders');
            const customerOrderExists = allOrders.some(order => order.contactNo && sanitizePhoneNumber(order.contactNo) === sanitizedMobile);
            
            if (!customerOrderExists) {
                toast({ variant: 'destructive', title: "No Account Found", description: "We couldn't find an account associated with this mobile number. Please complete a Secure COD purchase first." });
                setIsLoading(false);
                return;
            }

            localStorage.setItem('loggedInUserMobile', mobileNumber);
            toast({
                title: "Login Successful",
                description: "Redirecting you to your customer dashboard.",
            });
            router.push('/customer/dashboard');

        } catch (error) {
            console.error("Login failed:", error);
            toast({
                variant: 'destructive',
                title: "Login Error",
                description: "An unexpected error occurred during login."
            });
             setIsLoading(false);
        }
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
            <Card className="w-full max-w-sm shadow-lg">
                <CardHeader className="text-center">
                    <Wallet className="mx-auto h-12 w-12 text-primary" />
                    <CardTitle>Snazzify Customer Portal</CardTitle>
                    <CardDescription>Log in to view your orders and Shakti Card.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="mobile-number">Enter Your Mobile Number</Label>
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
                     <p className="text-xs text-center text-muted-foreground pt-2">
                        Your account is automatically created after your first successful Secure COD purchase.
                    </p>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                    <Button className="w-full" onClick={handleLogin} disabled={isLoading || !mobileNumber}>
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Login
                    </Button>
                    <Link href="/secure-cod" className="text-sm text-primary hover:underline cursor-pointer">
                        Back to Main Page
                    </Link>
                </CardFooter>
            </Card>
        </div>
    );
}

    