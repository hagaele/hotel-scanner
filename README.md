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

## Estrutura

```
app/                    Projeto Expo
  src/app/              Rotas (Expo Router): Stack na raiz, abas em (tabs)/, detalhe em hotel/[id]
  src/components/       Componentes reutilizáveis (HotelCard, PriceRow, StatusBadge...)
  src/lib/              Regras de preço, formatação, validação e configuração do Firebase
  src/context/          Estado global (AuthContext)
  src/data/             Dados de exemplo e o hook useHotels (ponto único de acesso aos dados)
  src/theme/            Cores, espaçamentos e tipografia
docs/                   Cronograma e briefing de identidade visual
BRIEFING.md             Briefing do produto
CLAUDE.md               Guia de desenvolvimento
```

## Equipe e divisão

Ver [docs/CRONOGRAMA.md](docs/CRONOGRAMA.md).
