
'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Loader2, Mail } from "lucide-react";
import Link from "next/link";
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { getCollection } from '@/services/firestore';
import type { Collaborator } from '@/app/collaborators/page';

export default function CollaboratorLoginPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [loginId, setLoginId] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async () => {
        setIsLoading(true);
        const allCollaborators = await getCollection<Collaborator>('collaborators');
        const collaborator = allCollaborators.find(c => (c.phone === loginId || c.email === loginId));

        if (!collaborator) {
            toast({ variant: 'destructive', title: "Account Not Found", description: "No collaborator account found with this email or phone number." });
            setIsLoading(false);
            return;
        }

        if (collaborator.status !== 'approved' && collaborator.status !== 'active') {
            toast({ variant: 'destructive', title: "Account Not Approved", description: "Your account is pending approval or has been suspended. Please contact support." });
            setIsLoading(false);
            return;
        }

        // For prototype purposes, we simulate success and log the user in directly.
        localStorage.setItem('loggedInCollaboratorMobile', collaborator.phone);
        toast({
            title: "Login Successful!",
            description: "Redirecting to your dashboard.",
        });
        router.push('/collaborator/dashboard');
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
                        <Label htmlFor="loginId">Enter Your Email or Mobile Number</Label>
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
