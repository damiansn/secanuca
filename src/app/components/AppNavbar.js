"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import CompetitionsMenu from "./CompetitionsMenu.js";
import TeamSearch from "./TeamSearch.js";

export default function AppNavbar({ activeCompetition = "" }) {
  const pathname = usePathname();
  const refereeIsActive = pathname === "/arbitros" || pathname.startsWith("/arbitros/");

  return (
    <header className="app-navbar">
      <div className="app-navbar-inner">
        <Link href="/" className="app-navbar-logo" aria-label="Secanuca, inicio">
          <Image src="/logo.png" alt="Secanuca" width={1640} height={686} />
        </Link>
        <div className="app-navbar-competitions">
          <CompetitionsMenu compact activeCompetition={activeCompetition} />
        </div>
        <div className="app-navbar-actions">
          <TeamSearch />
          <Link
            href="/arbitros"
            className={`app-navbar-referees${refereeIsActive ? " app-navbar-referees-active" : ""}`}
            aria-current={refereeIsActive ? "page" : undefined}
          >
            ÁRBITROS
          </Link>
        </div>
      </div>
    </header>
  );
}
