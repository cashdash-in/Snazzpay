
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
import { saveDocument } from '@/services/firestore';
import { v4 as uuidv4 } from 'uuid';
import type { Collaborator } from '@/app/collaborators/page';


export default function CollaboratorSignupPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [formData, setFormData] = useState({ name: '', phone: '', email: '' });
    const [isLoading, setIsLoading] = useState(false);

    const handleSignup = async () => {
        setIsLoading(true);
        if (!formData.name || !formData.phone || !formData.email) {
            toast({ variant: 'destructive', title: "Missing Information", description: "Name, WhatsApp number, and email are required." });
            setIsLoading(false);
            return;
        }

        const newCollaboratorRequest: Omit<Collaborator, 'id'> = {
            name: formData.name,
            phone: formData.phone,
            email: formData.email,
            status: 'pending',
            linkedTo: 'admin' // Default link to admin
        };

        try {
            await saveDocument('collaborators', newCollaboratorRequest, uuidv4());
            toast({
                title: "Registration Successful!",
                description: "Your application has been submitted for approval. You will be notified once it's reviewed.",
            });
            router.push('/collaborator/login');
        } catch (error: any) {
             toast({
                variant: 'destructive',
                title: "Registration Failed",
                description: error.message || 'An error occurred while submitting your request.',
            });
        } finally {
            setIsLoading(false);
        }
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
                        <Label htmlFor="phone">WhatsApp Number</Label>
                        <Input id="phone" type="tel" value={formData.phone} onChange={(e) => setFormData(p => ({...p, phone: e.target.value}))} placeholder="Your 10-digit WhatsApp number" />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData(p => ({...p, email: e.target.value}))} placeholder="Your email address" />
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                    <Button className="w-full" onClick={handleSignup} disabled={isLoading}>
                        {isLoading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Submitting...</> : 'Submit for Approval'}
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
