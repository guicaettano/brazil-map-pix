import { NextResponse } from 'next/server';
import type { PixMunicipioRaw, PixByState, PixApiResponse } from '@/lib/types';
import { ESTADO_TO_UF } from '@/lib/types';

const BCB_BASE_URL =
  'https://olinda.bcb.gov.br/olinda/servico/Pix_DadosAbertos/versao/v1/odata';

/**
 * Build the OData URL for fetching Pix transactions by municipality.
 * The function TransacoesPixPorMunicipio requires a DataBase parameter (YYYYMM).
 */
function buildUrl(dataBase: string): string {
  return (
    `${BCB_BASE_URL}/TransacoesPixPorMunicipio(DataBase=@DataBase)?` +
    `@DataBase='${dataBase}'&` +
    `$format=json&` +
    `$select=AnoMes,Municipio,Estado,Regiao,VL_PagadorPF,QT_PagadorPF,VL_PagadorPJ,QT_PagadorPJ,VL_RecebedorPF,QT_RecebedorPF,VL_RecebedorPJ,QT_RecebedorPJ`
  );
}

/**
 * Try to find the most recent DataBase period available.
 * We try current month minus 2, then minus 3, and so on.
 */
function getRecentPeriods(): string[] {
  const now = new Date();
  const periods: string[] = [];

  // Try from 2 months ago to 6 months ago (data usually has 2-3 month lag)
  for (let offset = 2; offset <= 8; offset++) {
    const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    periods.push(`${year}${month}`);
  }

  return periods;
}

/**
 * Format AnoMes (YYYYMM integer) to a readable label.
 */
function formatAnoMes(anoMes: number): string {
  const str = String(anoMes);
  const year = str.substring(0, 4);
  const month = str.substring(4, 6);
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const monthIndex = parseInt(month, 10) - 1;
  return `${monthNames[monthIndex]} de ${year}`;
}

/**
 * Aggregate municipality-level data to state-level.
 * Total transactions = sum of all QT_ fields (Pagador + Recebedor, PF + PJ).
 * Total value = sum of all VL_ fields.
 */
function aggregateByState(rows: PixMunicipioRaw[]): PixByState[] {
  const stateMap = new Map<string, { 
    nome_estado: string; 
    regiao: string;
    qtd_transacoes: number; 
    valor_total: number;
    ano_mes: number;
  }>();

  for (const row of rows) {
    const estadoName = row.Estado;
    // Normalize string: uppercase and remove accents
    const normalizedEstado = estadoName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();

    // Map normalized names to UF
    const normalizedMap: Record<string, string> = {
      'ACRE': 'AC', 'ALAGOAS': 'AL', 'AMAPA': 'AP', 'AMAZONAS': 'AM',
      'BAHIA': 'BA', 'CEARA': 'CE', 'DISTRITO FEDERAL': 'DF',
      'ESPIRITO SANTO': 'ES', 'GOIAS': 'GO', 'MARANHAO': 'MA',
      'MATO GROSSO': 'MT', 'MATO GROSSO DO SUL': 'MS', 'MINAS GERAIS': 'MG',
      'PARA': 'PA', 'PARAIBA': 'PB', 'PARANA': 'PR', 'PERNAMBUCO': 'PE',
      'PIAUI': 'PI', 'RIO DE JANEIRO': 'RJ', 'RIO GRANDE DO NORTE': 'RN',
      'RIO GRANDE DO SUL': 'RS', 'RONDONIA': 'RO', 'RORAIMA': 'RR',
      'SANTA CATARINA': 'SC', 'SAO PAULO': 'SP', 'SERGIPE': 'SE',
      'TOCANTINS': 'TO'
    };

    const uf = normalizedMap[normalizedEstado] || estadoName;
    
    const existing = stateMap.get(uf);
    
    // Aggregate: sum transactions (pagador PF + PJ + recebedor PF + PJ)
    // Using pagador transactions as the primary measure (to avoid double counting)
    const qtdTransacoes = (row.QT_PagadorPF || 0) + (row.QT_PagadorPJ || 0);
    const valorTotal = (row.VL_PagadorPF || 0) + (row.VL_PagadorPJ || 0);

    if (existing) {
      existing.qtd_transacoes += qtdTransacoes;
      existing.valor_total += valorTotal;
    } else {
      stateMap.set(uf, {
        nome_estado: estadoName,
        regiao: row.Regiao || '',
        qtd_transacoes: qtdTransacoes,
        valor_total: valorTotal,
        ano_mes: row.AnoMes,
      });
    }
  }

  return Array.from(stateMap.entries()).map(([uf, data]) => ({
    uf,
    nome_estado: data.nome_estado,
    regiao: data.regiao,
    qtd_transacoes: Math.round(data.qtd_transacoes),
    valor_total: Math.round(data.valor_total * 100) / 100,
    ano_mes: data.ano_mes,
  })).sort((a, b) => b.qtd_transacoes - a.qtd_transacoes);
}

export async function GET() {
  try {
    const periods = getRecentPeriods();
    let rawData: PixMunicipioRaw[] = [];
    let usedPeriod = '';

    // Try each period until we find one with data
    for (const period of periods) {
      try {
        const url = buildUrl(period);
        console.log(`[PIX API] Trying period: ${period}`);
        
        const response = await fetch(url, {
          headers: {
            'Accept': 'application/json',
          },
          next: { revalidate: 3600 }, // Cache for 1 hour
        });

        if (!response.ok) {
          console.log(`[PIX API] Period ${period} returned status ${response.status}`);
          continue;
        }

        const json = await response.json();
        const values = json.value || [];

        if (values.length > 0) {
          rawData = values;
          usedPeriod = period;
          console.log(`[PIX API] Found ${values.length} records for period ${period}`);
          break;
        }
      } catch (err) {
        console.log(`[PIX API] Error for period ${period}:`, err);
        continue;
      }
    }

    if (rawData.length === 0) {
      // Return fallback data if API is unavailable
      return NextResponse.json(
        getFallbackData(),
        { 
          status: 200,
          headers: { 'X-Data-Source': 'fallback' }
        }
      );
    }

    const aggregated = aggregateByState(rawData);
    const anoMes = parseInt(usedPeriod, 10);
    
    const totalTransacoes = aggregated.reduce((sum, s) => sum + s.qtd_transacoes, 0);
    const totalValor = aggregated.reduce((sum, s) => sum + s.valor_total, 0);

    const result: PixApiResponse = {
      data: aggregated,
      meta: {
        ano_mes: anoMes,
        ano_mes_label: formatAnoMes(anoMes),
        total_transacoes: totalTransacoes,
        valor_total: totalValor,
        fonte: 'Banco Central do Brasil – Dados Abertos Pix',
      },
    };

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        'X-Data-Source': 'bcb-api',
      },
    });
  } catch (error) {
    console.error('[PIX API] Fatal error:', error);
    
    // Return fallback data on error
    return NextResponse.json(
      getFallbackData(),
      { 
        status: 200,
        headers: { 'X-Data-Source': 'fallback' }
      }
    );
  }
}

/**
 * Fallback data with realistic proportions based on known Pix distribution.
 * Used when the BCB API is unavailable.
 */
function getFallbackData(): PixApiResponse {
  const fallbackStates: PixByState[] = [
    { uf: 'SP', nome_estado: 'São Paulo', regiao: 'Sudeste', qtd_transacoes: 1284500000, valor_total: 892300000000, ano_mes: 202506 },
    { uf: 'MG', nome_estado: 'Minas Gerais', regiao: 'Sudeste', qtd_transacoes: 489200000, valor_total: 285600000000, ano_mes: 202506 },
    { uf: 'RJ', nome_estado: 'Rio de Janeiro', regiao: 'Sudeste', qtd_transacoes: 412300000, valor_total: 310200000000, ano_mes: 202506 },
    { uf: 'PR', nome_estado: 'Paraná', regiao: 'Sul', qtd_transacoes: 287600000, valor_total: 178900000000, ano_mes: 202506 },
    { uf: 'RS', nome_estado: 'Rio Grande do Sul', regiao: 'Sul', qtd_transacoes: 265400000, valor_total: 162800000000, ano_mes: 202506 },
    { uf: 'BA', nome_estado: 'Bahia', regiao: 'Nordeste', qtd_transacoes: 234100000, valor_total: 98700000000, ano_mes: 202506 },
    { uf: 'SC', nome_estado: 'Santa Catarina', regiao: 'Sul', qtd_transacoes: 198700000, valor_total: 134500000000, ano_mes: 202506 },
    { uf: 'GO', nome_estado: 'Goiás', regiao: 'Centro-Oeste', qtd_transacoes: 178300000, valor_total: 112400000000, ano_mes: 202506 },
    { uf: 'PE', nome_estado: 'Pernambuco', regiao: 'Nordeste', qtd_transacoes: 165200000, valor_total: 72300000000, ano_mes: 202506 },
    { uf: 'CE', nome_estado: 'Ceará', regiao: 'Nordeste', qtd_transacoes: 148900000, valor_total: 58400000000, ano_mes: 202506 },
    { uf: 'DF', nome_estado: 'Distrito Federal', regiao: 'Centro-Oeste', qtd_transacoes: 132400000, valor_total: 98200000000, ano_mes: 202506 },
    { uf: 'PA', nome_estado: 'Pará', regiao: 'Norte', qtd_transacoes: 118700000, valor_total: 45600000000, ano_mes: 202506 },
    { uf: 'ES', nome_estado: 'Espírito Santo', regiao: 'Sudeste', qtd_transacoes: 102300000, valor_total: 62100000000, ano_mes: 202506 },
    { uf: 'MA', nome_estado: 'Maranhão', regiao: 'Nordeste', qtd_transacoes: 96500000, valor_total: 32800000000, ano_mes: 202506 },
    { uf: 'MT', nome_estado: 'Mato Grosso', regiao: 'Centro-Oeste', qtd_transacoes: 89400000, valor_total: 72100000000, ano_mes: 202506 },
    { uf: 'MS', nome_estado: 'Mato Grosso do Sul', regiao: 'Centro-Oeste', qtd_transacoes: 72800000, valor_total: 48900000000, ano_mes: 202506 },
    { uf: 'PB', nome_estado: 'Paraíba', regiao: 'Nordeste', qtd_transacoes: 68300000, valor_total: 24500000000, ano_mes: 202506 },
    { uf: 'RN', nome_estado: 'Rio Grande do Norte', regiao: 'Nordeste', qtd_transacoes: 62400000, valor_total: 22800000000, ano_mes: 202506 },
    { uf: 'AL', nome_estado: 'Alagoas', regiao: 'Nordeste', qtd_transacoes: 52100000, valor_total: 17200000000, ano_mes: 202506 },
    { uf: 'PI', nome_estado: 'Piauí', regiao: 'Nordeste', qtd_transacoes: 48700000, valor_total: 15800000000, ano_mes: 202506 },
    { uf: 'SE', nome_estado: 'Sergipe', regiao: 'Nordeste', qtd_transacoes: 38900000, valor_total: 13600000000, ano_mes: 202506 },
    { uf: 'RO', nome_estado: 'Rondônia', regiao: 'Norte', qtd_transacoes: 35200000, valor_total: 18400000000, ano_mes: 202506 },
    { uf: 'TO', nome_estado: 'Tocantins', regiao: 'Norte', qtd_transacoes: 28600000, valor_total: 12800000000, ano_mes: 202506 },
    { uf: 'AM', nome_estado: 'Amazonas', regiao: 'Norte', qtd_transacoes: 56300000, valor_total: 28900000000, ano_mes: 202506 },
    { uf: 'AP', nome_estado: 'Amapá', regiao: 'Norte', qtd_transacoes: 12800000, valor_total: 4200000000, ano_mes: 202506 },
    { uf: 'AC', nome_estado: 'Acre', regiao: 'Norte', qtd_transacoes: 14200000, valor_total: 5100000000, ano_mes: 202506 },
    { uf: 'RR', nome_estado: 'Roraima', regiao: 'Norte', qtd_transacoes: 9800000, valor_total: 3600000000, ano_mes: 202506 },
  ];

  const totalTransacoes = fallbackStates.reduce((sum, s) => sum + s.qtd_transacoes, 0);
  const totalValor = fallbackStates.reduce((sum, s) => sum + s.valor_total, 0);

  return {
    data: fallbackStates.sort((a, b) => b.qtd_transacoes - a.qtd_transacoes),
    meta: {
      ano_mes: 202506,
      ano_mes_label: 'Junho de 2025 (dados estimados)',
      total_transacoes: totalTransacoes,
      valor_total: totalValor,
      fonte: 'Banco Central do Brasil – Dados Abertos Pix (dados estimados – API indisponível)',
    },
  };
}
