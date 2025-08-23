
'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Truck, Lock } from "lucide-react";
import Link from "next/link";
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export default function LogisticsLoginPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [agentId, setAgentId] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = () => {
        setIsLoading(true);
        // This is where you would add real authentication logic for logistics partners.
        // For now, we'll simulate it and redirect.
        
        if (!agentId || !password) {
            toast({ variant: 'destructive', title: "Login Failed", description: "Please enter your Agent/Partner ID and password." });
            setIsLoading(false);
            return;
        }

        setTimeout(() => {
             toast({
                title: "Login Successful (Simulated)",
                description: "Redirecting you to your logistics dashboard.",
            });
            router.push('/logistics-secure');
            setIsLoading(false);
        }, 1000);
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
            <Card className="w-full max-w-sm shadow-lg">
                <CardHeader className="text-center">
                    <Truck className="mx-auto h-12 w-12 text-primary" />
                    <CardTitle>Logistics Partner Portal</CardTitle>
                    <CardDescription>Login to manage secure cash pickups and deliveries.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="agent-id">Agent / Partner ID</Label>
                        <div className="relative">
                            <Truck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                id="agent-id" 
                                placeholder="Your unique Agent ID" 
                                value={agentId}
                                onChange={(e) => setAgentId(e.target.value)}
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
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                    <Button className="w-full" onClick={handleLogin} disabled={isLoading}>
                        {isLoading ? 'Verifying...' : 'Login to Logistics Portal'}
                    </Button>
                    <Link href="/secure-cod" className="text-sm text-primary hover:underline cursor-pointer">
                        Back to Main Page
                    </Link>
                </CardFooter>
            </Card>
        </div>
    );
}
