// A template remounts on every route change, so this replays the entrance animation on each page.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-in">{children}</div>;
}
