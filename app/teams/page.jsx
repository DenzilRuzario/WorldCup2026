"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { GROUPS, T, GROUP_OVERVIEWS } from "@/lib/teams";
import Flag from "@/components/Flag";

export default function Teams() {
  const [filter, setFilter] = useState("ALL");
  const [q, setQ] = useState("");
  const router = useRouter();

  const query = q.trim().toLowerCase();
  const searching = query.length > 0;
  const found = searching ? T.filter(t => t.name.toLowerCase().includes(query)) : [];
  const shown = filter === "ALL" ? GROUPS : GROUPS.filter(x => x.g === filter);

  return (
    <main className="realm">
      <div className="wrap" style={{ padding: "34px 20px 40px" }}>
        <h1 className="h1">All Teams</h1>
        <p className="body2" style={{ margin: "6px 0 18px", fontSize: 14 }}>48 nations. One groundbreaking tournament.</p>

        <div className="search-box">
          <span style={{ color: "var(--txt3)" }}>🔍</span>
          <input placeholder="Search for a team…" value={q} onChange={e => setQ(e.target.value)} />
          {q && <button onClick={() => setQ("")} style={{ background: "none", border: "none", color: "var(--txt3)", cursor: "pointer", fontSize: 14 }}>✕</button>}
        </div>

        {searching ? (
          found.length ? (
            <div className="grid auto-240" style={{ marginTop: 6 }}>
              {found.map(t => (
                <button key={t.id} className="tchip lift" style={{ marginBottom: 0 }} onClick={() => router.push(`/teams/${t.id}`)}>
                  <Flag id={t.id} size={34} radius={4} />
                  <span style={{ textAlign: "left" }}>
                    <b>{t.name}</b>
                    <span className="mono-dim" style={{ display: "block", fontSize: 9.5 }}>GROUP {t.group} · RANK #{t.rank}</span>
                  </span>
                </button>
              ))}
            </div>
          ) : <p className="mono-dim">No team matches “{q}”.</p>
        ) : <>
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
                {GROUP_OVERVIEWS[g] && (
                  <p className="body2" style={{ fontSize: 12.5, margin: "0 0 13px", lineHeight: 1.55 }}>{GROUP_OVERVIEWS[g]}</p>
                )}
                {teams.map(t => (
                  <button key={t.id} className="tchip lift" onClick={() => router.push(`/teams/${t.id}`)}>
                    <Flag id={t.id} size={30} radius={4} />
                    <b>{t.name}</b>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </>}
      </div>
    </main>
  );
}
