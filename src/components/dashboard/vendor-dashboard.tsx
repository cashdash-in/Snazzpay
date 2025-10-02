
'use client';

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { DollarSign, ShoppingCart, Activity, Star, Sparkles, PackagePlus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getDocument, getCollection } from "@/services/firestore";
import type { Vendor } from "@/app/vendors/page";
import type { ProductDrop } from "@/app/vendor/product-drops/page";
import { getCookie } from "cookies-next";

const PRODUCT_DROP_LIMIT = 50;

export function VendorDashboard() {
    const { user } = useAuth();
    const [vendorInfo, setVendorInfo] = useState<Vendor | null>(null);
    const [usage, setUsage] = useState({ drops: 0 });
    const [limit, setLimit] = useState(PRODUCT_DROP_LIMIT);

    useEffect(() => {
        async function loadVendorInfo() {
            if (user) {
                const [info, drops, permissions] = await Promise.all([
                    getDocument<Vendor>('vendors', user.uid),
                    getCollection<ProductDrop>('product_drops'),
                    getDocument<{ productDropLimit?: number }>('user_permissions', user.uid)
                ]);

                if (info) {
                    setVendorInfo(info);
                }

                const vendorDrops = drops.filter(d => d.vendorId === user.uid);
                setUsage({ drops: vendorDrops.length });

                if (permissions?.productDropLimit) {
                    setLimit(permissions.productDropLimit);
                }
            }
        }
        loadVendorInfo();
    }, [user]);

    return (
        <div className="grid gap-8">
             <Card>
                <CardHeader>
                    <CardTitle>Welcome, <span className="font-bold">{vendorInfo?.name || 'Vendor'}</span>!</CardTitle>
                    <CardDescription>
                        This is your dedicated dashboard. Manage your product drops and see an overview of your activity.
                    </CardDescription>
                </CardHeader>
            </Card>

             <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div className="space-y-1">
                        <CardTitle className="text-lg flex items-center gap-2"><PackagePlus /> Product Drops</CardTitle>
                        <CardDescription>Share new products with your seller network.</CardDescription>
                    </div>
                    <div className="text-right">
                        <p className="text-2xl font-bold">{usage.drops} / {limit}</p>
                        <p className="text-xs text-muted-foreground">Drops Used</p>
                    </div>
                </CardHeader>
                <CardFooter>
                    <p className="text-sm text-muted-foreground">Contact the administrator to upgrade your plan for a higher limit.</p>
                </CardFooter>
            </Card>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">1,250</div>
                        <p className="text-xs text-muted-foreground">(Placeholder)</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹8,50,000</div>
                        <p className="text-xs text-muted-foreground">(Placeholder)</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Sellers</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">42</div>
                        <p className="text-xs text-muted-foreground">(Placeholder)</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
