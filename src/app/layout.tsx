import type { Metadata } from "next";
import "./styles.css";
export const metadata: Metadata = { title: "Threat Intel Platform", description: "Multi-modal threat intelligence and vulnerability correlation" };
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) { return <html lang="en"><body>{children}</body></html>; }
