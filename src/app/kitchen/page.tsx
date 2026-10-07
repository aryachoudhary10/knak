import type { Metadata } from "next";
import Kitchen from "@/components/kitchen/Kitchen";

export const metadata: Metadata = {
  title: "Kitchen · KNAK",
  robots: { index: false, follow: false },
};

export default function KitchenPage() {
  return <Kitchen />;
}
