'use client';

import { useState } from 'react';

const SEGMENTS = [
  'Fractional CMO',
  'Consultor de Growth',
  'Agência de Performance',
  'Consultor de Brand',
  'Consultor de SEO',
  'Especialista em Mídia Paga',
  'Outro',
] as const;

type Status = 'idle' | 'loading' | 'success' | 'error';

export function ProspectForm() {
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('loading');
    setErrorMsg('');

    const formData = new FormData(event.currentTarget);
    const payload = {
      full_name: formData.get('full_name'),
      email: formData.get('email'),
      linkedin_url: formData.get('linkedin_url'),
      segment: formData.get('segment'),
      consent: formData.get('consent') === 'on',
    };

    try {
      const res = await fetch('/prospects/api', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  }

  if (status === 'success') {
    return (
      <div className="rounded-xl bg-[var(--color-bob-gold-light)] p-6">
        <p className="font-[family-name:var(--font-display)] text-2xl">
          Recebido. Você está na lista.
        </p>
        <p className="mt-2 text-sm text-[var(--color-graphite)]">
          Em alguns minutos, vai chegar um email de confirmação. Quando a edição
          da sua especialidade abrir, você é a primeira pessoa que avisamos.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Nome completo" name="full_name" required />
        <Field label="Email profissional" name="email" type="email" required />
      </div>
      <Field
        label="URL do seu LinkedIn"
        name="linkedin_url"
        placeholder="https://linkedin.com/in/seu-perfil"
        required
      />
      <div>
        <label className="block text-sm font-medium text-[var(--color-onix)]">
          Especialidade
        </label>
        <select
          name="segment"
          required
          defaultValue=""
          className="mt-1 w-full rounded-lg border border-[var(--color-line)] bg-white px-4 py-3 text-sm focus:border-[var(--color-bob-gold)] focus:outline-none"
        >
          <option value="" disabled>
            Selecione
          </option>
          {SEGMENTS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-start gap-3 text-xs text-[var(--color-graphite)]">
        <input
          type="checkbox"
          name="consent"
          required
          className="mt-1 h-4 w-4 rounded border-[var(--color-line)] accent-[var(--color-bob-gold)]"
        />
        <span>
          Concordo em ser contatado pela equipe TheBob sobre a abertura da edição
          e em ter meu perfil público analisado pela metodologia. Posso pedir
          opt-out a qualquer momento.
        </span>
      </label>

      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full rounded-lg bg-[var(--color-onix)] px-6 py-3 text-sm font-medium uppercase tracking-wider text-[var(--color-bob-gold-light)] transition hover:bg-[var(--color-bob-gold)] hover:text-[var(--color-onix)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === 'loading' ? 'Enviando…' : 'Quero ser avisado'}
      </button>

      {status === 'error' && (
        <p className="text-sm text-red-700">Algo deu errado: {errorMsg}</p>
      )}
    </form>
  );
}

function Field({
  label,
  name,
  type = 'text',
  required,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[var(--color-onix)]" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-[var(--color-line)] bg-white px-4 py-3 text-sm focus:border-[var(--color-bob-gold)] focus:outline-none"
      />
    </div>
  );
}
