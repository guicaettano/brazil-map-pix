# Brazil Map Pix

Uma plataforma de inteligência econômica baseada em dados públicos do Pix do Banco Central do Brasil.

Em vez de apenas exibir um mapa, o projeto transforma dados municipais do Pix em indicadores estaduais, rankings e visualizações que ajudam a entender a atividade econômica regional em tempo quase real.

## Visão do produto

O objetivo é evoluir de um dashboard para uma plataforma de analytics voltada para fintechs, bancos, consultorias, varejo, crédito e gestores públicos.

## Tecnologias

- Next.js (App Router)
- React
- TypeScript
- Tailwind CSS v4
- Plotly.js / react-plotly.js

## Fonte dos dados

Os dados são obtidos da API de Dados Abertos do Banco Central do Brasil (BCB), utilizando o endpoint OData `TransacoesPixPorMunicipio`.

A API do painel (`app/api/pix-by-state/route.ts`):
- consulta os dados mais recentes disponíveis;
- agrega municípios em estados (UF);
- soma quantidade de transações e valores movimentados;
- utiliza um dataset de contingência quando a API do BCB estiver indisponível.

## Funcionalidades atuais

- mapa coroplético interativo por estado;
- alternância entre quantidade de transações e valor movimentado;
- ranking Top 5 por atividade Pix;
- layout responsivo para desktop e mobile.

## Roadmap

### Fase 1
- séries temporais por estado;
- comparação entre estados;
- crescimento mensal e acumulado.

### Fase 2
- visualização por município;
- Pix per capita;
- ranking nacional de municípios;
- indicadores proprietários.

### Fase 3
- API pública;
- exportação de dados;
- alertas automáticos de crescimento anormal;
- integração com outros dados econômicos (IBGE, Caged, empresas abertas).

## Como executar

```bash
npm install
npm run dev
```

Abra `http://localhost:3000` no navegador.

## Diferencial

O projeto busca construir um índice de atividade econômica baseado no Pix, utilizando apenas dados públicos do Banco Central, permitindo identificar tendências regionais e oportunidades de mercado antes que apareçam em indicadores econômicos tradicionais.