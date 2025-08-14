import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { MandateStatus } from "@/components/mandate-status";

type Order = {
  orderId: string;
  customerName: string;
  amount: number;
  status: 'active' | 'pending' | 'failed' | 'completed';
  date: string;
};

const orders: Order[] = [
  { orderId: "#3210", customerName: "Olivia Martin", amount: 250.00, status: 'active', date: "2023-11-20" },
  { orderId: "#3209", customerName: "Jackson Lee", amount: 150.75, status: 'pending', date: "2023-11-19" },
  { orderId: "#3208", customerName: "Isabella Nguyen", amount: 350.00, status: 'failed', date: "2023-11-18" },
  { orderId: "#3207", customerName: "William Kim", amount: 450.50, status: 'completed', date: "2023-11-17" },
  { orderId: "#3206", customerName: "Sophia Davis", amount: 550.00, status: 'active', date: "2023-11-16" },
];

export function RecentOrders() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Orders</CardTitle>
        <CardDescription>A list of recent orders with their mandate status.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-center">Mandate Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.orderId}>
                <TableCell className="font-medium">{order.orderId}</TableCell>
                <TableCell>{order.customerName}</TableCell>
                <TableCell className="text-right">₹{order.amount.toFixed(2)}</TableCell>
                <TableCell className="text-center">
                  <MandateStatus status={order.status} />
                </TableCell>
                <TableCell>{order.date}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
