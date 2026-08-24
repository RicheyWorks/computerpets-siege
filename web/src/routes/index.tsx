import { createFileRoute } from "@tanstack/react-router";
import { SiegeApp } from "@/components/siege-app";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <SiegeApp />;
}
