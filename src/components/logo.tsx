import { brand } from "@/lib/brand";
import Link from "next/link";
export default function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="brand" aria-label={`${brand.name}, inicio`}>
      <span className="brand-mark"><span>{brand.initials[0]}</span><span>{brand.initials[1]}</span><i /></span>
      {!compact && <span className="brand-word">{brand.initials}<span>{brand.wordmark}</span></span>}
    </Link>
  );
}
