import React from 'react';
import Link from 'next/link';
import { IconBrandGithub, IconBrandTwitter, IconBrandInstagram, IconBrandLinkedin, IconBrandFacebook, IconAt } from '@tabler/icons-react';

const tags = [
  'Design', 'Development', 'Inspiration', 'Tools', 'Resources',
  'UI/UX', 'Web Design', 'Templates', 'Productivity'
];

const Footer = () => {
  return (
    <footer className="border-t border-slate-200 mt-12 py-8 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div className="flex flex-col gap-2">
            <h3 className="font-semibold text-lg mb-2">Direbase</h3>
            <p className="text-sm text-slate-500">
              A curated collection of inspirational websites and tools for designers and developers.
            </p>
            <div className="flex gap-4 mt-4">
              <Link href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-slate-900 transition-colors">
                <IconBrandGithub size={20} />
              </Link>
              <Link href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-slate-900 transition-colors">
                <IconBrandTwitter size={20} />
              </Link>
              <Link href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-slate-900 transition-colors">
                <IconBrandInstagram size={20} />
              </Link>
              <Link href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-slate-900 transition-colors">
                <IconBrandLinkedin size={20} />
              </Link>
              <Link href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-slate-900 transition-colors">
                <IconBrandFacebook size={20} />
              </Link>
              <Link href="mailto:contact@direbase.com" className="text-slate-500 hover:text-slate-900 transition-colors">
                <IconAt size={20} />
              </Link>
            </div>
          </div>
          
          <div className="flex flex-col gap-2">
            <h3 className="font-semibold text-lg mb-2">Explore</h3>
            <Link href="/tools" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">
              Tools
            </Link>
            <Link href="/designs" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">
              Designs
            </Link>
            <Link href="/about" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">
              About
            </Link>
            <Link href="/submit" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">
              Submit
            </Link>
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="font-semibold text-lg mb-2">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Link 
                  key={tag}
                  href={`/tag/${tag.toLowerCase().replace(/\//g, '-').replace(/\s+/g, '-')}`}
                  className="text-xs bg-slate-100 hover:bg-slate-200 transition-colors px-2 py-1 rounded-md"
                >
                  {tag}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-6 flex flex-col md:flex-row justify-between items-center text-sm text-slate-500">
          <p>© {new Date().getFullYear()} Direbase. All rights reserved.</p>
          <div className="flex gap-4 mt-4 md:mt-0">
            <Link href="/terms" className="hover:text-slate-900 transition-colors">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-slate-900 transition-colors">
              Privacy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 