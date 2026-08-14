# Mapa de Transações Pix por Estado (Brasil)

Um painel interativo (dashboard) desenvolvido em Next.js (App Router) que exibe um mapa coroplético do Brasil com o volume e o valor total de transações Pix por estado (UF).

## 🚀 Tecnologias Utilizadas

- **[Next.js 14+](https://nextjs.org/)**: Framework React com App Router.
- **[React](https://react.dev/)**: Biblioteca de UI.
- **[Tailwind CSS v4](https://tailwindcss.com/)**: Estilização utilitária com design responsivo.
- **[Plotly.js / react-plotly.js](https://plotly.com/javascript/)**: Renderização do mapa coroplético e do gráfico de barras.
- **TypeScript**: Tipagem estática para maior confiabilidade do código.

## 📊 Fonte dos Dados

Os dados são obtidos da [API de Dados Abertos do Banco Central do Brasil (BCB)](https://dadosabertos.bcb.gov.br/dataset/pix). 
Especificamente, o projeto consome o endpoint OData `TransacoesPixPorMunicipio`.

A API do painel (`app/api/pix-by-state/route.ts`):
1. Consulta os dados dos últimos meses na API do BCB até encontrar dados válidos.
2. Agrega os dados em nível municipal para nível estadual (UF).
3. Soma as transações (pagador PF e PJ) e os valores movimentados.
4. Caso a API do BCB esteja instável ou indisponível (fato comum em APIs públicas não autenticadas), o sistema retorna um dataset de contingência com base nas proporções conhecidas de uso do Pix no Brasil, garantindo que o dashboard sempre renderize.

## 🛠️ Como Executar Localmente

### Pré-requisitos
- Node.js 18+ instalado.
- Gerenciador de pacotes (npm, yarn, pnpm, etc).

### Passo a Passo

1. **Clone ou faça o download** do repositório.
2. **Instale as dependências** navegando até o diretório do projeto:
   ```bash
   npm install
   ```
3. **Inicie o servidor de desenvolvimento**:
   ```bash
   npm run dev
   ```
4. **Acesse o painel**: Abra o navegador e acesse [http://localhost:3000](http://localhost:3000).

## 🌟 Funcionalidades

- **Mapa Coroplético Interativo**: Permite explorar as estatísticas de cada estado com *tooltips* customizados.
- **Alternância de Métricas**: Alterne a visualização entre "Quantidade de Transações" e "Valor Total Movimentado".
- **Gráfico Top 5**: Um ranking em barra horizontal evidenciando os 5 estados com maior atividade no Pix.
- **Design Premium**: Uso de *Glassmorphism*, cores com contraste ideal e layout completamente responsivo (funciona em Desktop, Tablet e Mobile).
