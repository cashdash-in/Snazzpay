
'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Truck, Lock, FileText, User, Home, Phone } from "lucide-react";
import Link from "next/link";
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Checkbox } from '@/components/ui/checkbox';
import type { LogisticsPartnerData } from '../login/page';
import { v4 as uuidv4 } from 'uuid';

export default function LogisticsSignupPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [agreed, setAgreed] = useState(false);
    const [formData, setFormData] = useState({
        companyName: '',
        pan: '',
        aadhaar: '',
        address: '',
        phone: ''
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    const handleSignup = () => {
        setIsLoading(true);

        const { companyName, pan, aadhaar, address, phone } = formData;
        if (!companyName || !pan || !aadhaar || !address || !phone) {
            toast({ variant: 'destructive', title: "Missing Fields", description: "Please fill out all required fields." });
            setIsLoading(false);
            return;
        }

        if (!agreed) {
            toast({ variant: 'destructive', title: 'Agreement Required', description: 'You must accept the terms and conditions to register.' });
            setIsLoading(false);
            return;
        }
        
        // In a real app, this would be a server call.
        // For the prototype, we save to localStorage for the admin to approve.
        const newPartnerRequest: LogisticsPartnerData = {
            id: `LGS-${uuidv4().substring(0, 8).toUpperCase()}`, // Generate a unique ID
            ...formData,
            status: 'pending'
        };

        const existingPartnersJSON = localStorage.getItem('logisticsPartners');
        const existingPartners: LogisticsPartnerData[] = existingPartnersJSON ? JSON.parse(existingPartnersJSON) : [];
        
        localStorage.setItem('logisticsPartners', JSON.stringify([...existingPartners, newPartnerRequest]));

        toast({
            title: "Registration Submitted",
            description: "Your application has been sent for admin approval. You will be notified once it's reviewed.",
        });
        
        router.push('/logistics-secure/login');
        
        setIsLoading(false);
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
            <Card className="w-full max-w-lg shadow-lg">
                <CardHeader className="text-center">
                    <Truck className="mx-auto h-12 w-12 text-primary" />
                    <CardTitle>Logistics Partner Registration</CardTitle>
                    <CardDescription>Join our network to manage secure pickups and deliveries.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="companyName">Company Name</Label>
                            <Input id="companyName" placeholder="Your Company Pvt. Ltd." value={formData.companyName} onChange={handleInputChange} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="phone">Contact Phone</Label>
                            <Input id="phone" placeholder="9876543210" value={formData.phone} onChange={handleInputChange} />
                        </div>
                     </div>
                     <div className="space-y-2">
                        <Label htmlFor="address">Complete Address</Label>
                        <Input id="address" placeholder="123, Main Street, Your City, 400001" value={formData.address} onChange={handleInputChange} />
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="pan">PAN Card Number</Label>
                            <Input id="pan" placeholder="ABCDE1234F" value={formData.pan} onChange={handleInputChange} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="aadhaar">Aadhaar Number</Label>
                            <Input id="aadhaar" placeholder="1234 5678 9012" value={formData.aadhaar} onChange={handleInputChange} />
                        </div>
                     </div>
                      <div className="flex items-start space-x-2 pt-2">
                        <Checkbox id="terms" checked={agreed} onCheckedChange={(checked) => setAgreed(checked as boolean)} className="mt-1" />
                        <Label htmlFor="terms" className="text-sm text-muted-foreground">
                            I agree to the <Link href="/terms-and-conditions" target="_blank" className="underline text-primary">Partner Terms and Conditions</Link>.
                        </Label>
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                    <Button className="w-full" onClick={handleSignup} disabled={isLoading}>
                        {isLoading ? 'Submitting...' : 'Submit for Approval'}
                    </Button>
                    <p className="text-xs text-center text-muted-foreground">
                        Already have an account?{" "}
                        <Link href="/logistics-secure/login" className="text-primary hover:underline">
                            Login Here
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}
