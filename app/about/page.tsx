import { Button } from "@/elements/button";
import Sidebar from '@/modules/sidebar';
import Footer from "@/modules/footer";
import { IconExternalLink, IconPlus, IconDatabase, IconDeviceDesktop, IconPalette, IconUsers, IconBallBowling } from "@tabler/icons-react";

export default function Page() {
  return (
    <div className="flex flex-col md:flex-row">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8">
        <header className="flex justify-between items-center mb-20">
          <h1 className="text-2xl font-semibold mb-0">About</h1>
          <div className="flex gap-3">
            <Button variant="outline" size="sm">
              <IconPlus size={16} />
              Submit
            </Button>
            <Button as="a" size="sm" href="https://hreflabs.com/templates/direbase">
              Buy template <IconExternalLink size={16} />
            </Button>
          </div>
        </header>

        <section className="max-w-3xl mx-auto">
          <div className="mb-12 flex justify-center">
            <div className="p-8 flex items-center justify-center">
              <IconBallBowling size={180} stroke={1.5} className="text-blue-500" />
            </div>
          </div>

          <div className="bg-gray-50 p-6 rounded-lg mb-8">
            <h2 className="text-2xl font-semibold mb-6">Why Buy This Template?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-6">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <IconDatabase size={20} className="text-blue-500" />
                  <h3 className="text-lg font-medium mb-0">Complete Solution</h3>
                </div>
                <p className="text-gray-600">
                  A fully-featured directory website template with authentication, product
                  management, and a beautiful UI ready to customize.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <IconDeviceDesktop size={20} className="text-green-500" />
                  <h3 className="text-lg font-medium mb-0">Modern Tech Stack</h3>
                </div>
                <p className="text-gray-600">
                  Built with Next.js, Tailwind CSS, Cloudflare Stack and Drizzle ORM for a fast, responsive, and
                  maintainable codebase.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <IconPalette size={20} className="text-purple-500" />
                  <h3 className="text-lg font-medium mb-0">Customizable Design</h3>
                </div>
                <p className="text-gray-600">
                  Easily adapt the clean, professional design to match your brand with the power of
                  Tailwind CSS.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <IconUsers size={20} className="text-amber-500" />
                  <h3 className="text-lg font-medium mb-0">Admin Dashboard</h3>
                </div>
                <p className="text-gray-600">
                  Manage your directory with an intuitive admin interface for adding, editing, and
                  organizing content.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-6 rounded-lg mb-8">
            <h2 className="text-2xl font-semibold mb-4">Key Features</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-600 mb-6">
              <li>Responsive design that works on all devices</li>
              <li>Admin dashboard for content management</li>
              <li>Category and tag organization</li>
              <li>Clean, well-structured code</li>
              <li>Support multiple content types</li>
              <li>Hosted on cloudflare with near zero cost for hosting.</li>
            </ul>
          </div>

          <div className="text-center my-8">
            <Button  as="a" href="https://hreflabs.com/templates/direbase">
              Get Started Today <IconExternalLink size={16} />
            </Button>
          </div>
        </section>
        <Footer />
      </main>
    </div>
  );
}
