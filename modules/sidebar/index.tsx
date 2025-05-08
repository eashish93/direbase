'use client';

import { Button } from "@/elements/button";
import { SearchField } from "@/elements/searchfield";
import { IconBallBowling, IconCompass, IconSearch, IconFolder, IconSettings, IconInfoCircle, IconMenu2, IconRobot, IconShoppingCart, IconChartBar, IconAxe, IconTools, IconBriefcase, IconPalette, IconCoin, IconSchool, IconTemplate, IconBuildingStore, IconHome, IconBrandBlogger, IconBuildingBank, IconBuildingSkyscraper, IconUsers, IconDeviceMobile, IconVideo, IconBallFootball, IconBook, IconCurrencyBitcoin, IconMusic, IconClipboardCheck, IconBuilding, IconHeartHandshake, IconPlane, IconHeartbeat } from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { CATEGORIES } from "@/lib/constants";

// Navigation component that can be reused in mobile and desktop
function Navigation({ 
  primaryNavItems, 
  secondaryNavItems, 
  isActive,
  className = "" 
}: { 
  primaryNavItems: Array<{ href: string; label: string; icon: React.ReactNode }>;
  secondaryNavItems: Array<{ href: string; label: string; icon: React.ReactNode }>;
  isActive: (path: string) => boolean;
  className?: string;
}) {
  return (
    <nav className={className}>
      <ul className="list-unstyled px-2 *:rounded-md *:mb-0.5 *:px-4 text-sm">
        {primaryNavItems.map((item) => (
          <li
            key={item.href}
            className={`flex items-center gap-2 ${
              isActive(item.href) ? 'bg-black text-white font-medium' : 'hover:bg-gray-100'
            }`}>
            {item.icon}
            <Link href={item.href} className="inline-block py-3 size-full">
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
      <hr className="my-4 border-slate-200" />
      <h2 className="text-xs font-bold uppercase mb-2 px-4">Tags</h2>
      <ul className="list-unstyled px-2 *:rounded-md *:mb-0.5 *:px-4 text-sm overflow-y-auto h-[calc(100vh-340px)] scrollbar-hidden">
        {secondaryNavItems.map((item) => (
          <li
            key={item.href}
            className={`flex items-center gap-2 ${
              isActive(item.href) ? 'bg-black text-white font-medium' : 'hover:bg-gray-100'
            }`}>
            {item.icon}
            <Link href={item.href} className="inline-block py-3 size-full">
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  
  // Close sidebar when navigating on mobile
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Close sidebar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const dropdown = document.getElementById('mobile-dropdown');
      const toggleButton = document.getElementById('sidebar-toggle');
      
      if (dropdown && !dropdown.contains(event.target as Node) && 
          toggleButton && !toggleButton.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);
  
  const isActive = (path: string) => {
    return pathname === path;
  };

  const primaryNavItems = [
    { href: '/', label: 'Explore', icon: <IconCompass size={20} /> },
    { href: '/about', label: 'About', icon: <IconInfoCircle size={20} /> },
    // { href: '/tools', label: 'Tools', icon: <IconTools size={20} /> },
    { href: '/marketplace', label: 'Marketplace', icon: <IconBuildingStore size={20} /> },
  ];

  // Map of category to icon component
  const categoryIcons: Record<typeof CATEGORIES[number], React.ReactNode> = {
    'personal': <IconHome size={20} />,
    'design': <IconPalette size={20} />,
    'blog': <IconBrandBlogger size={20} />,
    'agency': <IconBuildingSkyscraper size={20} />,
    'e-commerce': <IconShoppingCart size={20} />,
    'saas': <IconBriefcase size={20} />,
    'business': <IconChartBar size={20} />,
    'design-tools': <IconPalette size={20} />,
    'ai': <IconRobot size={20} />,
    'media': <IconVideo size={20} />,
    'sports': <IconBallFootball size={20} />,
    'course': <IconSchool size={20} />,
    'education': <IconBook size={20} />,
    'web3': <IconCurrencyBitcoin size={20} />,
    'productivity': <IconClipboardCheck size={20} />,
  };

  // Create secondaryNavItems from categories
  const secondaryNavItems = CATEGORIES.map(category => ({
    href: `/tag/${category}`,
    label: category.charAt(0).toUpperCase() + category.slice(1).replace(/-/g, ' '),
    icon: categoryIcons[category] || <IconFolder size={20} />
  }));

  return (
    <>
      {/* Mobile Sidebar */}
      <header className="sticky top-0 left-0 w-full h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-50 md:hidden">
        <h1 className="text-lg flex items-center gap-2 mb-0 font-bold uppercase">
          <IconBallBowling size={24} />
          <span>Direbase</span>
        </h1>
        <Button 
          variant="text" 
          size="sm" 
          id="sidebar-toggle"
          onClick={() => setIsOpen(!isOpen)}
        >
          <IconMenu2 size={20} />
        </Button>
      </header>

      {/* Mobile dropdown menu */}
      {isOpen && (
        <div 
          id="mobile-dropdown"
          className="fixed top-16 left-0 w-full bg-white border-b border-gray-200 shadow-md z-40 md:hidden transition-all duration-300 h-dvh overflow-y-auto scrollbar-hidden"
        >
          <div className="p-4">
            <SearchField
              aria-label="Search"
              prefix={<IconSearch size={16} />}
              showClearButton={false}
            />
          </div>

          <Navigation 
            primaryNavItems={primaryNavItems}
            secondaryNavItems={secondaryNavItems}
            isActive={isActive}
            className="pb-4"
          />
        </div>
      )}

      {/* Overlay when menu is open on mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-30 md:hidden mt-16" 
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Desktop Sidebar */}
      <aside className="w-64 h-dvh border-r border-slate-200 hidden md:block sticky top-0 bottom-0">
        <header className="mb-4 p-4">
          <h1 className="text-base flex items-center gap-2 font-semibold uppercase mb-6">
            <IconBallBowling size={28} />
            Direbase
          </h1>
          <SearchField
            aria-label="Search"
            prefix={<IconSearch size={16} />}
            showClearButton={false}
          />
        </header>

        <Navigation 
          primaryNavItems={primaryNavItems}
          secondaryNavItems={secondaryNavItems}
          isActive={isActive}
        />
        
        
      </aside>
    </>
  );
}