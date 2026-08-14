import PixChoroplethMap from '@/components/PixChoroplethMap';

export default function Home() {
  return (
    <main className="min-h-screen relative pb-20">
      <div className="bg-gradient-orbs" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 lg:pt-20">
        <header className="mb-12 text-center animate-fade-in-up">
          <div className="inline-flex items-center justify-center p-2 mb-4 rounded-2xl bg-surface border border-surface-border shadow-[0_0_20px_rgba(0,212,170,0.1)]">
            <span className="text-3xl">🇧🇷</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary-light to-accent mb-4 tracking-tight">
            Mapa de Transações Pix
          </h1>
          <p className="text-text-secondary text-lg max-w-2xl mx-auto leading-relaxed">
            Explore o volume e valor das transações Pix por estado brasileiro. 
            Uma visualização interativa do principal meio de pagamento instantâneo do Brasil.
          </p>
        </header>

        <section className="mb-8">
          <PixChoroplethMap />
        </section>

        <section className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <div className="glass-card p-6">
            <h3 className="text-xl font-bold text-foreground mb-3 flex items-center gap-2">
              <span>⚡</span> O que é o Pix?
            </h3>
            <p className="text-text-secondary leading-relaxed text-sm">
              O Pix é o sistema de pagamento instantâneo brasileiro criado pelo Banco Central do Brasil. 
              Lançado em novembro de 2020, ele permite transferências e pagamentos em poucos segundos, 
              24 horas por dia, 7 dias por semana, de forma segura e prática.
            </p>
          </div>

          <div className="glass-card p-6">
            <h3 className="text-xl font-bold text-foreground mb-3 flex items-center gap-2">
              <span>📊</span> Fonte dos Dados
            </h3>
            <p className="text-text-secondary leading-relaxed text-sm mb-4">
              Os dados apresentados neste painel são consumidos diretamente da API de Dados Abertos do Banco Central do Brasil, atualizados mensalmente.
            </p>
            <a 
              href="https://dadosabertos.bcb.gov.br/dataset/pix" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary-light transition-colors"
            >
              Acessar Dados Abertos BCB 
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
