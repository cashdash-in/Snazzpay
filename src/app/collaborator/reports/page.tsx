
'use client';

import { useState, useEffect } from 'react';
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, Download, Loader2 } from 'lucide-react';
import type { EditableOrder } from '@/app/orders/page';
import { getCollection } from '@/services/firestore';
import * as XLSX from 'xlsx';
import { format, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { useToast } from '@/hooks/use-toast';
import type { Collaborator } from '@/app/collaborators/page';


export default function CollaboratorReportsPage() {
    const { toast } = useToast();
    const [date, setDate] = useState<DateRange | undefined>();
    const [loading, setLoading] = useState(false);
    const [collaboratorId, setCollaboratorId] = useState<string | null>(null);

     useEffect(() => {
        const mobile = localStorage.getItem('loggedInCollaboratorMobile');
        if (!mobile) {
          toast({ variant: 'destructive', title: "Not Logged In" });
          return;
        }

        async function getCollaboratorId() {
          const allCollaborators = await getCollection<Collaborator>('collaborators');
          const collaborator = allCollaborators.find(c => c.phone === mobile);
          if (collaborator) {
            setCollaboratorId(collaborator.id);
          }
        }
        getCollaboratorId();
      }, [toast]);


    const handleGenerateReport = async () => {
        if (!collaboratorId) {
            toast({ variant: 'destructive', title: 'Not Authenticated' });
            return;
        }
        setLoading(true);
        try {
            const allOrders = await getCollection<EditableOrder>('orders');
            let collaboratorOrders = allOrders.filter(o => o.sellerId === collaboratorId && o.paymentStatus === 'Paid');

            if (date?.from) {
                const interval = { 
                    start: startOfDay(date.from), 
                    end: date.to ? endOfDay(date.to) : endOfDay(date.from) 
                };
                collaboratorOrders = collaboratorOrders.filter(item => isWithinInterval(new Date(item.date), interval));
            }

            if (collaboratorOrders.length === 0) {
                toast({ variant: 'destructive', title: 'No Data', description: 'No successful orders found for the selected date range.' });
                setLoading(false);
                return;
            }

            const worksheet = XLSX.utils.json_to_sheet(collaboratorOrders.map(o => ({
                'Order ID': o.orderId,
                'Date': o.date,
                'Customer Name': o.customerName,
                'Product': o.productOrdered,
                'Price (INR)': parseFloat(o.price),
                'Payment Status': o.paymentStatus,
            })));
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders Report');
            XLSX.writeFile(workbook, `Collaborator_Report_${collaboratorId}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);

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
                <CardTitle>My Generated Sales Report</CardTitle>
                <CardDescription>
                    Generate and download reports for your successfully converted sales.
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
