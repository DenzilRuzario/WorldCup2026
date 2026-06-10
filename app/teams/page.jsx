"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { GROUPS } from "@/lib/teams";

export default function Teams() {
  const [filter, setFilter] = useState("ALL");
  const router = useRouter();
  const shown = filter === "ALL" ? GROUPS : GROUPS.filter(x => x.g === filter);
  return (
    <main className="realm">
      <div className="wrap" style={{ padding: "34px 20px 40px" }}>
        <h1 className="h1">All Teams</h1>
        <p className="body2" style={{ margin: "6px 0 20px", fontSize: 14 }}>48 nations. One groundbreaking tournament.</p>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 14 }}>
          {["ALL", ..."ABCDEFGHIJKL"].map(g => (
            <button key={g} className={`chip-btn${filter === g ? " on" : ""}`} onClick={() => setFilter(g)}>
              {g === "ALL" ? "All Groups" : `Group ${g}`}
            </button>
          ))}
        </div>
        <div className="grid auto-240" style={{ marginTop: 10 }}>
          {shown.map(({ g, teams }) => (
            <div key={g} className="gcard">
              <div className="gh">Group {g}</div>
              {teams.map(t => (
                <button key={t.id} className="tchip lift" onClick={() => router.push(`/teams/${t.id}`)}>
                  <span className="f">{t.flag}</span><b>{t.name}</b>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
