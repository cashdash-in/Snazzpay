
'use client';

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { DollarSign, ShoppingCart, Activity, Star, Factory, Sparkles, PackagePlus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getDocument, getCollection } from "@/services/firestore";
import type { SellerUser } from "@/app/seller-accounts/page";
import type { SellerProduct } from "@/app/seller/ai-product-uploader/page";
import { getCookie } from "cookies-next";

const AI_UPLOADER_LIMIT = 50;
const PRODUCT_DROP_LIMIT = 50;

export function SellerDashboard() {
    const { user } = useAuth();
    const [sellerInfo, setSellerInfo] = useState<SellerUser | null>(null);
    const [usage, setUsage] = useState({ drops: 0, aiUploads: 0 });
    const [limits, setLimits] = useState({ aiUploadLimit: AI_UPLOADER_LIMIT, productDropLimit: PRODUCT_DROP_LIMIT });

    useEffect(() => {
        async function loadSellerInfo() {
            if (user) {
                const [info, products, permissions] = await Promise.all([
                    getDocument<SellerUser>('seller_users', user.uid),
                    getCollection<SellerProduct>('seller_products'),
                    getDocument<{ aiUploadLimit?: number; productDropLimit?: number }>('user_permissions', user.uid)
                ]);

                if (info) {
                    setSellerInfo(info);
                }

                const sellerProducts = products.filter(p => p.sellerId === user.uid);
                setUsage({ drops: 0, aiUploads: sellerProducts.length });

                if (permissions) {
                    setLimits({
                        aiUploadLimit: permissions.aiUploadLimit || AI_UPLOADER_LIMIT,
                        productDropLimit: permissions.productDropLimit || PRODUCT_DROP_LIMIT
                    });
                }
            }
        }
        loadSellerInfo();
    }, [user]);

    return (
        <div className="grid gap-8">
            <Card>
                <CardHeader>
                    <CardTitle>Welcome, <span className="font-bold">{sellerInfo?.companyName || 'Seller'}</span>!</CardTitle>
                    <CardDescription>
                        {sellerInfo?.vendorName ? (
                            <span className="flex items-center gap-2">
                                <Factory className="h-4 w-4" />
                                Your approved vendor is <span className="font-bold">{sellerInfo.vendorName}</span>
                            </span>
                        ) : (
                            "This is your dedicated dashboard. From here you can manage your products, view your orders, and track your performance."
                        )}
                    </CardDescription>
                </CardHeader>
            </Card>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div className="space-y-1">
                            <CardTitle className="text-lg flex items-center gap-2"><Sparkles /> AI Product Uploader</CardTitle>
                            <CardDescription>Generate product listings using AI.</CardDescription>
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-bold">{usage.aiUploads} / {limits.aiUploadLimit}</p>
                            <p className="text-xs text-muted-foreground">Generations Used</p>
                        </div>
                    </CardHeader>
                    <CardFooter>
                        <p className="text-sm text-muted-foreground">Contact the administrator to upgrade your plan for a higher limit.</p>
                    </CardFooter>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div className="space-y-1">
                            <CardTitle className="text-lg flex items-center gap-2"><PackagePlus /> Product Drops</CardTitle>
                            <CardDescription>Receive new product info from vendors.</CardDescription>
                        </div>
                        <div className="text-right">
                             <p className="text-2xl font-bold">{usage.drops} / {limits.productDropLimit}</p>
                            <p className="text-xs text-muted-foreground">Usage (Placeholder)</p>
                        </div>
                    </CardHeader>
                     <CardFooter>
                        <p className="text-sm text-muted-foreground">This feature's usage is not yet tracked.</p>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
