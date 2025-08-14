
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, Clock, Check, Ban, AlertCircle, CirclePlus } from "lucide-react";

type MandateStatusProps = {
  status: 'active' | 'pending' | 'failed' | 'completed' | 'halted' | 'cancelled' | 'created';
};

const statusConfig = {
  active: {
    label: "Active",
    icon: CheckCircle2,
    className: "bg-green-100 text-green-800 border-green-200 hover:bg-green-100",
  },
  pending: {
    label: "Pending",
    icon: Clock,
    className: "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100",
  },
  failed: {
    label: "Failed",
    icon: XCircle,
    className: "bg-red-100 text-red-800 border-red-200 hover:bg-red-100",
  },
  completed: {
    label: "Completed",
    icon: Check,
    className: "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100",
  },
  halted: {
    label: "Halted",
    icon: Ban,
    className: "bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-100",
  },
  cancelled: {
    label: "Cancelled",
    icon: AlertCircle,
    className: "bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-100",
  },
  created: {
      label: "Created",
      icon: CirclePlus,
      className: "bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-100",
  }
};

export function MandateStatus({ status }: MandateStatusProps) {
  const config = statusConfig[status];
  
  if (!config) {
    return <Badge variant="outline">Unknown</Badge>;
  }

  return (
    <Badge variant="outline" className={cn("capitalize gap-1.5", config.className)}>
      <config.icon className="h-3.5 w-3.5" />
      {config.label}
    </Badge>
  );
}
