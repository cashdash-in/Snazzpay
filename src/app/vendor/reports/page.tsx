
'use client';
import { useState } from 'react';
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, Download, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import type { EditableOrder } from '@/app/orders/page';
import { getCollection } from '@/services/firestore';
import * as XLSX from 'xlsx';
import { format, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { useToast } from '@/hooks/use-toast';

export default function VendorReportsPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [date, setDate] = useState<DateRange | undefined>();
    const [loading, setLoading] = useState(false);

    const handleGenerateReport = async () => {
        if (!user) {
            toast({ variant: 'destructive', title: 'Not Authenticated' });
            return;
        }
        setLoading(true);
        try {
            const [allOrders, allSellers] = await Promise.all([
                getCollection<EditableOrder>('orders'),
                getCollection<any>('seller_users')
            ]);
            
            const mySellerIds = allSellers.filter(s => s.vendorId === user.uid).map(s => s.id);
            let vendorOrders = allOrders.filter(o => o.sellerId && mySellerIds.includes(o.sellerId));

            if (date?.from) {
                const interval = { 
                    start: startOfDay(date.from), 
                    end: date.to ? endOfDay(date.to) : endOfDay(date.from) 
                };
                vendorOrders = vendorOrders.filter(item => isWithinInterval(new Date(item.date), interval));
            }

            if (vendorOrders.length === 0) {
                toast({ variant: 'destructive', title: 'No Data', description: 'No orders found for your sellers in the selected date range.' });
                setLoading(false);
                return;
            }

            const worksheet = XLSX.utils.json_to_sheet(vendorOrders.map(o => {
                const sellerName = allSellers.find(s => s.id === o.sellerId)?.companyName || 'Unknown Seller';
                return {
                    'Order ID': o.orderId,
                    'Date': o.date,
                    'Seller Name': sellerName,
                    'Customer Name': o.customerName,
                    'Product': o.productOrdered,
                    'Price (INR)': parseFloat(o.price),
                    'Payment Status': o.paymentStatus,
                };
            }));
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders Report');
            XLSX.writeFile(workbook, `Vendor_Report_${user.displayName}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);

        } catch (error) {
            console.error("Error generating report:", error);
            toast({ variant: 'destructive', title: 'Report Generation Failed' });
        } finally {
            setLoading(false);
        }
    };

  return (
    <AppShell title="My Reports">
        <Card className="max-w-xl mx-auto">
            <CardHeader>
                <CardTitle>My Reports</CardTitle>
                <CardDescription>
                    Generate reports for products sold through your seller network.
                </CardDescription>
            </CardHeader>
             <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="date-range">Filter by Date Range</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                id="date-range"
                                variant={"outline"}
                                className={"w-full justify-start text-left font-normal"}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {date?.from ? (
                                    date.to ? (
                                        <>{format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")}</>
                                    ) : (
                                        format(date.from, "LLL dd, y")
                                    )
                                ) : (
                                    <span>Pick a date range</span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={date?.from}
                                selected={date}
                                onSelect={setDate}
                                numberOfMonths={2}
                            />
                        </PopoverContent>
                    </Popover>
                </div>
            </CardContent>
            <CardFooter>
                 <Button onClick={handleGenerateReport} disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                    Generate & Download Report
                </Button>
            </CardFooter>
        </Card>
    </AppShell>
  );
}
