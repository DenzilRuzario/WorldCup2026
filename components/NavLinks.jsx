"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavLinks() {
  const p = usePathname();
  const cls = h => (h === "/" ? p === "/" : p.startsWith(h)) ? "on" : "";
  return (
    <nav className="links">
      <Link href="/" className={cls("/")}>Home</Link>
      <Link href="/teams" className={cls("/teams")}>Teams</Link>
      <Link href="/predictions" className={cls("/predictions")}>Predictions</Link>
    </nav>
  );
}
