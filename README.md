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

## Configurar o Firebase (login)

O app exige login. Cada integrante pode usar o projeto Firebase da equipe ou criar um próprio para testes.

1. No [Console do Firebase](https://console.firebase.google.com), abra o projeto (ou crie um).
2. **Authentication → Começar → Método de login → E-mail/senha → Ativar**.
3. **Authentication → Usuários → Adicionar usuário**: crie um usuário de teste (e-mail e senha com 6+ caracteres).
4. **Configurações do projeto (engrenagem) → Seus apps → Web (`</>`)**: registre um app e copie os valores do `firebaseConfig`.
5. Copie `app/.env.example` para `app/.env` e cole cada valor na variável correspondente.
6. Reinicie o servidor com `npx expo start -c` (o `-c` limpa o cache para ler o `.env` novo).

O arquivo `.env` não vai para o Git. Sem ele o app mostra um aviso no terminal e o login não funciona.

### Como funciona a autenticação

- `src/lib/firebase.ts` inicializa o Firebase com os valores do `.env`.
- `src/lib/auth.ts` (web) e `src/lib/auth.native.ts` (Android/iPhone) criam o Auth. No celular a sessão fica salva com AsyncStorage, então o usuário continua logado ao reabrir o app.
- `src/context/AuthContext.tsx` guarda o usuário logado num estado global (`useAuth()`), com `signIn`, `signOut` e `resetPassword`.
- `src/app/_layout.tsx` protege as rotas com `Stack.Protected`: sem login só existe o grupo `(auth)` (`login` e `esqueci-senha`); com login, só as abas e o detalhe do hotel.
- `src/lib/validation.ts` valida o formulário (e-mail e senha) e `src/lib/authErrors.ts` traduz os erros do Firebase para português.

## Configurar o Firestore (hotéis e leituras)

1. No Console do Firebase, abra **Firestore Database → Criar banco de dados**.
2. Escolha o **modo de produção** e a região **`southamerica-east1` (São Paulo)**. A região não pode ser trocada depois.
3. Na aba **Regras**, apague o conteúdo, cole o arquivo [`firestore.rules`](firestore.rules) deste repositório e clique em **Publicar**.
4. Rode o app, entre com o usuário de teste e, na aba **Conta → Administração**, toque em **Carregar dados de exemplo**. Os 9 hotéis da Rede Litoral aparecem no Painel na hora.

### Modelo de dados

```
clients/{clientId}                                nome do cliente e limite de destaque (%)
clients/{clientId}/hotels/{hotelId}               ordem, hotel próprio e 3 concorrentes, cada um com o "latest"
clients/{clientId}/hotels/{hotelId}/checks/{id}   histórico: uma leitura por documento, nunca sobrescrita
```

- O painel lê só os documentos de `hotels`, em tempo real (`onSnapshot`). Quem estiver com o app aberto vê um cadastro ou uma leitura nova na hora.
- Cada leitura registrada cria um documento em `checks` e atualiza o `latest` da propriedade na mesma transação. `previousPrice` e `changedAt` só mudam quando o preço muda.
- As regras só deixam usuários autenticados lerem e escreverem. Leituras do histórico não podem ser alteradas nem apagadas.

### Onde está no código

- `src/lib/firestore.ts`: conexão com o Firestore e mensagens de erro em português.
- `src/data/paths.ts`: os caminhos das coleções.
- `src/data/useHotels.ts`: leitura em tempo real. As telas usam só esse hook.
- `src/data/hotelsRepository.ts`: cadastrar, editar, remover hotel e registrar leitura.
- `src/data/seed.ts`: carga inicial dos dados de exemplo (pode rodar mais de uma vez; hotéis existentes não são alterados).
- `src/lib/hotelForm.ts`: estado do formulário de hotel (`useReducer`) e validação.
- `src/lib/readings.ts`: validação do preço e cálculo do `latest` a cada leitura.
- Telas: `src/app/hotel/novo.tsx`, `src/app/hotel/editar/[id].tsx` e `src/app/leitura/[id].tsx`. Os botões de editar, remover e registrar leitura ficam no detalhe do hotel.

## Estrutura

```
app/                    Projeto Expo
  src/app/              Rotas (Expo Router): Stack na raiz, abas em (tabs)/, detalhe em hotel/[id]
  src/components/       Componentes reutilizáveis (HotelCard, PriceRow, StatusBadge...)
  src/lib/              Regras de preço, formatação, validação e configuração do Firebase
  src/context/          Estado global (AuthContext)
  src/data/             Firestore: hook useHotels, operações de escrita e carga de exemplo
  src/theme/            Cores, espaçamentos e tipografia
docs/                   Cronograma e briefing de identidade visual
BRIEFING.md             Briefing do produto
CLAUDE.md               Guia de desenvolvimento
```

## Equipe e divisão

Ver [docs/CRONOGRAMA.md](docs/CRONOGRAMA.md).
