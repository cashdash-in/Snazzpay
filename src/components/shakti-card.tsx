
'use client';

import { Gem, Nfc, ShieldCheck } from 'lucide-react';
import Image from 'next/image';

export interface ShaktiCardData {
  cardNumber: string;
  customerName: string;
  validFrom: string;
  validThru: string;
  points: number;
  cashback: number;
}

interface ShaktiCardProps {
  card: ShaktiCardData;
}

export function ShaktiCard({ card }: ShaktiCardProps) {
  return (
    <div className="w-full max-w-sm rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white shadow-2xl space-y-6 relative overflow-hidden">
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-500/20 rounded-full blur-2xl"></div>
      <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl"></div>
      
      <div className="flex justify-between items-start z-10 relative">
        <div className="space-y-1">
          <h3 className="text-2xl font-bold tracking-wider flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-purple-400" />
            SHAKTI
          </h3>
          <p className="text-xs font-mono opacity-80 uppercase">Secure COD Card</p>
        </div>
        <Nfc className="h-8 w-8 text-white/80" />
      </div>

      <div className="space-y-1 text-center z-10 relative">
        <p className="text-xl font-mono tracking-widest">{card.cardNumber}</p>
      </div>

      <div className="flex justify-between items-end z-10 relative">
        <div className="space-y-1">
          <p className="text-xs font-mono opacity-80">CARD HOLDER</p>
          <p className="text-base font-medium uppercase tracking-wider">{card.customerName}</p>
        </div>
        <div className="text-right space-y-1">
           <p className="text-xs font-mono opacity-80">VALID THRU</p>
           <p className="text-base font-medium tracking-wider">{card.validThru}</p>
        </div>
      </div>
    </div>
  );
}
