# Roteiro do vídeo de demonstração (3 a 5 minutos)

Objetivo: mostrar o app rodando e passar por cada critério de avaliação. Grave no **celular** (Expo Go), porque os recursos nativos não aparecem no navegador. Para o Git Flow, grave a tela do computador no GitHub.

Antes de gravar:

- Rode **Conta → Carregar dados de exemplo** para a Visão geral, o Calendário e os Alertas estarem cheios.
- Saia da conta, para o vídeo começar no login.
- Deixe o volume do celular ligado: a vibração aparece no som da gravação. Diga em voz alta quando o aparelho vibrar.

| Tempo | O que mostrar | O que falar | Critério |
|---|---|---|---|
| 0:00 – 0:15 | Tela de login | Nome do app, do grupo e o problema: a rede hoteleira decide o preço de cada unidade olhando os concorrentes e o tipo de data | Documentação e apresentação |
| 0:15 – 0:40 | Entrar sem preencher (erros), depois entrar com o usuário de teste | Formulário validado, sessão no `AuthContext` (Context API) e rotas protegidas | Estados e formulários, Firebase Auth |
| 0:40 – 1:15 | Visão geral: indicadores, cartão do próximo feriado, filtro por localização, sugestão de hoje nos cartões, as 5 abas | Componentes reutilizáveis, Flexbox, navegadores aninhados (Expo Router), estado global `HotelsContext` | Arquitetura, navegação, interface |
| 1:15 – 1:55 | "Ver sugestões": comparativo da data com o gráfico de faixa, a explicação da sugestão e "Registrar decisão". Depois abra um comparativo pelo **Calendário**, troque para outra aba, volte ao Calendário (o comparativo continua aberto) e arraste da borda para voltar | Sugestão acompanha a mediana e respeita o preço-piso; a decisão fica gravada no Firestore. Navegação: Stack raiz → Tabs → um Stack por aba, com telas compartilhadas | Firebase, interface, navegação |
| 1:55 – 2:25 | Calendário: cores por nível de preço, tocar num dia, "Possível evento detectado", cadastrar um evento | Grade com Flexbox, feriados nacionais calculados, cadastro validado | Estados e formulários, Firebase (CRUD) |
| 2:25 – 2:50 | Catálogo (filtrar e salvar pesquisa) e Alertas (número na aba, marcar como lido, mudar uma regra) | Pesquisas salvas e alertas lidos no Firestore, `Switch` nativo | Firebase, estados |
| 2:50 – 3:20 | Abrir um hotel em destaque: o celular vibra. Concorrentes, "vs. seu hotel" e gráfico de 7 dias | Vibração de aviso (Haptics), tempo real com `onSnapshot` | Recursos nativos |
| 3:20 – 3:55 | Registrar leitura: salvar sem preço (erro e vibração), escolher uma noite futura no seletor do sistema, salvar | DateTimePicker nativo, validação, feedback; a tarifa aparece no comparativo e no calendário | Recursos nativos, formulários, UX |
| 3:55 – 4:15 | Novo cadastro: enviar vazio (erros), cadastrar um hotel da rede com localização e preço-piso, depois um concorrente vinculado a dois hotéis; tentar usar uma unidade da rede como concorrente | `useReducer`; criar, editar e remover no Firestore | Firebase (CRUD), estados |
| 4:15 – 4:50 | GitHub: branches `main`, `develop` e `feature/*`, os Pull Requests com revisão e os commits de cada integrante | Git Flow e divisão do trabalho | Git Flow e trabalho em equipe |
| 4:50 – 5:00 | README no GitHub | Onde estão a instalação, os prints e a divisão de tarefas | Documentação |

Dicas:

- Ensaie uma vez com cronômetro. Se sobrar tempo, mostre dois aparelhos lado a lado atualizando em tempo real.
- Cada integrante pode narrar a parte que fez.
- Não mostre o arquivo `.env` nem digite a senha com a tela visível.
