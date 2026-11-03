
'use client';

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Coins, Package, Handshake, Info, PlusCircle, Printer, Download, Loader2, QrCode, Check, X, Eye, ShoppingBasket, BadgeCheck, Users, Settings, Gem, Percent, Calendar, Search } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { v4 as uuidv4 } from 'uuid';
import type { ShaktiCardData } from "@/components/shakti-card";
import { getCollection, saveDocument } from '@/services/firestore';

export type PartnerData = {
    id: string;
    companyName: string;
    pan: string;
    aadhaar: string;
    address: string;
    phone: string;
    email: string;
    status: 'pending' | 'approved' | 'rejected';
    balance: number;
    totalCollected: number;
};

export type SellerUser = {
    id: string;
    companyName: string;
    email: string;
    status: 'pending' | 'approved' | 'rejected';
};

export type TopUpRequest = {
    id: string;
    partnerId: string;
    partnerName: string;
    coinsRequested: number;
    amountPaid: number;
    paymentId: string;
    status: 'Pending Approval' | 'Approved';
    requestDate: string;
};

type RewardRules = {
    pointsPerRupee: number;
    cashbackPercentage: number;
    discountPercentage: number;
};

export default function PartnerHubPage() {
    const { toast } = useToast();
    const [codes, setCodes] = useState<{ id: string; value: string; date: string; partner: string; status: string; }[]>([]);
    const [payPartners, setPayPartners] = useState<PartnerData[]>([]);
    const [payPartnerRequests, setPayPartnerRequests] = useState<PartnerData[]>([]);
    const [topUpRequests, setTopUpRequests] = useState<TopUpRequest[]>([]);
    const [newCodeValue, setNewCodeValue] = useState('');
    const [selectedPartner, setSelectedPartner] = useState('');
    const [shaktiCards, setShaktiCards] = useState<ShaktiCardData[]>([]);
    const [rewardRules, setRewardRules] = useState<Record<string, RewardRules>>({});
    const [approvedSellers, setApprovedSellers] = useState<SellerUser[]>([]);
    const [selectedSellerForRules, setSelectedSellerForRules] = useState<string>('');
    const [currentSellerRules, setCurrentSellerRules] = useState<RewardRules>({ pointsPerRupee: 0.01, cashbackPercentage: 1, discountPercentage: 10 });
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        async function loadData() {
            try {
                const allPayPartners = await getCollection<PartnerData>('payPartners');
                setPayPartners(allPayPartners.filter(p => p.status === 'approved'));
                setPayPartnerRequests(allPayPartners.filter(p => p.status === 'pending'));

                const allTopUps = await getCollection<TopUpRequest>('topUpRequests');
                setTopUpRequests(allTopUps);
                
                const allShaktiCards = await getCollection<ShaktiCardData>('shakti_cards');
                setShaktiCards(allShaktiCards);
                
                const storedRules = await getCollection<any>('shakti_card_rules_db');
                if (storedRules.length > 0) {
                    const rulesMap = storedRules.reduce((acc, rule) => {
                        acc[rule.id] = rule;
                        return acc;
                    }, {});
                    setRewardRules(rulesMap);
                }

                const approvedSellersList = await getCollection<SellerUser>('seller_users');
                setApprovedSellers(approvedSellersList.filter(s => s.status === 'approved'));
            } catch (error) {
                toast({ variant: 'destructive', title: "Failed to load data" });
            }
        }
        loadData();
    }, [toast]);
    
    const filteredShaktiCards = useMemo(() => {
        if (!searchQuery) return shaktiCards;
        return shaktiCards.filter(card =>
            card.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            card.customerPhone.includes(searchQuery)
        );
    }, [searchQuery, shaktiCards]);

    return (
        <AppShell title="Partner Pay">
            <Tabs defaultValue="pay-partners">
                <TabsList className="grid w-full grid-cols-5 max-w-4xl mx-auto">
                    <TabsTrigger value="overview" className="text-[10px] font-bold uppercase">Guide</TabsTrigger>
                     <TabsTrigger value="pay-partners" className="text-[10px] font-bold uppercase">Agents <Badge className="ml-1 h-4 min-w-4 p-0 text-[8px]">{payPartnerRequests.length}</Badge></TabsTrigger>
                     <TabsTrigger value="topups" className="text-[10px] font-bold uppercase">Top-ups <Badge className="ml-1 h-4 min-w-4 p-0 text-[8px]">{topUpRequests.filter(r => r.status === 'Pending Approval').length}</Badge></TabsTrigger>
                    <TabsTrigger value="codes" className="text-[10px] font-bold uppercase">Codes</TabsTrigger>
                    <TabsTrigger value="shakti-admin" className="text-[10px] font-bold uppercase">Shakti</TabsTrigger>
                </TabsList>

                <TabsContent value="pay-partners" className="mt-4">
                    <Card>
                        <CardHeader><CardTitle>Partner Agents</CardTitle></CardHeader>
                        <CardContent>
                           <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Shop Name</TableHead>
                                        <TableHead>Balance</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {payPartners.map(partner => (
                                        <TableRow key={partner.id}>
                                            <TableCell className="font-black italic uppercase text-xs">{partner.companyName}</TableCell>
                                            <TableCell className="font-bold text-blue-600">₹{partner.balance.toFixed(2)}</TableCell>
                                            <TableCell className="text-right"><Button size="sm" variant="outline"><Eye className="h-3 w-3"/></Button></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                           </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </AppShell>
    );
}

