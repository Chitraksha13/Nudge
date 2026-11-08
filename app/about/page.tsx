import { Header } from "@/components/ui";

const sections = [
  {
    label: "Why I made Nudge",
    title: "Splitting is easy. Getting paid back isn’t.",
    body: [
      "In college, I’ve covered countless bills and waited weeks to get paid back, or forgotten I was owed at all. When I talked to 30+ students, almost everyone had the same story. Nobody minded paying their share; they just hated being the one who had to ask. I built Nudge so getting paid back happens on its own, without the awkward follow-up texts.",
    ],
  },
  {
    label: "The problem",
    title: "Asking for money is awkward.",
    body: [
      "Payment apps make sending money easy, and group chats make splitting the math easy. But the hardest part of shared living is the follow-up: texting a roommate for the third time.",
    ],
  },
  {
    label: "What I built",
    title: "Shared bills that ask for you.",
    body: [
      "Nudge is a mobile-first app where roommates log shared bills, split them however they want (equally, by amount, or by percentage), and pay each other back in one tap through their preferred payment app. If someone forgets, Nudge sends the reminder automatically, so you never have to.",
    ],
  },
  {
    label: "Who it’s for",
    title: "Anyone who shares bills with roommates.",
    body: [
      "Nudge started with college students, but it works anywhere people share bills: your first apartment, a sublet, or a trip with friends.",
    ],
  },
];

export default function About() {
  return (
    <main>
      <Header title="About" />
      <div className="space-y-4 px-4 pb-8">
        {sections.map((s) => (
          <section key={s.label} className="rounded-2xl border border-line p-4">
            <div className="text-xs text-muted">{s.label}</div>
            <h2 className="mb-2 mt-1 text-lg font-medium">{s.title}</h2>
            <div className="space-y-3 text-ink2">
              {s.body.map((p) => (
                <p key={p.slice(0, 20)}>{p}</p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
