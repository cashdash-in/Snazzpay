
'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wallet, Loader2, Mail } from "lucide-react";
import Link from "next/link";
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { sanitizePhoneNumber } from '@/lib/utils';
import { getCollection } from '@/services/firestore';
import type { EditableOrder } from '@/app/orders/page';

export default function CustomerLoginPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [loginId, setLoginId] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async () => {
        setIsLoading(true);
        if (loginId.trim().length === 0) {
            toast({ variant: 'destructive', title: "Invalid Input", description: "Please enter a valid mobile number or email." });
            setIsLoading(false);
            return;
        }
        
        try {
            const allOrders = await getCollection<EditableOrder>('orders');
            
            const customerOrderExists = allOrders.some(order => {
                const isEmailMatch = order.customerEmail && order.customerEmail.toLowerCase() === loginId.toLowerCase();
                const isPhoneMatch = order.contactNo && sanitizePhoneNumber(order.contactNo) === sanitizePhoneNumber(loginId);
                return isEmailMatch || isPhoneMatch;
            });
            
            if (!customerOrderExists) {
                toast({ variant: 'destructive', title: "No Account Found", description: "We couldn't find an account associated with this mobile number or email. Please complete a Secure COD purchase first." });
                setIsLoading(false);
                return;
            }
            
            // We use the entered login ID (which could be email or phone) to find the main phone number for the account
            // For simplicity, we just use the first one we find.
            const representativeOrder = allOrders.find(order => (order.customerEmail && order.customerEmail.toLowerCase() === loginId.toLowerCase()) || (order.contactNo && sanitizePhoneNumber(order.contactNo) === sanitizePhoneNumber(loginId)));
            
            if (representativeOrder && representativeOrder.contactNo) {
                 localStorage.setItem('loggedInUserMobile', representativeOrder.contactNo);
                 toast({
                    title: "Login Link Sent!",
                    description: "A login link has been sent to your registered contact method.",
                });
                // Simulate waiting for user to click link
                setTimeout(() => {
                    router.push('/customer/dashboard');
                }, 1500)
            } else {
                 throw new Error("Could not determine a primary mobile number for your account.");
            }

        } catch (error: any) {
            console.error("Login failed:", error);
            toast({
                variant: 'destructive',
                title: "Login Error",
                description: error.message || "An unexpected error occurred during login."
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
                        <Label htmlFor="login-id">Enter Your Mobile Number or Email</Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                id="login-id" 
                                type="text" 
                                placeholder="Your mobile or email" 
                                value={loginId}
                                onChange={(e) => setLoginId(e.target.value)}
                                className="pl-9" 
                            />
                        </div>
                    </div>
                     <p className="text-xs text-center text-muted-foreground pt-2">
                        Your account is automatically created after your first successful Secure COD purchase.
                    </p>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                    <Button className="w-full" onClick={handleLogin} disabled={isLoading || !loginId}>
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Send Login Link
                    </Button>
                    <Link href="/secure-cod" className="text-sm text-primary hover:underline cursor-pointer">
                        Back to Main Page
                    </Link>
                </CardFooter>
            </Card>
        </div>
    );
}
