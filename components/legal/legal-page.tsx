import { Container } from "@/components/marketing/section";

export function LegalPage({ title, updated, intro, sections }: { title: string; updated: string; intro?: string; sections: { h: string; body: React.ReactNode }[] }) {
  return (
    <Container className="py-14">
      <div className="mx-auto grid max-w-[1100px] gap-12 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav className="hidden lg:sticky lg:top-24 lg:block lg:self-start" aria-label="On this page">
          <div className="eyebrow mb-3">On this page</div>
          <ol className="space-y-2 text-[12.5px]">
            {sections.map((s, i) => (
              <li key={s.h}>
                <a href={`#s${i + 1}`} className="text-steel-400 hover:text-chrome">
                  {s.h}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <article>
          <div className="eyebrow">Legal</div>
          <h1 className="mt-3 text-[34px] font-medium uppercase tracking-[-0.02em] text-chrome sm:text-[42px]">{title}</h1>
          <p className="mt-3 text-[12.5px] text-steel-500">Last updated {updated}</p>
          {intro ? <p className="mt-6 text-[15.5px] leading-relaxed text-steel-300">{intro}</p> : null}
          <div className="prose-nsalgo mt-4">
            {sections.map((s, i) => (
              <section key={s.h} id={`s${i + 1}`} className="scroll-mt-24">
                <h2>
                  {i + 1}. {s.h}
                </h2>
                {s.body}
              </section>
            ))}
          </div>
        </article>
      </div>
    </Container>
  );
}
