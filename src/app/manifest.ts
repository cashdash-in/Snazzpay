import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Ziptally AI - Smart Inventory',
    short_name: 'Ziptally',
    description: 'AI-Powered Inventory Intelligence for Modern Retail',
    start_url: '/',
    display: 'standalone',
    background_color: '#5a31f4',
    theme_color: '#5a31f4',
    icons: [
      {
        src: 'https://picsum.photos/seed/ziptally/192/192',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: 'https://picsum.photos/seed/ziptally/512/512',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
