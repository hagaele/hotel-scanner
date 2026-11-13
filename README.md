# HOFIX

Aplicativo (Android, iPhone e web) em que uma rede hoteleira acompanha o preço da diária de hoje dos seus hotéis comparado com o dos concorrentes diretos.

Projeto Final da disciplina de Programação para Dispositivos Móveis (IESB). Stack: React Native (Expo) + Firebase.

## Como rodar

Pré-requisito: Node.js LTS.

```bash
cd app
npm install
npx expo start
```

Depois, abra no celular com o Expo Go (QR code) ou pressione `w` para abrir no navegador.

## Estrutura

```
app/                    Projeto Expo
  src/app/              Rotas (Expo Router): Stack na raiz, abas em (tabs)/, detalhe em hotel/[id]
  src/components/       Componentes reutilizáveis (HotelCard, PriceRow, StatusBadge...)
  src/lib/              Regras de preço e formatação (funções puras)
  src/data/             Dados de exemplo e o hook useHotels (ponto único de acesso aos dados)
  src/theme/            Cores, espaçamentos e tipografia
docs/                   Cronograma e briefing de identidade visual
BRIEFING.md             Briefing do produto
CLAUDE.md               Guia de desenvolvimento
```

## Equipe e divisão

Ver [docs/CRONOGRAMA.md](docs/CRONOGRAMA.md).
