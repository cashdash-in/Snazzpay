
'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Truck, Lock, Loader2, Mail } from "lucide-react";
import Link from "next/link";
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Checkbox } from '@/components/ui/checkbox';
import type { LogisticsPartnerData } from '../dashboard/page';


export default function LogisticsLoginPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [loginId, setLoginId] = useState('');
    const [password, setPassword] = useState('');
    const [agreed, setAgreed] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = () => {
        setIsLoading(true);

        if (!loginId || !password) {
            toast({ variant: 'destructive', title: "Login Failed", description: "Please enter your credentials and password." });
            setIsLoading(false);
            return;
        }

        if (!agreed) {
            toast({ variant: 'destructive', title: 'Agreement Required', description: 'You must accept the terms and conditions to log in.' });
            setIsLoading(false);
            return;
        }
        
        const allPartnersJSON = localStorage.getItem('logisticsPartners');
        const allPartners: LogisticsPartnerData[] = allPartnersJSON ? JSON.parse(allPartnersJSON) : [];
        const partner = allPartners.find(p => (p.id === loginId || p.phone === loginId) && p.status === 'approved');
        
        const isAdmin = loginId === 'partner-admin' && password === 'password';
        const isValidPartner = partner && password === 'password'; // Simplified password check

        setTimeout(() => {
            if (isAdmin || isValidPartner) {
                 const loggedInPartnerId = isAdmin ? 'partner-admin' : partner!.id;
                 const loggedInPartnerName = isAdmin ? 'Admin Logistics Partner' : partner!.companyName;

                localStorage.setItem('loggedInLogisticsPartnerId', loggedInPartnerId);
                localStorage.setItem('loggedInLogisticsPartnerName', loggedInPartnerName);

                toast({
                    title: "Login Successful",
                    description: "Redirecting you to your logistics dashboard...",
                });
                router.push('/logistics-secure/dashboard');
            } else {
                 toast({
                    variant: 'destructive',
                    title: "Login Failed",
                    description: "Invalid credentials or your account is not approved.",
                });
                 setIsLoading(false);
            }
        }, 500);
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
            <Card className="w-full max-w-sm shadow-lg">
                <CardHeader className="text-center">
                    <Truck className="mx-auto h-12 w-12 text-primary" />
                    <CardTitle>Logistics Partner Portal</CardTitle>
                    <CardDescription>Login to manage secure cash pickups and deliveries. (Hint: Use 'password' as the password)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="loginId">Partner ID / Email / Mobile</Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                id="loginId" 
                                placeholder="Your ID, email, or mobile" 
                                value={loginId}
                                onChange={(e) => setLoginId(e.target.value)}
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
                    <div className="flex items-start space-x-2 pt-2">
                        <Checkbox id="terms" checked={agreed} onCheckedChange={(checked) => setAgreed(checked as boolean)} className="mt-1" />
                        <Label htmlFor="terms" className="text-sm text-muted-foreground">
                            I agree to the <Link href="/terms/logistics" target="_blank" className="underline text-primary">Terms and Conditions</Link> for each login session.
                        </Label>
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                    <Button className="w-full" onClick={handleLogin} disabled={isLoading}>
                        {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...</> : 'Login to Logistics Portal'}
                    </Button>
                     <p className="text-xs text-center text-muted-foreground">
                        Don't have an account?{" "}
                        <Link href="/logistics-secure/signup" className="text-primary hover:underline">
                            Register Here
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}
