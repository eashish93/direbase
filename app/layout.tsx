import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { GoogleAnalytics } from '@next/third-parties/google';
import "./globals.css";
import { cx } from 'cva';

const primaryFont = Geist({ subsets: ["latin"] });
const IS_DEV = process.env.NODE_ENV === "development";

export const metadata: Metadata = {
  title: 'Direbase - Directory Template',
  description:
    'Build your directory faster with Direbase',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" >
      {IS_DEV ? null : <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA || ''} />}
      <body className={primaryFont.className}>{children}</body>
    </html>
  );
}
