
import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SnapStock AI - Secure COD',
    short_name: 'SnapStock',
    description: 'AI-Powered Inventory & Secure COD for Modern Sellers',
    start_url: '/',
    display: 'standalone',
    background_color: '#5a31f4',
    theme_color: '#5a31f4',
    icons: [
      {
        src: 'https://picsum.photos/seed/snapstock/192/192',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: 'https://picsum.photos/seed/snapstock/512/512',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
