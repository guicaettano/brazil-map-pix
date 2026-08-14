// Type definitions for the Pix transaction data

export interface PixMunicipioRaw {
  AnoMes: number;
  Municipio_Ibge: number;
  Municipio: string;
  Estado_Ibge: number;
  Estado: string;
  Sigla_Regiao: string;
  Regiao: string;
  VL_PagadorPF: number;
  QT_PagadorPF: number;
  VL_PagadorPJ: number;
  QT_PagadorPJ: number;
  VL_RecebedorPF: number;
  QT_RecebedorPF: number;
  VL_RecebedorPJ: number;
  QT_RecebedorPJ: number;
  QT_PES_PagadorPF: number;
  QT_PES_PagadorPJ: number;
  QT_PES_RecebedorPF: number;
  QT_PES_RecebedorPJ: number;
}

export interface PixByState {
  uf: string;
  nome_estado: string;
  regiao: string;
  qtd_transacoes: number;
  valor_total: number;
  ano_mes: number;
}

export interface PixApiResponse {
  data: PixByState[];
  meta: {
    ano_mes: number;
    ano_mes_label: string;
    total_transacoes: number;
    valor_total: number;
    fonte: string;
  };
}

// Mapping from Estado (state name) to UF (sigla)
export const ESTADO_TO_UF: Record<string, string> = {
  'Acre': 'AC',
  'Alagoas': 'AL',
  'Amapá': 'AP',
  'Amazonas': 'AM',
  'Bahia': 'BA',
  'Ceará': 'CE',
  'Distrito Federal': 'DF',
  'Espírito Santo': 'ES',
  'Goiás': 'GO',
  'Maranhão': 'MA',
  'Mato Grosso': 'MT',
  'Mato Grosso do Sul': 'MS',
  'Minas Gerais': 'MG',
  'Pará': 'PA',
  'Paraíba': 'PB',
  'Paraná': 'PR',
  'Pernambuco': 'PE',
  'Piauí': 'PI',
  'Rio de Janeiro': 'RJ',
  'Rio Grande do Norte': 'RN',
  'Rio Grande do Sul': 'RS',
  'Rondônia': 'RO',
  'Roraima': 'RR',
  'Santa Catarina': 'SC',
  'São Paulo': 'SP',
  'Sergipe': 'SE',
  'Tocantins': 'TO',
};

export const UF_TO_ESTADO: Record<string, string> = Object.fromEntries(
  Object.entries(ESTADO_TO_UF).map(([k, v]) => [v, k])
);
