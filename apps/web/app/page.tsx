import { ProspectForm } from '@/components/ProspectForm';

export default function HomePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 md:py-24">
      <header className="mb-12">
        <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-graphite)]">
          The BoB, ranking mensal do Abramark
        </p>
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-5xl leading-[1.05] md:text-7xl">
          Where the best of the best
          <span className="block italic text-[var(--color-bob-gold)]">becomes The BoB.</span>
        </h1>
      </header>

      <section className="space-y-6 text-lg leading-relaxed text-[var(--color-graphite)]">
        <p>
          Todo mês, identificamos os profissionais e empresas que mais cresceram
          em autoridade, mídia, reconhecimento setorial e buzz no mercado de
          marketing digital brasileiro.
        </p>
        <p>
          Distribuição via Abramark e mais 19 entidades setoriais. Metodologia
          pública, paritária, auditável.
        </p>
        <p className="border-l-4 border-[var(--color-bob-gold)] pl-6 text-xl italic text-[var(--color-onix)]">
          Você não paga para estar na lista.
          <br />
          Você paga para entender e evoluir nela.
        </p>
      </section>

      <section className="mt-16 rounded-2xl border border-[var(--color-line)] bg-white p-8 shadow-sm md:p-10">
        <h2 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl">
          Quero ser avisado quando o The BoB abrir
        </h2>
        <p className="mt-2 text-sm text-[var(--color-graphite)]">
          Pré-inscrição gratuita, sem compromisso. Você recebe quando publicarmos
          a primeira edição da sua especialidade.
        </p>
        <div className="mt-6">
          <ProspectForm />
        </div>
      </section>

      <footer className="mt-16 border-t border-[var(--color-line)] pt-8 text-xs text-[var(--color-graphite)]">
        <p>
          TheBob é uma operação editorial da{' '}
          <a
            href="https://abramarque.com.br"
            target="_blank"
            rel="noreferrer"
            className="underline decoration-[var(--color-bob-gold)] underline-offset-4"
          >
            Abramark
          </a>{' '}
          em parceria com a BCX Capital. Edição piloto: Fractional CMOs e
          Consultores de Performance, 2026.
        </p>
      </footer>
    </main>
  );
}
