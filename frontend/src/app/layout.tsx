import type { Metadata } from "next";
import { Raleway } from "next/font/google";
import "./globals.css";
import ContextProvider from "./contextProvider";

const raleway = Raleway({
  subsets: ["latin"],
  variable: "--font-raleway",
});

export const metadata: Metadata = {
  title: "Competitor Reasearch",
  description: "A website that helps you research on your competitor and save it to notion",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${raleway.variable}`}>
        <ContextProvider>
          {children}
        </ContextProvider>
      </body>
    </html>
  );
}
