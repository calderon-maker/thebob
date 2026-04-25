import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'TheBob, ranking mensal do Abramark',
    template: '%s, TheBob',
  },
  description:
    'O selo de prova social para quem vende serviço em marketing digital. Distribuído pelo Abramark e pelas principais entidades setoriais do Brasil.',
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? 'https://thebob.com.br'
  ),
  openGraph: {
    title: 'TheBob, ranking mensal do Abramark',
    description:
      'O Hall da Fama do marketing brasileiro encontra os nomes em alta no mercado, todo mês.',
    type: 'website',
    locale: 'pt_BR',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="min-h-screen bg-[var(--color-offwhite)] text-[var(--color-onix)]">
        {children}
      </body>
    </html>
  );
}
