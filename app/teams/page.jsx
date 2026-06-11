"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { GROUPS, T, GROUP_OVERVIEWS } from "@/lib/teams";
import Flag from "@/components/Flag";

function OverviewModal({ g, onClose }) {
  useEffect(() => {
    const onKey = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const text = GROUP_OVERVIEWS[g];
  return (
    <div className="qp-back" onClick={onClose}>
      <div className="qp" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div className="hd" style={{ marginBottom: 10 }}>
          <div>
            <div style={{ fontFamily: "var(--disp)", fontWeight: 900, fontSize: 21, textTransform: "uppercase" }}>
              Group {g} <span style={{ color: "var(--green)" }}>Overview</span>
            </div>
            <div className="mono-dim" style={{ letterSpacing: ".1em", marginTop: 3 }}>
              {GROUPS.find(x => x.g === g).teams.map(t => t.name).join(" · ").toUpperCase()}
            </div>
          </div>
          <button onClick={onClose} aria-label="Close"
            style={{ marginLeft: "auto", background: "var(--navy1)", border: "1px solid var(--line)", borderRadius: "50%", width: 32, height: 32, color: "var(--txt2)", fontSize: 14, cursor: "pointer", flexShrink: 0 }}>✕</button>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {GROUPS.find(x => x.g === g).teams.map(t => <Flag key={t.id} id={t.id} size={36} radius={4} />)}
        </div>
        {text
          ? <p className="body2" style={{ fontSize: 14, lineHeight: 1.65 }}>{text}</p>
          : <p className="mono-dim">Overview for Group {g} is on its way.</p>}
      </div>
    </div>
  );
}

export default function Teams() {
  const [filter, setFilter] = useState("ALL");
  const [q, setQ] = useState("");
  const [ov, setOv] = useState(null);
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
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 13 }}>
                  <div className="gh" style={{ marginBottom: 0 }}>Group {g}</div>
                  <button className="ov-btn" onClick={() => setOv(g)}>Overview</button>
                </div>
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
      {ov && <OverviewModal g={ov} onClose={() => setOv(null)} />}
    </main>
  );
}
