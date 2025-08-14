
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { MandateStatus } from "@/components/mandate-status";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FileDown, Search } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { getMandates, getCustomer, type Mandate as RazorpayMandate } from "@/services/razorpay";
import { format } from "date-fns";

type Mandate = {
  mandateId: string;
  customerName: string;
  amount: number;
  status: 'active' | 'pending' | 'failed' | 'completed' | 'halted' | 'cancelled' | 'created';
  createdAt: string;
  nextBilling: string;
};


function mapRazorpayMandate(mandate: RazorpayMandate, customerName: string): Mandate {
    let status: Mandate['status'] = 'pending';
    // Mapping Razorpay status to our app's status
    switch (mandate.status) {
        case 'active':
            status = 'active';
            break;
        case 'pending':
            status = 'pending';
            break;
        case 'completed':
            status = 'completed';
            break;
        case 'halted':
            status = 'halted';
            break;
        case 'cancelled':
            status = 'cancelled';
            break;
        case 'created':
            status = 'created';
            break;
        case 'failed':
            status = 'failed';
            break;
    }

    return {
        mandateId: mandate.id,
        customerName: customerName,
        amount: mandate.max_amount / 100, // Assuming amount is in paise
        status: status,
        createdAt: format(new Date(mandate.created_at * 1000), "yyyy-MM-dd"),
        nextBilling: mandate.next_debit_date ? format(new Date(mandate.next_debit_date * 1000), "yyyy-MM-dd") : 'N/A',
    };
}


export default async function MandatesPage() {
  const razorpayMandates = await getMandates();
  const allMandates = await Promise.all(razorpayMandates.map(async (mandate) => {
    const customer = await getCustomer(mandate.customer_id);
    return mapRazorpayMandate(mandate, customer?.name || 'Unknown Customer');
  }));

  return (
    <AppShell title="Mandates">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Mandate Management</CardTitle>
              <CardDescription>View, search, and manage all your customer mandates.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search mandates..." className="pl-8" />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">Filter Status</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Status</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem checked>Active</DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem>Pending</DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem>Failed</DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem>Completed</DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="outline">
                <FileDown className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mandate ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Max Amount</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Next Billing</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allMandates.map((mandate) => (
                <TableRow key={mandate.mandateId}>
                  <TableCell className="font-mono text-xs">{mandate.mandateId}</TableCell>
                  <TableCell>{mandate.customerName}</TableCell>
                  <TableCell>₹{mandate.amount.toFixed(2)}</TableCell>
                  <TableCell className="text-center">
                    <MandateStatus status={mandate.status} />
                  </TableCell>
                  <TableCell>{mandate.createdAt}</TableCell>
                  <TableCell>{mandate.nextBilling}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
