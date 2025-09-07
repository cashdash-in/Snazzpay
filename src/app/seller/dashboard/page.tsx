
'use client';
import { SellerDashboard } from "@/components/dashboard/seller-dashboard";
import { AppShell } from "@/components/layout/app-shell";
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search, WalletCards } from 'lucide-react';
import type { ShaktiCardData } from "@/components/shakti-card";
import { useToast } from "@/hooks/use-toast";


function ShaktiSearch() {
    const [searchPhone, setSearchPhone] = useState('');
    const [searchResult, setSearchResult] = useState<ShaktiCardData | null | 'not_found'>(null);
    const [isSearching, setIsSearching] = useState(false);
    const { toast } = useToast();

    const handleSearch = () => {
        if (!searchPhone) return;
        setIsSearching(true);
        setSearchResult(null);
        // Simulate API call
        setTimeout(() => {
            const allCards: ShaktiCardData[] = JSON.parse(localStorage.getItem('shakti_cards_db') || '[]');
            const foundCard = allCards.find(c => c.customerPhone.includes(searchPhone));
            if (foundCard) {
                setSearchResult(foundCard);
            } else {
                setSearchResult('not_found');
            }
            setIsSearching(false);
        }, 500);
    };

    return (
         <Card>
            <CardHeader>
                <CardTitle>Shakti Card Lookup</CardTitle>
                <CardDescription>Check if a customer has a Shakti Card by their mobile number.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                    <Input placeholder="Enter customer mobile number" value={searchPhone} onChange={e => setSearchPhone(e.target.value)} />
                    <Button onClick={handleSearch} disabled={isSearching}>
                        {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    </Button>
                </div>
                {searchResult && (
                    searchResult === 'not_found' ? (
                        <div className="p-4 bg-yellow-50 text-yellow-800 rounded-md text-sm text-center">No Shakti Card found for this mobile number.</div>
                    ) : (
                        <div className="p-4 bg-green-50 text-green-800 rounded-md text-sm space-y-1">
                            <p><strong className="text-green-900">Card Found:</strong> {searchResult.customerName}</p>
                            <p><strong className="text-green-900">Card Number:</strong> {searchResult.cardNumber}</p>
                            <p><strong className="text-green-900">Points:</strong> {searchResult.points}</p>
                        </div>
                    )
                )}
            </CardContent>
        </Card>
    );
}


export default function SellerDashboardPage() {
  return (
    <AppShell title="Seller Dashboard">
        <Tabs defaultValue="dashboard">
            <TabsList className="grid w-full grid-cols-2 max-w-sm">
                <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                <TabsTrigger value="shakti-search">Shakti Card</TabsTrigger>
            </TabsList>
            <TabsContent value="dashboard" className="mt-4">
                 <SellerDashboard />
            </TabsContent>
             <TabsContent value="shakti-search" className="mt-4">
                 <ShaktiSearch />
            </TabsContent>
        </Tabs>
    </AppShell>
  );
}
