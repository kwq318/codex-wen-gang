"use client";

import dynamic from "next/dynamic";

const DiagramApp = dynamic(() => import("@/components/DiagramApp"), { ssr: false });

export default function HomePage() {
  return <DiagramApp />;
}
