
'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Mail, Lock, Loader2, User, Phone, Factory, Store } from "lucide-react";
import Link from "next/link";
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { FirebaseError } from 'firebase/app';
import type { SellerUser } from '@/app/seller-accounts/page';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import type { Vendor } from '@/app/vendors/page';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';


const ADMIN_EMAIL = "admin@snazzpay.com";

export default function SignupPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [phone, setPhone] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [approvedVendors, setApprovedVendors] = useState<Vendor[]>([]);
    const [selectedVendor, setSelectedVendor] = useState('');
    const [userType, setUserType] = useState<'seller' | 'vendor'>('seller');
    
    useState(() => {
        const storedVendors = localStorage.getItem('vendors_db');
        if (storedVendors) {
            const vendors: Vendor[] = JSON.parse(storedVendors);
            setApprovedVendors(vendors.filter(v => v.status === 'approved'));
        }
    });

    const handleSignup = async () => {
        setIsLoading(true);
        if (!email || !password) {
            toast({ variant: 'destructive', title: "Missing Fields", description: "Please fill out email and password." });
            setIsLoading(false);
            return;
        }
        
        // Special case for creating the admin user
        if (email.toLowerCase() === ADMIN_EMAIL) {
            try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                await updateProfile(userCredential.user, {
                    displayName: "SnazzPay Admin",
                });
                toast({
                    title: "Admin Account Created!",
                    description: "You can now log in using these credentials on the Admin Login page.",
                });
                await auth.signOut();
                router.push('/auth/login');
            } catch (error: any) {
                let description = "An unexpected error occurred during admin creation.";
                if (error instanceof FirebaseError) {
                    if (error.code === 'auth/email-already-in-use') description = 'The admin account already exists. Please proceed to login.';
                    else if (error.code === 'auth/weak-password') description = 'The password is too weak. It must be at least 6 characters long.';
                }
                toast({ variant: 'destructive', title: "Admin Creation Failed", description });
            } finally {
                setIsLoading(false);
            }
            return;
        }

        // Standard seller or vendor signup
        if (!companyName || !phone) {
            toast({ variant: 'destructive', title: "Missing Fields", description: "Please fill out your company name and phone number." });
            setIsLoading(false);
            return;
        }

        if (userType === 'seller' && !selectedVendor) {
            toast({ variant: 'destructive', title: "Missing Fields", description: "As a seller, you must select a vendor." });
            setIsLoading(false);
            return;
        }
        
        if (userType === 'seller') {
            const newRequest: SellerUser = {
                id: `seller-${Date.now()}`,
                companyName: companyName,
                email: email,
                phone: phone,
                status: 'pending',
                vendorId: selectedVendor,
                vendorName: approvedVendors.find(v => v.id === selectedVendor)?.name,
            };
            const existingRequests = JSON.parse(localStorage.getItem('seller_requests') || '[]');
            localStorage.setItem('seller_requests', JSON.stringify([...existingRequests, newRequest]));
            toast({ title: "Registration Submitted!", description: "Your seller account is pending admin approval." });
            router.push('/seller/login');
        } else { // userType === 'vendor'
            const newRequest = {
                id: `vendor-${Date.now()}`,
                name: companyName,
                contactPerson: companyName, // Assuming company name for now
                phone,
                email,
                status: 'pending'
            };
             const existingRequests = JSON.parse(localStorage.getItem('vendor_requests') || '[]');
            localStorage.setItem('vendor_requests', JSON.stringify([...existingRequests, newRequest]));
            toast({ title: "Registration Submitted!", description: "Your vendor account is pending admin approval." });
            router.push('/vendor/login');
        }
        
        setIsLoading(false);
    };

    const isNonAdminSignup = email.toLowerCase() !== ADMIN_EMAIL;

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="text-center">
                    <ShieldCheck className="mx-auto h-12 w-12 text-primary" />
                    <CardTitle>Create an Account</CardTitle>
                    <CardDescription>Register as a Seller or Vendor, or create the Admin account.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input id="email" type="email" placeholder="Use admin@snazzpay.com for Admin" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9" />
                        </div>
                    </div>

                    {isNonAdminSignup && (
                        <>
                            <div className="space-y-3">
                                <Label>What are you signing up as?</Label>
                                <RadioGroup defaultValue="seller" onValueChange={(value: 'seller' | 'vendor') => setUserType(value)} className="flex gap-4">
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="seller" id="r1" />
                                        <Label htmlFor="r1" className="flex items-center gap-2"><Store className="h-4 w-4" /> Seller</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="vendor" id="r2" />
                                        <Label htmlFor="r2" className="flex items-center gap-2"><Factory className="h-4 w-4" /> Vendor</Label>
                                    </div>
                                </RadioGroup>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="companyName">{userType === 'seller' ? 'Seller Name' : 'Vendor/Company Name'}</Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input id="companyName" type="text" placeholder="Your Company LLC" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="pl-9" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone Number (for WhatsApp)</Label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input id="phone" type="tel" placeholder="e.g., 919876543210" value={phone} onChange={(e) => setPhone(e.target.value)} className="pl-9" />
                                </div>
                            </div>
                             {userType === 'seller' && (
                                <div className="space-y-2">
                                    <Label htmlFor="vendor-select">Select Your Vendor</Label>
                                    <Select onValueChange={setSelectedVendor} value={selectedVendor}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Choose the vendor you work with..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {approvedVendors.map(vendor => (
                                                <SelectItem key={vendor.id} value={vendor.id}>{vendor.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </>
                    )}
                    
                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                         <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input id="password" type="password" placeholder="Must be at least 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9" />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                    <Button className="w-full" onClick={handleSignup} disabled={isLoading}>
                         {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing Up...</> : "Create Account / Submit for Approval"}
                    </Button>
                    <div className="text-xs text-center text-muted-foreground space-x-1">
                        <span>Already have an account?</span>
                        <Link href="/seller/login" className="text-primary hover:underline">Seller Login</Link>
                        <Link href="/vendor/login" className="text-primary hover:underline">Vendor Login</Link>
                         <span>|</span>
                        <Link href="/auth/login" className="text-primary hover:underline">Admin Login</Link>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}

    