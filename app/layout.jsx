import "./globals.css";
import NavLinks from "@/components/NavLinks";
import Trophy from "@/components/Trophy";

export const metadata = {
  title: "World Cup 2026 Companion",
  description: "Live scores, team guides and fan predictions for the FIFA World Cup 2026.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <header className="nav">
          <a href="/" className="logo">
            <Trophy size={30} />
            <span>
              <span className="t1">World Cup 2026</span>
              <span className="t2">COMPANION</span>
            </span>
          </a>
          <NavLinks />
          <span className="nav-date">JUN 11 — JUL 19</span>
        </header>
        {children}
        <footer className="site">
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, verticalAlign: "middle" }}>
            <Trophy size={16} /> 48 Teams. <span className="g">104 Matches.</span> One Dream.
          </span>
          <div className="src">Live data via football-data.org · Predictions stored with Supabase · Submissions are visible to everyone</div>
        </footer>
      </body>
    </html>
  );
}
