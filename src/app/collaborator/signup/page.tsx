
'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Loader2, Phone, User, Mail } from "lucide-react";
import Link from "next/link";
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export default function CollaboratorSignupPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [formData, setFormData] = useState({ name: '', phone: '', email: '' });
    const [isLoading, setIsLoading] = useState(false);

    const handleSignup = () => {
        setIsLoading(true);
        if (!formData.name || !formData.phone) {
            toast({ variant: 'destructive', title: "Missing Information", description: "Name and phone number are required." });
            setIsLoading(false);
            return;
        }

        // Placeholder for signup logic
        setTimeout(() => {
            console.log("New Collaborator Signup:", formData);
            toast({
                title: "Registration Successful!",
                description: "You can now log in with your mobile number.",
            });
            router.push('/collaborator/login');
        }, 1000);
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
            <Card className="w-full max-w-sm shadow-lg">
                <CardHeader className="text-center">
                    <UserPlus className="mx-auto h-12 w-12 text-primary" />
                    <CardTitle>Become a Guest Collaborator</CardTitle>
                    <CardDescription>Share products and earn commissions.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input id="name" value={formData.name} onChange={(e) => setFormData(p => ({...p, name: e.target.value}))} placeholder="Your full name" />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="phone">Mobile Number</Label>
                        <Input id="phone" type="tel" value={formData.phone} onChange={(e) => setFormData(p => ({...p, phone: e.target.value}))} placeholder="Your 10-digit mobile" />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData(p => ({...p, email: e.target.value}))} placeholder="Your email address" />
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                    <Button className="w-full" onClick={handleSignup} disabled={isLoading}>
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Sign Up
                    </Button>
                    <p className="text-xs text-center text-muted-foreground">
                        Already have an account?{" "}
                        <Link href="/collaborator/login" className="text-primary hover:underline">
                            Login Here
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}
