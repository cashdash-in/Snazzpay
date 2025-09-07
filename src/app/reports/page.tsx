
'use client';

import { useState } from 'react';
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon, Download, Loader2 } from "lucide-react";
import { format, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import type { DateRange } from "react-day-picker";
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';
import type { EditableOrder } from '../orders/page';
import { getOrders } from '@/services/shopify';
import type { ShaktiCardData } from '@/components/shakti-card';

type DataSource = 'orders' | 'leads' | 'seller_orders' | 'shakti_cards';
const paymentStatuses = ['Pending', 'Intent Verified', 'Authorized', 'Paid', 'Refunded', 'Partially Paid', 'Voided', 'Fee Charged'];
const leadStatuses = ['Intent Verified']; // Leads are just orders with this status

export default function ReportsPage() {
    const { toast } = useToast();
    const [dataSource, setDataSource] = useState<DataSource>('orders');
    const [status, setStatus] = useState<string>('all');
    const [date, setDate] = useState<DateRange | undefined>();
    const [loading, setLoading] = useState(false);
    
    const isFilterDisabled = dataSource === 'leads' || dataSource === 'shakti_cards';

    const handleGenerateReport = async () => {
        setLoading(true);
        try {
            // 1. Fetch all data
            let dataToExport: any[] = [];
            
            if (dataSource === 'shakti_cards') {
                const shaktiCardsJSON = localStorage.getItem('shakti_cards_db');
                dataToExport = shaktiCardsJSON ? JSON.parse(shaktiCardsJSON) : [];
            } else {
                 let allOrders: EditableOrder[] = [];

                if (dataSource === 'orders') {
                    try {
                        const shopifyOrders = await getOrders();
                        const shopifyEditableOrders = shopifyOrders.map(o => ({
                            id: o.id.toString(), orderId: o.name, customerName: `${o.customer?.first_name || ''} ${o.customer?.last_name || ''}`.trim(), customerEmail: o.customer?.email, customerAddress: `${o.shipping_address?.address1 || ''}, ${o.shipping_address?.city || ''}`, pincode: o.shipping_address?.zip || '', contactNo: o.customer?.phone || '', productOrdered: o.line_items.map(i => i.title).join(', '), quantity: o.line_items.reduce((sum, i) => sum + i.quantity, 0), price: o.total_price, paymentStatus: o.financial_status || 'Pending', date: o.created_at, source: 'Shopify'
                        }));
                        allOrders.push(...shopifyEditableOrders);
                    } catch (error) { console.error("Could not fetch Shopify orders:", error); }
                    
                    const manualOrdersJSON = localStorage.getItem('manualOrders');
                    if (manualOrdersJSON) { allOrders.push(...JSON.parse(manualOrdersJSON).map((o: EditableOrder) => ({...o, source: o.source || 'Manual'}))); }
                }
                
                if (dataSource === 'seller_orders' || dataSource === 'orders') {
                    const sellerOrdersJSON = localStorage.getItem('seller_orders');
                    if (sellerOrdersJSON) { allOrders.push(...JSON.parse(sellerOrdersJSON).map((o: EditableOrder) => ({...o, source: 'Seller'}))); }
                }
                
                if (dataSource === 'leads') {
                     const leadsJSON = localStorage.getItem('leads');
                     if (leadsJSON) { allOrders.push(...JSON.parse(leadsJSON)); }
                }

                allOrders = allOrders.map(order => {
                    const storedOverrides = JSON.parse(localStorage.getItem(`order-override-${order.id}`) || '{}');
                    return { ...order, ...storedOverrides };
                });

                dataToExport = allOrders;

                if (dataSource === 'leads') {
                    dataToExport = dataToExport.filter(item => item.paymentStatus === 'Intent Verified');
                } else if (dataSource === 'seller_orders') {
                     dataToExport = dataToExport.filter(item => item.source === 'Seller');
                }


                if (status !== 'all' && !isFilterDisabled) {
                    dataToExport = dataToExport.filter(item => item.paymentStatus === status);
                }

                if (date?.from && date?.to) {
                    const interval = { start: startOfDay(date.from), end: endOfDay(date.to) };
                    dataToExport = dataToExport.filter(item => isWithinInterval(new Date(item.date), interval));
                } else if (date?.from) {
                    const interval = { start: startOfDay(date.from), end: endOfDay(date.from) };
                    dataToExport = dataToExport.filter(item => isWithinInterval(new Date(item.date), interval));
                }
            }


            if (dataToExport.length === 0) {
                toast({
                    variant: 'destructive',
                    title: "No Data Found",
                    description: "No records match your selected filters. Please try a different combination.",
                });
                setLoading(false);
                return;
            }

            // 3. Prepare for Excel
            let worksheet;
            if (dataSource === 'shakti_cards') {
                worksheet = XLSX.utils.json_to_sheet(dataToExport.map((item: ShaktiCardData) => ({
                    'Card Number': item.cardNumber, 'Customer Name': item.customerName, 'Customer Phone': item.customerPhone, 'Points': item.points, 'Cashback': item.cashback, 'Valid Thru': item.validThru, 'Seller Name': item.sellerName, 'Seller ID': item.sellerId
                })));
            } else {
                 worksheet = XLSX.utils.json_to_sheet(dataToExport.map((item: EditableOrder) => ({
                    'Order ID': item.orderId, 'Date': format(new Date(item.date), 'yyyy-MM-dd'), 'Customer Name': item.customerName, 'Contact No': item.contactNo, 'Email': item.customerEmail, 'Address': item.customerAddress, 'Pincode': item.pincode, 'Product(s)': item.productOrdered, 'Quantity': item.quantity, 'Price': item.price, 'Payment Status': item.paymentStatus, 'Delivery Status': item.deliveryStatus || 'N/A', 'Tracking Number': item.trackingNumber || 'N/A', 'Source': item.source || 'N/A'
                })));
            }
            
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');

            // 4. Download Excel file
            const fileName = `SnazzPay_${dataSource}_report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
            XLSX.writeFile(workbook, fileName);

            toast({
                title: "Report Generated",
                description: `${dataToExport.length} records exported successfully.`,
            });

        } catch (error: any) {
            console.error("Failed to generate report:", error);
            toast({
                variant: 'destructive',
                title: "Error Generating Report",
                description: error.message,
            });
        } finally {
            setLoading(false);
        }
    };

    const currentStatuses = dataSource === 'orders' ? paymentStatuses : leadStatuses;

    return (
        <AppShell title="Reports">
            <Card className="max-w-3xl mx-auto">
                <CardHeader>
                    <CardTitle>Generate Reports</CardTitle>
                    <CardDescription>Export your orders or leads data to an Excel file based on your selected filters.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="data-source">Data Source</Label>
                        <Select value={dataSource} onValueChange={(value: DataSource) => {
                            setDataSource(value);
                            setStatus('all'); // Reset status on source change
                        }}>
                            <SelectTrigger id="data-source">
                                <SelectValue placeholder="Select data source" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="orders">All Orders</SelectItem>
                                <SelectItem value="leads">Leads (Intent Verified)</SelectItem>
                                <SelectItem value="seller_orders">Seller Uploaded Orders</SelectItem>
                                <SelectItem value="shakti_cards">Shakti Card Holders</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="status">Payment Status</Label>
                        <Select value={status} onValueChange={setStatus} disabled={isFilterDisabled}>
                            <SelectTrigger id="status">
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                {currentStatuses.map(s => (
                                    <SelectItem key={s} value={s}>{s}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                         {isFilterDisabled && <p className="text-xs text-muted-foreground">Status filters are not applicable for this data source.</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="date-range">Date Range</Label>
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
