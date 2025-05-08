'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Product } from '@/lib/types';
import { IconExternalLink, IconLoader2 } from '@tabler/icons-react';
import Image from 'next/image';

interface TemplatesListProps {
  initialTemplates: Product[];
  initialHasMore: boolean;
  initialNextCursor?: string;
}

export default function TemplatesList({ 
  initialTemplates, 
  initialHasMore, 
  initialNextCursor 
}: TemplatesListProps) {
  const [templates, setTemplates] = useState<Product[]>(initialTemplates);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [isLoading, setIsLoading] = useState(false);
  
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const observerTarget = useRef<HTMLDivElement>(null);
  
  // Function to load more templates
  const loadMoreTemplates = useCallback(async () => {
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
        throw new Error('Failed to fetch more templates');
      }
      
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // Extract JSON data from a script tag (this assumes server component adds this data)
      const dataScript = doc.querySelector('#__NEXT_DATA__');
      if (!dataScript) throw new Error('No data found');
      
      const jsonData = JSON.parse(dataScript.textContent || '{}');
      const pageProps = jsonData.props?.pageProps;
      
      if (!pageProps) throw new Error('No page props found');
      
      // Get templates from the parsed HTML
      const newTemplates = pageProps.templates || [];
      const newHasMore = pageProps.hasMore || false;
      const newNextCursor = pageProps.nextCursor;
      
      // Append new templates
      setTemplates(prev => [...prev, ...newTemplates]);
      setHasMore(newHasMore);
      setNextCursor(newNextCursor);
    } catch (error) {
      console.error('Error loading more templates:', error);
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
          loadMoreTemplates();
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
  }, [hasMore, isLoading, loadMoreTemplates]);
  
  if (templates.length === 0) {
    return (
      <div className="text-center py-12 bg-white/50 rounded-lg border border-gray-200">
        <p className="text-gray-600 font-medium">No templates found.</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map(template => (
          <TemplateCard key={template.id} template={template} />
        ))}
      </div>
      
      {/* Loading indicator and observer target */}
      <div ref={observerTarget} className="py-4 text-center">
        {isLoading && (
          <div className="flex items-center justify-center gap-2">
            <IconLoader2 size={20} className="animate-spin text-blue-600" />
            <span className="text-sm text-gray-600">Loading more templates...</span>
          </div>
        )}
      </div>
    </div>
  );
}

function TemplateCard({ template }: { template: Product }) {
  return (
    <a
      href={template.link}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col gap-2 p-2 hover:bg-slate-50 hover:cursor-pointer transition-all rounded-md group">
      <div className="w-full max-h-[240px] rounded-md overflow-hidden bg-gray-100">
        {template.thumbnail ? (
          <Image
            src={template.thumbnail}
            alt={template.name}
            width={385}
            height={220}
            className="w-full h-full object-cover rounded-md"
          />
        ) : template.icon ? (
          <div className="w-full h-full max-h-[240px] flex items-center justify-center">
            <Image
              src={template.icon}
              alt={template.name}
              width={385}
              height={220}
              className="max-w-16 max-h-16 object-cover object-top"
            />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
              <span className="text-gray-500 font-medium">Template</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm font-medium truncate">{template.name}</p>
          {template.isNew && (
            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-medium rounded-full uppercase">
              New
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {template.isPaid ? (
            <span className="text-sm font-medium">${template.price || 0}</span>
          ) : (
            <span className="text-xs text-gray-500">Free</span>
          )}
          <IconExternalLink size={12} />
        </div>
      </div>
    </a>
  );
} 