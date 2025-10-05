
'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Handshake, Lock, Mail } from "lucide-react";
import Link from "next/link";
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Checkbox } from '@/components/ui/checkbox';
import type { PartnerData } from '../page';


export default function PartnerPayLoginPage() {
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

        const approvedPartnersJSON = localStorage.getItem('payPartners');
        const approvedPartners: PartnerData[] = approvedPartnersJSON ? JSON.parse(approvedPartnersJSON) : [];
        const partner = approvedPartners.find(p => (p.id === loginId || p.phone === loginId || p.email === loginId) && p.status === 'approved');

        setTimeout(() => {
            const isAdmin = loginId === 'partner-admin' && password === 'password';

            if (partner || isAdmin) {
                 const loggedInPartnerId = isAdmin ? 'partner-admin' : partner!.id;
                 localStorage.setItem('loggedInPartnerId', loggedInPartnerId);
                 toast({
                    title: "Login Successful",
                    description: "Redirecting you to your partner dashboard.",
                });
                router.push('/partner-pay/dashboard');
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
                    <Handshake className="mx-auto h-12 w-12 text-primary" />
                    <CardTitle>Snazzify Partner Portal</CardTitle>
                    <CardDescription>Login to manage your Snazzify Coin services.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="loginId">Partner ID / Email / Mobile</Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                id="loginId" 
                                placeholder="Your ID, email or mobile" 
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
                            I agree to the <Link href="/terms/partner-pay" target="_blank" className="underline text-primary">Terms and Conditions</Link> for each login session.
                        </Label>
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                    <Button className="w-full" onClick={handleLogin} disabled={isLoading}>
                        {isLoading ? 'Verifying...' : 'Login to Partner Portal'}
                    </Button>
                     <p className="text-xs text-center text-muted-foreground">
                        Don't have an account?{" "}
                        <Link href="/partner-pay/signup" className="text-primary hover:underline">
                            Register Here
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}
