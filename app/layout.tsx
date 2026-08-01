import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Songbird AI - Suno Music Generation API & App",
  description: "Generate stunning original music and lyrics using Songbird AI & Suno API.",
  icons: {
    icon: "https://i.imgur.com/9QX8Z5H.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="font-sans antialiased min-h-screen bg-[#0A0420] text-[#f5e6d3]">
        {children}
      </body>
    </html>
  );
}
