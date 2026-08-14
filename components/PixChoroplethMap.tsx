'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { PixApiResponse, PixByState } from '@/lib/types';

// Dynamically import Plotly to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), { 
  ssr: false,
  loading: () => (
    <div className="w-full flex items-center justify-center" style={{ height: '600px' }}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        <p className="text-text-muted text-sm">Carregando mapa...</p>
      </div>
    </div>
  ),
});

const GEOJSON_URL =
  'https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/brazil-states.geojson';

type MetricType = 'qtd_transacoes' | 'valor_total';

function formatNumber(n: number): string {
  if (n >= 1e12) return `${(n / 1e12).toFixed(1)} tri`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)} bi`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} mi`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)} mil`;
  return n.toLocaleString('pt-BR');
}

function formatCurrency(n: number): string {
  if (n >= 1e12) return `R$ ${(n / 1e12).toFixed(2)} tri`;
  if (n >= 1e9) return `R$ ${(n / 1e9).toFixed(2)} bi`;
  if (n >= 1e6) return `R$ ${(n / 1e6).toFixed(2)} mi`;
  return `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

function formatFullNumber(n: number): string {
  return n.toLocaleString('pt-BR');
}

function formatFullCurrency(n: number): string {
  return `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function PixChoroplethMap() {
  const [apiData, setApiData] = useState<PixApiResponse | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [geoJson, setGeoJson] = useState<any>(null);
  const [metric, setMetric] = useState<MetricType>('qtd_transacoes');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState(false);

  // Fetch data
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        
        const [apiRes, geoRes] = await Promise.all([
          fetch('/api/pix-by-state'),
          fetch(GEOJSON_URL),
        ]);

        if (!apiRes.ok) throw new Error(`API error: ${apiRes.status}`);
        if (!geoRes.ok) throw new Error(`GeoJSON error: ${geoRes.status}`);

        const apiJson: PixApiResponse = await apiRes.json();
        const geoData = await geoRes.json();

        // Check if using fallback data
        const dataSource = apiRes.headers.get('X-Data-Source');
        setIsFallback(dataSource === 'fallback');

        setApiData(apiJson);
        setGeoJson(geoData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
        console.error('Failed to load data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Build chart data for the choropleth
  const buildChoroplethData = useCallback(() => {
    if (!apiData || !geoJson) return null;

    const states = apiData.data;
    const values = states.map((s) =>
      metric === 'qtd_transacoes' ? s.qtd_transacoes : s.valor_total
    );

    const locations = states.map((s) => s.uf);

    const customText = states.map((s) => 
      `<b>${s.nome_estado} (${s.uf})</b><br>` +
      `Transações: ${formatFullNumber(s.qtd_transacoes)}<br>` +
      `Valor: ${formatFullCurrency(s.valor_total)}`
    );

    return {
      locations,
      values,
      customText,
    };
  }, [apiData, geoJson, metric]);

  // Build top 5 bar chart data
  const buildTop5Data = useCallback(() => {
    if (!apiData) return null;

    const top5 = apiData.data.slice(0, 5);
    
    const sortedByMetric = [...top5].sort((a, b) => {
      const aVal = metric === 'qtd_transacoes' ? a.qtd_transacoes : a.valor_total;
      const bVal = metric === 'qtd_transacoes' ? b.qtd_transacoes : b.valor_total;
      return aVal - bVal; // ascending for horizontal bar
    });

    return {
      labels: sortedByMetric.map((s) => s.nome_estado),
      values: sortedByMetric.map((s) =>
        metric === 'qtd_transacoes' ? s.qtd_transacoes : s.valor_total
      ),
      text: sortedByMetric.map((s) =>
        metric === 'qtd_transacoes'
          ? formatNumber(s.qtd_transacoes)
          : formatCurrency(s.valor_total)
      ),
      hoverText: sortedByMetric.map((s) =>
        `<b>${s.nome_estado} (${s.uf})</b><br>` +
        (metric === 'qtd_transacoes'
          ? `Transações: ${formatFullNumber(s.qtd_transacoes)}`
          : `Valor: ${formatFullCurrency(s.valor_total)}`)
      ),
    };
  }, [apiData, metric]);

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="glass-card p-8 text-center">
        <div className="text-red-400 text-lg mb-2">⚠️ Erro ao carregar dados</div>
        <p className="text-text-muted">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-6 py-2 bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  const choroplethData = buildChoroplethData();
  const top5Data = buildTop5Data();

  if (!choroplethData || !apiData) return null;

  const colorscaleMap = metric === 'qtd_transacoes'
    ? [
        [0, '#0a1628'],
        [0.15, '#0d2847'],
        [0.3, '#0e3d5e'],
        [0.45, '#0a6b6b'],
        [0.6, '#069e7a'],
        [0.75, '#00c994'],
        [0.9, '#33e0be'],
        [1, '#7df5de'],
      ]
    : [
        [0, '#0f0b2e'],
        [0.15, '#1a1145'],
        [0.3, '#2d1a6b'],
        [0.45, '#4527a0'],
        [0.6, '#5c3ec4'],
        [0.75, '#7c5ce7'],
        [0.9, '#a78bfa'],
        [1, '#c4b5fd'],
      ];

  const metricLabel = metric === 'qtd_transacoes' 
    ? 'Quantidade de Transações' 
    : 'Valor Total (R$)';

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-primary pulse-dot" />
            <span className="text-sm text-text-muted">
              Dados: <span className="text-foreground font-medium">{apiData.meta.ano_mes_label}</span>
            </span>
          </div>
          {isFallback && (
            <p className="text-xs text-yellow-400/80 mt-1">
              ⚠ Dados estimados — API do BCB temporariamente indisponível
            </p>
          )}
        </div>

        <div className="metric-toggle">
          <button
            className={`metric-toggle-btn ${metric === 'qtd_transacoes' ? 'active' : ''}`}
            onClick={() => setMetric('qtd_transacoes')}
            id="toggle-transactions"
          >
            📊 Transações
          </button>
          <button
            className={`metric-toggle-btn ${metric === 'valor_total' ? 'active' : ''}`}
            onClick={() => setMetric('valor_total')}
            id="toggle-value"
          >
            💰 Valor Total
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Total de Transações"
          value={formatNumber(apiData.meta.total_transacoes)}
          icon="📊"
        />
        <StatCard
          label="Valor Movimentado"
          value={formatCurrency(apiData.meta.valor_total)}
          icon="💰"
        />
        <StatCard
          label="Estados"
          value={String(apiData.data.length)}
          icon="🗺️"
        />
        <StatCard
          label="Líder"
          value={apiData.data[0]?.uf || '—'}
          icon="🏆"
        />
      </div>

      {/* Map + Top 5 */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        {/* Map */}
        <div className="xl:col-span-3 glass-card p-3 sm:p-4 map-container">
          <Plot
            data={[
              {
                type: 'choropleth' as const,
                geojson: geoJson,
                locations: choroplethData.locations,
                z: choroplethData.values,
                text: choroplethData.customText,
                hoverinfo: 'text' as const,
                featureidkey: 'properties.sigla',
                colorscale: colorscaleMap,
                colorbar: {
                  title: {
                    text: metric === 'qtd_transacoes' ? 'Transações' : 'Valor (R$)',
                    font: { color: '#9bafc4', size: 12, family: 'Inter' },
                  },
                  tickfont: { color: '#7a8ba8', size: 10, family: 'Inter' },
                  bgcolor: 'rgba(0,0,0,0)',
                  bordercolor: 'rgba(0,0,0,0)',
                  len: 0.6,
                  thickness: 14,
                  x: 1.02,
                },
                marker: {
                  line: {
                    color: 'rgba(99, 102, 241, 0.3)',
                    width: 0.8,
                  },
                },
                hoverlabel: {
                  bgcolor: '#0c1424',
                  bordercolor: '#6366f1',
                  font: { color: '#e8ecf4', size: 13, family: 'Inter' },
                },
              },
            ]}
            layout={{
              geo: {
                scope: 'south america' as const,
                showframe: false,
                showcoastlines: false,
                showland: true,
                landcolor: '#0a1020',
                showocean: true,
                oceancolor: '#060d1a',
                showlakes: false,
                showcountries: true,
                countrycolor: 'rgba(99, 102, 241, 0.15)',
                projection: { type: 'mercator' as const },
                lonaxis: { range: [-75, -34] },
                lataxis: { range: [-35, 6] },
                bgcolor: 'transparent',
              },
              paper_bgcolor: 'transparent',
              plot_bgcolor: 'transparent',
              margin: { l: 0, r: 0, t: 30, b: 0 },
              title: {
                text: `${metricLabel} por Estado`,
                font: { color: '#e8ecf4', size: 16, family: 'Inter', weight: 600 },
                x: 0.5,
                y: 0.98,
              },
              dragmode: false,
              autosize: true,
            }}
            config={{
              displayModeBar: false,
              responsive: true,
              scrollZoom: false,
            }}
            style={{ width: '100%', height: '600px' }}
            useResizeHandler={true}
          />
        </div>

        {/* Top 5 Bar Chart */}
        <div className="xl:col-span-1 glass-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-1">
            🏆 Top 5 Estados
          </h3>
          <p className="text-xs text-text-muted mb-4">
            {metric === 'qtd_transacoes' ? 'Por volume de transações' : 'Por valor movimentado'}
          </p>

          {top5Data && (
            <Plot
              data={[
                {
                  type: 'bar' as const,
                  orientation: 'h' as const,
                  x: top5Data.values,
                  y: top5Data.labels,
                  text: top5Data.text,
                  textposition: 'outside' as const,
                  textfont: { color: '#9bafc4', size: 11, family: 'Inter' },
                  hovertext: top5Data.hoverText,
                  hoverinfo: 'text' as const,
                  marker: {
                    color: metric === 'qtd_transacoes'
                      ? ['#00a885', '#00b892', '#00c999', '#00d4aa', '#33e0be']
                      : ['#4527a0', '#5c3ec4', '#7c5ce7', '#a78bfa', '#c4b5fd'],
                    line: { width: 0 },
                  },
                  hoverlabel: {
                    bgcolor: '#0c1424',
                    bordercolor: '#6366f1',
                    font: { color: '#e8ecf4', size: 12, family: 'Inter' },
                  },
                },
              ]}
              layout={{
                paper_bgcolor: 'transparent',
                plot_bgcolor: 'transparent',
                margin: { l: 35, r: 70, t: 0, b: 20 },
                xaxis: {
                  showgrid: false,
                  showticklabels: false,
                  zeroline: false,
                },
                yaxis: {
                  automargin: true,
                  tickfont: { color: '#e8ecf4', size: 13, family: 'Inter', weight: 600 },
                },
                bargap: 0.3,
                autosize: true,
              }}
              config={{
                displayModeBar: false,
                responsive: true,
              }}
              style={{ width: '100%', height: '280px' }}
              useResizeHandler={true}
            />
          )}

          {/* State ranking list */}
          <div className="mt-4 space-y-2">
            {apiData.data.slice(0, 5).map((state, i) => (
              <div
                key={state.uf}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface/50 hover:bg-surface-light/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-text-muted w-4">
                    {i + 1}
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {state.uf}
                  </span>
                </div>
                <span className="text-xs text-text-secondary font-mono">
                  {metric === 'qtd_transacoes'
                    ? formatNumber(state.qtd_transacoes)
                    : formatCurrency(state.valor_total)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="stat-card">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <span className="text-xs text-text-muted font-medium uppercase tracking-wider">
          {label}
        </span>
      </div>
      <div className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
        {value}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="skeleton h-6 w-48" />
        <div className="skeleton h-10 w-64" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="skeleton h-24 rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        <div className="xl:col-span-3 skeleton h-[600px] rounded-2xl" />
        <div className="xl:col-span-1 skeleton h-[600px] rounded-2xl" />
      </div>
    </div>
  );
}
