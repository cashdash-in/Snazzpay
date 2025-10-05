
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

// Dummy data for commissions
const commissions = [
    { id: 'tx-001', orderId: '#1234', date: '2024-05-20', productName: 'Designer Watch', saleAmount: 2500, commission: 125 },
    { id: 'tx-002', orderId: '#1237', date: '2024-05-21', productName: 'Leather Handbag', saleAmount: 1800, commission: 90 },
    { id: 'tx-003', orderId: '#1245', date: '2024-05-22', productName: 'Sunglasses', saleAmount: 950, commission: 47.50 },
];

export default function CollaboratorCommissionsPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto">
                 <header className="flex items-center gap-4 mb-8">
                    <Button variant="outline" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">My Commissions</h1>
                        <p className="text-muted-foreground">A detailed history of your earnings.</p>
                    </div>
                </header>

                <Card>
                    <CardHeader>
                        <CardTitle>Earnings Ledger</CardTitle>
                        <CardDescription>This table shows every successful sale attributed to your shares and the commission you earned.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Order ID</TableHead>
                                    <TableHead>Product</TableHead>
                                    <TableHead className="text-right">Sale Amount</TableHead>
                                    <TableHead className="text-right">Commission Earned</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {commissions.map(tx => (
                                    <TableRow key={tx.id}>
                                        <TableCell>{tx.date}</TableCell>
                                        <TableCell className="font-medium">{tx.orderId}</TableCell>
                                        <TableCell>{tx.productName}</TableCell>
                                        <TableCell className="text-right">₹{tx.saleAmount.toFixed(2)}</TableCell>
                                        <TableCell className="text-right font-semibold text-green-600">+ ₹{tx.commission.toFixed(2)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
