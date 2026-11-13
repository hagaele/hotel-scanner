# Roteiro do vídeo de demonstração (3 a 5 minutos)

Objetivo: mostrar o app rodando e passar por cada critério de avaliação. Grave no **celular** (Expo Go), porque os recursos nativos não aparecem no navegador. Para o Git Flow, grave a tela do computador no GitHub.

Antes de gravar:

- Rode **Conta → Carregar dados de exemplo** para o Painel estar cheio.
- Saia da conta, para o vídeo começar no login.
- Deixe o volume do celular ligado: a vibração aparece no som da gravação. Diga em voz alta quando o aparelho vibrar.

| Tempo | O que mostrar | O que falar | Critério |
|---|---|---|---|
| 0:00 – 0:20 | Tela de login | Nome do app, do grupo e o problema: a rede hoteleira compara a diária dos seus hotéis com a dos concorrentes | Documentação e apresentação |
| 0:20 – 0:50 | Entrar sem preencher (erros), depois entrar com o usuário de teste | Formulário validado, mensagens em português, sessão guardada no `AuthContext` (Context API) e rotas protegidas | Estados e formulários, Firebase Auth |
| 0:50 – 1:30 | Painel: resumo, cartões, filtro "Só em destaque", aba Destaques, aba Conta | Componentes reutilizáveis, Flexbox, Stack com abas dentro (Expo Router), ícones vetoriais | Arquitetura, navegação, interface |
| 1:30 – 2:10 | Abrir um hotel em destaque: o celular vibra. Mostrar os concorrentes, o rótulo "vs. seu hotel" e o gráfico de 7 dias | Vibração de aviso (Haptics), dados em tempo real do Firestore, histórico lido só no detalhe | Recursos nativos, Firebase |
| 2:10 – 3:00 | Registrar leitura: salvar sem preço (erro e vibração), escolher data e hora no seletor do sistema, salvar com preço | DateTimePicker nativo, validação, feedback de carregando e sucesso, o preço muda no detalhe e aparece "era R$ ..." | Recursos nativos, estados e formulários, UX |
| 3:00 – 3:40 | Novo hotel: enviar vazio (erros), preencher e cadastrar. Editar o nome. Remover com confirmação | `useReducer` no formulário; criar, editar e remover no Firestore | Firebase (CRUD), estados |
| 3:40 – 4:10 | Dois aparelhos (ou celular e navegador) lado a lado: registrar uma leitura num e ver o outro atualizar sozinho | Tempo real com `onSnapshot` | Firebase |
| 4:10 – 4:50 | GitHub: branches `main`, `develop` e `feature/*`, os Pull Requests com revisão e os commits de cada integrante | Git Flow e divisão do trabalho | Git Flow e trabalho em equipe |
| 4:50 – 5:00 | README no GitHub | Onde estão a instalação, os prints e a divisão de tarefas | Documentação |

Dicas:

- Ensaie uma vez com cronômetro. Se passar de 5 minutos, corte a parte dos dois aparelhos.
- Cada integrante pode narrar a parte que fez.
- Não mostre o arquivo `.env` nem digite a senha com a tela visível.
