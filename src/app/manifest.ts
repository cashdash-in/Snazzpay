import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ZipTally AI - Smart Stock',
    short_name: 'ZipTally',
    description: 'AI-Powered Inventory Intelligence - Stock Zip Karo, Aage Bado!',
    start_url: '/',
    display: 'standalone',
    background_color: '#064e3b',
    theme_color: '#064e3b',
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