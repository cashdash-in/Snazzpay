

'use client';
import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { getDocument, saveDocument, getCollection } from "@/services/firestore";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Terminal, PackagePlus } from "lucide-react";
import type { ProductDrop } from '@/app/vendor/product-drops/page';

type PaymentSettings = {
    razorpay_key_id: string;
    razorpay_key_secret: string;
};

const PRODUCT_DROP_LIMIT = 50;

export default function VendorSettingsPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({ razorpay_key_id: '', razorpay_key_secret: '' });
    const [usage, setUsage] = useState({ drops: 0 });
    const [limit, setLimit] = useState(PRODUCT_DROP_LIMIT);

     useEffect(() => {
        if (user) {
            getDocument<PaymentSettings>('vendor_payment_settings', user.uid).then(settings => {
                if (settings) {
                    setPaymentSettings(settings);
                }
            });

            async function fetchUsageAndLimits() {
                 const [allDrops, permissions] = await Promise.all([
                    getCollection<ProductDrop>('product_drops'),
                    getDocument<{productDropLimit?: number}>('user_permissions', user!.uid)
                ]);
                
                const vendorDrops = allDrops.filter(d => d.vendorId === user.uid);
                setUsage({ drops: vendorDrops.length });
                if (permissions?.productDropLimit) {
                    setLimit(permissions.productDropLimit);
                }
            }
            fetchUsageAndLimits();
        }
    }, [user]);

    const handlePaymentSettingsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPaymentSettings({ ...paymentSettings, [e.target.name]: e.target.value });
    };

    const handleSavePaymentSettings = async () => {
        if (!user) {
            toast({ variant: 'destructive', title: 'Not Authenticated' });
            return;
        }
        try {
            await saveDocument('vendor_payment_settings', paymentSettings, user.uid);
            toast({ title: 'Settings Saved', description: 'Your payment gateway settings have been updated.' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error Saving Settings', description: error.message });
        }
    };

  return (
    <AppShell title="My Settings">
       <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="profile">My Profile</TabsTrigger>
                <TabsTrigger value="payments">Payment Gateway</TabsTrigger>
                <TabsTrigger value="usage">Usage & Billing</TabsTrigger>
            </TabsList>
            <TabsContent value="profile">
                <Card>
                    <CardHeader>
                        <CardTitle>My Settings</CardTitle>
                        <CardDescription>
                            This is where you will manage your vendor profile and account settings. This page is currently a placeholder.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p>Vendor settings features will be added here soon.</p>
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="payments">
                 <Card>
                    <CardHeader>
                        <CardTitle>Your Payment Gateway</CardTitle>
                        <CardDescription>
                            Connect your own Razorpay account to receive payments directly for your products.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Alert>
                            <Terminal className="h-4 w-4" />
                            <AlertTitle>Your Own Gateway</AlertTitle>
                            <AlertDescription>
                                <p>The credentials you enter here will be used for any direct sales or settlements. Sellers in your network will use their own gateways.</p>
                            </AlertDescription>
                        </Alert>
                         <div className="space-y-2">
                            <Label htmlFor="vendor_razorpay_key_id">Razorpay Key ID</Label>
                            <Input 
                            id="vendor_razorpay_key_id" 
                            name="razorpay_key_id"
                            placeholder="rzp_live_..." 
                            value={paymentSettings.razorpay_key_id}
                            onChange={handlePaymentSettingsChange}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="vendor_razorpay_key_secret">Razorpay Key Secret</Label>
                            <Input 
                            id="vendor_razorpay_key_secret" 
                            name="razorpay_key_secret"
                            type="password" 
                            placeholder="Your key secret" 
                            value={paymentSettings.razorpay_key_secret}
                            onChange={handlePaymentSettingsChange}
                            />
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button onClick={handleSavePaymentSettings}>Save Payment Settings</Button>
                    </CardFooter>
                </Card>
            </TabsContent>
            <TabsContent value="usage">
                <Card>
                    <CardHeader>
                        <CardTitle>Usage and Billing</CardTitle>
                        <CardDescription>
                            Track your usage of premium features and manage your subscription.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div className="space-y-1">
                                    <CardTitle className="text-lg flex items-center gap-2"><PackagePlus /> Product Drops</CardTitle>
                                    <CardDescription>Share new products with your seller network.</CardDescription>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-bold">{usage.drops} / {limit}</p>
                                    <p className="text-xs text-muted-foreground">Free Drops Used</p>
                                </div>
                            </CardHeader>
                            <CardFooter>
                                <p className="text-sm text-muted-foreground">Contact the administrator to upgrade your plan for a higher limit.</p>
                            </CardFooter>
                        </Card>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    </AppShell>
  );
}
