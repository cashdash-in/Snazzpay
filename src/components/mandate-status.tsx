import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, Clock, Check } from "lucide-react";

type MandateStatusProps = {
  status: 'active' | 'pending' | 'failed' | 'completed';
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
};

export function MandateStatus({ status }: MandateStatusProps) {
  const config = statusConfig[status];
  
  return (
    <Badge variant="outline" className={cn("capitalize gap-1.5", config.className)}>
      <config.icon className="h-3.5 w-3.5" />
      {config.label}
    </Badge>
  );
}
