'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Product } from '@/lib/types';
import { IconExternalLink, IconLoader2, IconPointFilled } from '@tabler/icons-react';
import Image from 'next/image';
interface TagProductsProps {
  initialProducts: Product[];
  initialHasMore: boolean;
  initialNextCursor?: string;
  tag: string;
}

export default function TagProducts({ 
  initialProducts, 
  initialHasMore, 
  initialNextCursor,
  tag
}: TagProductsProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [isLoading, setIsLoading] = useState(false);
  
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const observerTarget = useRef<HTMLDivElement>(null);
  
  // Function to load more products
  const loadMoreProducts = useCallback(async () => {
    if (!hasMore || isLoading || !nextCursor) return;
    
    setIsLoading(true);
    
    try {
      // Update URL with cursor
      const params = new URLSearchParams(searchParams);
      params.set('cursor', nextCursor);
      
      // Replace state so it doesn't add to history
      window.history.replaceState(null, '', `${pathname}?${params.toString()}`);
      
      // Fetch data from server
      const response = await fetch(`${pathname}?cursor=${nextCursor}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch more products');
      }
      
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // Extract JSON data from a script tag
      const dataScript = doc.querySelector('#__NEXT_DATA__');
      if (!dataScript) throw new Error('No data found');
      
      const jsonData = JSON.parse(dataScript.textContent || '{}');
      const pageProps = jsonData.props?.pageProps;
      
      if (!pageProps) throw new Error('No page props found');
      
      // Get products from the parsed HTML
      const newProducts = pageProps.products || [];
      const newHasMore = pageProps.hasMore || false;
      const newNextCursor = pageProps.nextCursor;
      
      // Append new products
      setProducts(prev => [...prev, ...newProducts]);
      setHasMore(newHasMore);
      setNextCursor(newNextCursor);
    } catch (error) {
      console.error('Error loading more products:', error);
    } finally {
      setIsLoading(false);
    }
  }, [hasMore, isLoading, nextCursor, pathname, searchParams]);
  
  // Setup IntersectionObserver for infinite scrolling
  useEffect(() => {
    if (!observerTarget.current) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          loadMoreProducts();
        }
      },
      { threshold: 0.1 }
    );
    
    observer.observe(observerTarget.current);
    
    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [hasMore, isLoading, loadMoreProducts]);
  
  if (products.length === 0) {
    return (
      <div className="text-center py-12 bg-white/50 rounded-lg border border-gray-200">
        <p className="text-gray-600 font-medium">No products found with tag "{tag}".</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
      
      {/* Loading indicator and observer target */}
      <div ref={observerTarget} className="py-4 text-center">
        {isLoading && (
          <div className="flex items-center justify-center gap-2">
            <IconLoader2 size={20} className="animate-spin text-blue-600" />
            <span className="text-sm text-gray-600">Loading more products...</span>
          </div>
        )}
      </div>
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  return (
    <a
      href={product.link}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col gap-2 p-2 hover:bg-slate-50 hover:cursor-pointer transition-all rounded-md group">
      <div className="w-full max-h-[240px] rounded-md overflow-hidden bg-gray-100">
        {product.thumbnail ? (
          <Image
            src={product.thumbnail}
            alt={product.name}
            width={385}
            height={280}
            className="w-full h-full object-cover object-top rounded-md"
          />
        ) : product.icon ? (
          <div className="w-full h-full flex items-center justify-center">
            <Image
              src={product.icon}
              alt={product.name}
              width={385}
              height={280}
              className="max-w-16 max-h-16 object-cover object-top"
            />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
              <span className="text-gray-500 font-medium">
                {product.type === 'website' ? 'Website' : 'Template'}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-1">
            <p className="text-sm font-medium truncate">{product.name}</p>
            <IconPointFilled size={8}/>
            <p className="text-xs text-slate-500">{product.tags.join(', ') || ''}</p>
          </div>
          <div className="flex items-center gap-1 mt-1">
            {product.isNew && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[9px] font-medium rounded-full uppercase">
                New
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {product.isPaid ? (
            <span className="text-sm font-semibold">${product.price || 0}</span>
          ) : (
            <span className="text-xs text-gray-500">Free</span>
          )}
          <IconExternalLink size={12} />
        </div>
      </div>
    </a>
  );
} 