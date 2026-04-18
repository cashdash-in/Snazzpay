'use client';

import Image from 'next/image';

interface MagazineCoverProps {
  imageUrl: string;
  title: string;
  vendorTitle?: string;
  width?: number;
  height?: number;
}

export function MagazineCover({ imageUrl, title, vendorTitle, width = 400, height = 500 }: MagazineCoverProps) {
    // Basic text wrapping logic
    const wrapText = (text: string, maxWidth: number, fontSize: number): string[] => {
        const words = text.split(' ');
        if (!words) return [text];
        const lines: string[] = [];
        let currentLine = '';
        // This is a rough approximation for average character width.
        const avgCharWidth = fontSize * 0.6;

        for (const word of words) {
            const testLine = currentLine + (currentLine ? ' ' : '') + word;
            if (testLine.length * avgCharWidth > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }
        lines.push(currentLine);
        return lines;
    };

    const titleLines = wrapText(title, width - 64, 48); // Approx 32px padding

    return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink">
            <defs>
                <linearGradient id="magazineGradient" x1="0%" y1="100%" x2="0%" y2="0%">
                    <stop offset="0%" style={{ stopColor: 'black', stopOpacity: 0.8 }} />
                    <stop offset="50%" style={{ stopColor: 'black', stopOpacity: 0.2 }} />
                    <stop offset="100%" style={{ stopColor: 'black', stopOpacity: 0 }} />
                </linearGradient>
                <filter id="textShadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
                    <feOffset dx="2" dy="2" result="offsetblur"/>
                    <feComponentTransfer>
                        <feFuncA type="linear" slope="0.7"/>
                    </feComponentTransfer>
                    <feMerge> 
                        <feMergeNode/>
                        <feMergeNode in="SourceGraphic"/> 
                    </feMerge>
                </filter>
            </defs>

            <image href={imageUrl} x="0" y="0" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" />
            <rect x="0" y="0" width="100%" height="100%" fill="url(#magazineGradient)" />

            <g style={{ filter: 'url(#textShadow)' }}>
                 {vendorTitle && (
                    <text x="32" y={height - 32 - (titleLines.length * 52) - 10} fontFamily="sans-serif" fontSize="14" fill="white" style={{textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.8}}>
                        {vendorTitle}
                    </text>
                )}
                {titleLines.map((line, index) => (
                    <text key={index} x="32" y={height - 32 - ((titleLines.length - 1 - index) * 52)} fontFamily="sans-serif" fontSize="48" fontWeight="800" fill="white">
                        {line}
                    </text>
                ))}
            </g>
            
            <rect x={width - 120} y="16" width="104" height="24" rx="4" fill="rgba(255,255,255,0.9)" />
            <text x={width - 68} y="33" textAnchor="middle" fontFamily="sans-serif" fontSize="12" fontWeight="bold" fill="hsl(var(--primary))">
                NEW COLLECTION
            </text>
        </svg>
    );
}
