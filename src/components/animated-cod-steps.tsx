'use client';

import { useEffect, useState } from 'react';
import { CreditCard, Wallet, Truck, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const steps = [
  {
    icon: CreditCard,
    title: 'Pay Securely',
    description: 'You pay for your order upfront.',
  },
  {
    icon: Wallet,
    title: 'Funds Held in Trust',
    description: 'Your money is kept safe in a Trust Wallet.',
  },
  {
    icon: Truck,
    title: 'Order Dispatched',
    description: 'We pack and ship your order.',
  },
  {
    icon: CheckCircle,
    title: 'Payment Released',
    description: 'Funds are sent to us only after dispatch.',
  },
];

export function AnimatedCodSteps() {
  const [visibleSteps, setVisibleSteps] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setVisibleSteps((prev) => (prev < steps.length ? prev + 1 : prev));
    }, 400); // Animation delay between steps

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full space-y-6 py-4">
      <div className="relative flex items-center justify-between">
        <div className="absolute left-0 top-1/2 h-0.5 w-full -translate-y-1/2 bg-border" />
        <div className="absolute left-0 top-1/2 h-0.5 -translate-y-1/2 bg-primary transition-all duration-1000" style={{ width: `${((visibleSteps - 1) / (steps.length - 1)) * 100}%` }} />
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isVisible = index < visibleSteps;
          const isCompleted = index < visibleSteps -1;

          return (
            <div key={index} className={cn('relative z-10 flex flex-col items-center transition-opacity duration-500', isVisible ? 'opacity-100' : 'opacity-0')}>
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full border-2 bg-background transition-colors duration-500',
                  isCompleted ? 'border-primary bg-primary text-primary-foreground' : 'border-border'
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <p className="mt-2 text-center text-xs font-semibold">{step.title}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
