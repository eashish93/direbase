import type { NextConfig } from 'next';
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
initOpenNextCloudflareForDev();

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    // custom image loader via cloudflare images.
    loader: 'custom',
    loaderFile: './image-loader.ts',
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.webaggr.com',
      },
    ],
  },
};

export default nextConfig;


