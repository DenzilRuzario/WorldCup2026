import "./globals.css";
import NavLinks from "@/components/NavLinks";

export const metadata = {
  title: "World Cup 2026 Companion",
  description: "Live matches, team guides and fan predictions for the FIFA World Cup 2026.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <header className="nav">
          <a href="/" className="logo">
            <span style={{ fontSize: 20 }}>🏆</span>
            <span>
              <span className="t1">World Cup 2026</span>
              <span className="t2">COMPANION</span>
            </span>
          </a>
          <NavLinks />
        </header>
        {children}
        <footer className="site">
          🏆 48 Teams. <span className="g">104 Matches.</span> One Dream.
          <div className="src">Live data via football-data.org · Predictions stored with Supabase · Submissions are visible to everyone</div>
        </footer>
      </body>
    </html>
  );
}
