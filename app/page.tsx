import { Button } from "@/elements/button";
import Sidebar from "@/modules/sidebar";
import Footer from "@/modules/footer";
import { IconExternalLink, IconPlus, IconLaurelWreath, IconTools, IconArrowRight, IconPointFilled } from "@tabler/icons-react";
import Image from "next/image";
import Link from "next/link";
import { Product } from "@/lib/types";
import db from "@/lib/db";
import { products } from "@/drizzle/schema/products";
import { desc, eq, and } from "drizzle-orm";

async function getFeaturedProducts(): Promise<Product[]> {
  try {
    const dbClient = await db();
    const featuredProducts = await dbClient
      .select()
      .from(products)
      .where(eq(products.isFeatured, true))
      .orderBy(desc(products.id))
      .limit(6);
    
    return featuredProducts;
  } catch (error) {
    console.error('Error fetching featured products:', error);
    return [];
  }
}

async function getTemplates(): Promise<Product[]> {
  try {
    const dbClient = await db();
    const templates = await dbClient
      .select()
      .from(products)
      .where(eq(products.type, 'template'))
      .orderBy(desc(products.id))
      .limit(6);
    
    return templates;
  } catch (error) {
    console.error('Error fetching templates:', error);
    return [];
  }
}

async function getTools(): Promise<Product[]> {
  try {
    const dbClient = await db();
    const tools = await dbClient
      .select()
      .from(products)
      .where(eq(products.type, 'tool'))
      .orderBy(desc(products.id))
      .limit(10);
    
    return tools;
  } catch (error) {
    console.error('Error fetching tools:', error);
    return [];
  }
}

// Default placeholder image
const PLACEHOLDER_IMAGE = '/placeholder-image.jpg';

export default async function Page() {
  const [featuredProducts, featuredTemplates, featuredTools] = await Promise.all([
    getFeaturedProducts(),
    getTemplates(),
    getTools()
  ]);

  return (
    <div className="flex flex-col md:flex-row">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8">
        <header className="text-center mt-10 mb-16 flex flex-col gap-4 justify-center items-center">
          <div>
            <h1 className="h2">Best of inspirational websites and tools</h1>
            <p className="text-lg">Build your own tools and website resources with this template</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline">
              <IconPlus size={16} />
              Submit
            </Button>
            <Button as="a" href="https://hreflabs.com/templates/direbase">
              Buy template <IconExternalLink size={16} />
            </Button>
          </div>
        </header>

        <section className="border-3 border-slate-50 shadow-xs p-4 rounded-lg mb-6">
          <h2 className="h4 flex items-center gap-2 font-semibold mb-6">
            <IconLaurelWreath size={20} /> Featured Designs
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {featuredProducts.map((product) => (
              <Link
                href={product.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col gap-2 p-2 max-h-[240px] hover:bg-slate-50 hover:cursor-pointer transition-all rounded-md group"
                key={product.id}>
                {product.thumbnail && (
                  <Image
                    src={product.thumbnail}
                    width={380}
                    height={220}
                    alt="featured-sample"
                    className="rounded-md max-w-full object-cover"
                  />
                )}
                <div className="flex justify-between items-center">
                  <p className="text-sm font-medium truncate">{product.name}</p>
                  <IconExternalLink size={16} className="hidden group-hover:block" />
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="border-3 border-slate-50 shadow-xs p-4 rounded-lg mb-6">
          <h2 className="h4 flex items-center gap-2 font-semibold mb-6">Templates</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {featuredTemplates.map((template) => (
              <Link
                href={template.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col gap-2 p-2 max-h-[240px] hover:bg-slate-50 hover:cursor-pointer transition-all rounded-md group"
                key={template.id}>
                {template.thumbnail && (
                  <Image
                    src={template.thumbnail}
                    width={400}
                    height={220}
                    alt={template.name}
                    className="rounded-md max-w-full object-cover object-top"
                  />
                )}
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
              </Link>
            ))}
          </div>
        </section>

        <section className="border-3 border-slate-50 shadow-xs p-4 rounded-lg">
          <div className="flex justify-between items-center mb-6">
            <h2 className="h4 flex items-center gap-2 font-semibold">
              <IconTools size={20} />
              Tools
            </h2>
            <Button as="a" size="sm" variant="link" href="/tools" className="!font-semibold">
              View all
              <IconArrowRight size={16} />
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
            {featuredTools.map((tool) => (
              <Link
                href={tool.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 p-2 relative hover:bg-slate-50 hover:cursor-pointer transition-all rounded-md group"
                key={tool.id}>
                <div className="size-12 relative mb-1">
                  {tool.icon ? (
                    <Image src={tool.icon} fill alt={tool.name} className="object-contain" />
                  ) : null}
                </div>
                <p className="text-sm font-medium">{tool.name}</p>
              </Link>
            ))}
          </div>
        </section>
        <Footer />
      </main>
    </div>
  );
}