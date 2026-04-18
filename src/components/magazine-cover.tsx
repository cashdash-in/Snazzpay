'use client';

import Image from 'next/image';

interface MagazineCoverProps {
  imageUrl: string;
  title: string;
  vendorTitle?: string;
}

export function MagazineCover({ imageUrl, title, vendorTitle }: MagazineCoverProps) {
  return (
    <div className="relative w-[400px] h-[500px] bg-gray-100 overflow-hidden shadow-2xl rounded-lg font-sans">
      <Image
        src={imageUrl}
        alt={`Cover for ${title}`}
        fill
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      <div className="absolute bottom-0 left-0 p-8 text-white">
        {vendorTitle && (
            <p className="text-sm font-light tracking-widest uppercase opacity-80">{vendorTitle}</p>
        )}
        <h1 className="text-5xl font-extrabold leading-tight tracking-tight" style={{ textShadow: '2px 2px 8px rgba(0,0,0,0.7)' }}>
          {title}
        </h1>
      </div>
       <div className="absolute top-4 right-4 bg-white/90 text-primary font-bold text-xs px-2 py-1 rounded-sm">
            NEW COLLECTION
       </div>
    </div>
  );
}
