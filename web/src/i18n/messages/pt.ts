import type { Messages } from './en';

/**
 * PT-BR copy. Typed as `Messages`, so this file fails to compile the moment a
 * key is added to `en.ts` and not translated here, so English never leaks in silently.
 * Cloud service names (Amazon S3, AWS Lambda, …) stay untranslated on purpose.
 */
export const pt: Messages = {
  common: {
    skipToContent: 'Pular para o conteúdo',
    loading: 'Carregando...',
    cloudProvider: 'Provedor de nuvem',
    dashboard: 'Painel',
    progress: 'Progresso',
    backToDashboard: 'Voltar ao painel',
    backToCertification: 'Voltar à certificação',
    back: 'Voltar',
    soon: 'Em breve',
    starting: 'Iniciando...',
    submitting: 'Enviando...',
    tryAgain: 'Tentar de novo',
    next: 'Próxima',
    previous: 'Anterior',
    pass: 'APROVADO',
    fail: 'REPROVADO',
    correct: 'Correto',
    incorrect: 'Incorreto',
    questions: (count: number) => count === 1 ? '1 questão' : `${count} questões`
  },

  route: {
    notFound: 'Página não encontrada',
    notFoundBody: 'A página que você procura não existe.',
    failed: 'Não foi possível carregar esta página.',
    recovery:
      'Verifique sua conexão e tente novamente. Se uma tentativa estiver aberta em outra aba, mantenha essa aba aberta.'
  },

  language: {
    label: 'Idioma',
    switcherAriaLabel: 'Mudar idioma',
    lockedDuringAttempt:
      'O idioma fica fixo nesta tentativa. Finalize ou saia para trocar.',
    names: {
      'en-US': 'English',
      'pt-BR': 'Português'
    },
    short: {
      'en-US': 'EN',
      'pt-BR': 'PT'
    }
  },

  nav: {
    certifications: 'Certificações',
    pricing: 'Preço',
    menu: 'Menu',
    openMenu: 'Abrir menu',
    closeMenu: 'Fechar menu'
  },

  footer: {
    buyMeACoffee: 'Me pague um café',
    rights: (year: number) =>
      `© ${year} CloudCertify. Todos os direitos reservados.`
  },

  auth: {
    continueWith: (provider: string) => `Continuar com ${provider}`,
    profile: 'Perfil',
    profileMenu: (name: string) => `Menu do perfil de ${name}`,
    logOut: 'Sair',
    signingIn: 'Entrando...',
    failedTitle: 'O login não funcionou',
    failedBody:
      'Não conseguimos concluir o login porque o link estava ausente ou expirado. Você pode tentar de novo ou continuar usando o CloudCertify sem conta.',
    tryAgainFromDashboard: 'Tentar de novo pelo painel',
    goHome: 'Ir para o início'
  },

  levels: {
    foundational: 'Fundamental',
    associate: 'Associado',
    specialist: 'Especialidade',
    professional: 'Profissional'
  },

  difficulty: {
    easy: 'Fácil',
    medium: 'Média',
    hard: 'Difícil'
  },

  home: {
    heroBadge: 'Grátis, sem cartão',
    heroTitleLead: 'Erre aqui,',
    heroTitleTail: 'não na',
    heroSubtitle:
      'Simulados gratuitos das provas AWS. Cada questão explica a resposta, e o resultado mostra quais você só acertou no chute.',
    heroMockQuestion: 'Qual serviço executa contêineres sem gerenciar servidores ou clusters?',
    heroSticker: ['100%', 'grátis'],
    marquee: ['Grátis', 'Sem cartão', 'Provas AWS', 'Toda resposta explicada', 'Treinos por domínio', 'Simulados completos'],
    resultTitle: 'Um resultado que mostra seus pontos cegos.',
    resultSubtitle: 'Diga o quanto tem certeza de cada resposta, e o resultado mostra onde você estava confiante e errou.',
    startCta: 'Começar a praticar',
    browseCta: 'Ver as provas',
    heroExample: 'Um resultado de exemplo do Cloud Practitioner, uma coluna para cada uma das 65 questões. Escolha uma coluna para ver como foi.',
    heroColumn: (number: number, rating: 'confident' | 'unsure' | 'guess', right: boolean) =>
      `Questão ${number}: você ${{ confident: 'tinha certeza', unsure: 'ficou na dúvida', guess: 'chutou' }[rating]} e ${right ? 'acertou' : 'errou'}.${
        rating === 'confident' && !right ? ' Um conceito errado.' : rating === 'guess' && right ? ' Um chute certeiro.' : ''
      }`,
    drillTitle: 'Faça um treino.',
    drillSubtitle:
      'Quatro questões, verificadas uma a uma. Cada acerto sobe um degrau acima do anterior, então uma sequência vira uma escada.',
    modesTitle: 'Dois jeitos de praticar.',
    modeRows: ['Questões', 'Feedback', 'Nota', 'O que ele encontra'],
    modes: {
      drill: {
        name: 'Treino',
        rows: [
          'Um conjunto curto, de um domínio ou misturando a prova inteira.',
          'Verifique cada resposta e leia o porquê na hora.',
          'Um percentual. 70 aprova.',
          'Entre na conta, e as questões que você errou voltam nos próximos treinos.'
        ]
      },
      exam: {
        name: 'Simulado',
        rows: [
          'A prova completa, com a nota calculada pelo peso oficial de cada domínio.',
          'Nada até você enviar.',
          'Uma nota em escala de 100 a 1000.',
          'Se você disser o quanto tem certeza, ele separa chutes certeiros de conceitos errados.'
        ]
      }
    },
    roadmapTitle: 'Escolha sua prova.',
    roadmapSubtitle:
      'Comece pelas provas fundamentais e avance até as de especialidade. Azure e Google Cloud vêm depois da AWS.',
    pricingTitle: 'Grátis. Tudo.',
    pricingBody:
      'Sem cartão e sem plano pago. Um email basta para praticar, sem criar conta. Entre na conta para guardar seu progresso e revisar as questões que errou.',
    sampleQuestions: [
      {
        exam: 'DVA-C02',
        question: 'Qual serviço executa código em resposta a eventos sem provisionar servidores?',
        options: ['AWS Elastic Beanstalk', 'Amazon EC2', 'AWS Lambda', 'Amazon ECS'],
        explanation:
          'O Lambda executa sua função quando um evento chega, sem servidores para você gerenciar. Nos outros três ainda sobram instâncias ou contêineres para dimensionar.'
      },
      {
        exam: 'CLF-C02',
        question: 'No modelo de responsabilidade compartilhada, qual tarefa cabe ao cliente?',
        options: [
          'Aplicar patches no hipervisor',
          'Proteger os prédios dos data centers',
          'Configurar as regras dos security groups',
          'Trocar discos com falha'
        ],
        explanation:
          'A AWS protege a infraestrutura que executa a nuvem. O que você configura dentro dela, incluindo os security groups, é seu.'
      },
      {
        exam: 'SCS-C03',
        question: 'Qual serviço registra as chamadas de API feitas em uma conta AWS para auditoria?',
        options: ['Amazon CloudWatch', 'AWS CloudTrail', 'AWS Config', 'Amazon GuardDuty'],
        explanation:
          'O CloudTrail registra quem chamou qual API, quando e de onde. O CloudWatch coleta métricas e logs, e o Config acompanha a configuração dos recursos.'
      },
      {
        exam: 'SAA-C03',
        question:
          'Um banco de dados relacional precisa fazer failover automático para outra Zona de Disponibilidade. Qual opção oferece isso?',
        options: [
          'Uma réplica de leitura do Amazon RDS',
          'Uma implantação Multi-AZ do Amazon RDS',
          'Uma tabela global do Amazon DynamoDB',
          'Um cluster do Amazon ElastiCache'
        ],
        explanation:
          'O Multi-AZ mantém uma réplica síncrona em espera em outra Zona de Disponibilidade e faz o failover sozinho. Réplicas de leitura servem para escalar leituras.'
      }
    ]
  },

  roadmap: {
    emptyTier: 'Ainda não há provas neste nível. Volte em breve.',
    providerSoon:
      'Este provedor chega em breve. Avisaremos quando estiver no ar.'
  },

  dashboard: {
    title: 'Painel',
    subtitle: 'Continue sua jornada de certificação em nuvem',
    empty: (provider: string) =>
      `Ainda não há certificações da ${provider} disponíveis. Volte em breve.`
  },

  progress: {
    eyebrow: 'Progresso por Quiz',
    title: 'Saiba o que treinar agora.',
    subtitle:
      'Seu desempenho atual por domínio e sua evolução nos simulados, um Quiz por vez.',
    quizSelector: 'Quiz selecionado',
    finishedExams: (count: number) =>
      count === 1 ? '1 simulado concluído' : `${count} simulados concluídos`,
    finishedDrills: (count: number) =>
      count === 1 ? '1 treino concluído' : `${count} treinos concluídos`,
    signInTitle: 'Seu histórico precisa de um lugar.',
    signInBody:
      'Entre para recuperar suas atividades anteriores e ver os domínios mais fracos, treinos recomendados e sua evolução.',
    emptyTitle: 'Ainda não há progresso.',
    emptyBody:
      'Conclua um simulado ou treino e esta página transformará os resultados no seu próximo passo.',
    browseQuizzes: 'Ver Quizzes',
    loadErrorTitle: 'O progresso está indisponível.',
    loadErrorBody:
      'Não foi possível carregar seu histórico de Quizzes. Tente de novo.',
    detailErrorBody:
      'Não foi possível carregar o progresso deste Quiz. Tente de novo.',
    nextMove: 'Seu próximo passo',
    leadTitle: (domain: string) => `Foque em ${domain}.`,
    leadBody: (standing: number, seen: number) =>
      `${standing}% de desempenho em ${seen} questões vistas. Este é seu domínio elegível mais fraco.`,
    buildBaselineTitle: 'Crie uma base útil.',
    buildBaselineBody:
      'Conclua mais questões para o CloudCertify identificar onde um treino personalizado mais ajudará.',
    startDomainDrill: (domain: string) => `Treinar ${domain}`,
    startExam: 'Iniciar um simulado',
    nextExam: 'Iniciar o próximo simulado',
    currentStanding: 'Desempenho atual',
    byDomain: 'Por domínio',
    latestSnapshot: 'Retrato mais recente',
    noDomains:
      'Conclua algumas questões para medir seu desempenho por domínio.',
    domainMeta: (index: number, seen: number) =>
      `Domínio ${String(index).padStart(2, '0')} / ${seen} vistas`,
    delta: (value: number) => `${value >= 0 ? '+' : ''}${value} pts`,
    standingLabel: (domain: string, standing: number) =>
      `${domain}: ${standing}% de desempenho`,
    movement: 'Evolução',
    examScore: 'Percentual de acertos no simulado',
    noExamEyebrow: 'Sem base de simulado',
    firstExamTitle: 'Coloque o primeiro ponto na linha.',
    firstExamBody:
      'Seu histórico de treinos já forma o desempenho por domínio. Conclua um simulado para começar a acompanhar a evolução.',
    baselineSet: 'Base definida',
    baselineBody:
      'Conclua mais um simulado para ver a evolução a partir desta base. Seu desempenho por domínio já é útil agora.',
    trendLabel: (first: number, last: number, count: number) =>
      `O percentual de acertos foi de ${first}% para ${last}% em ${count} simulados concluídos`,
    finishedOnly: 'Somente atividades concluídas / 10 simulados mais recentes'
  },

  certificationCard: {
    startLearning: 'Começar a estudar'
  },

  quizDetail: {
    emailLabel: 'Seu e-mail',
    emailPlaceholder: 'voce@exemplo.com',
    emailInvalid: 'Informe um endereço de e-mail válido.',
    fullExamBody:
      'Simulado no formato da prova. No fim você vê sua pontuação escalada, se passaria e quais domínios precisam de atenção.',
    mixTitle: 'Mix da prova',
    mixBody: (signedIn: boolean) =>
      signedIn
        ? '15 questões da prova inteira, primeiro o que você errou e o que venceu.'
        : '15 questões da prova inteira.',
    examTitle: 'Simulado completo',
    examBody: (count: string | null) =>
      count ? `${count} questões, pontuadas como na prova real.` : 'Pontuado como na prova real.',
    domainHeading: 'Ou foque em um domínio',
    domainCount: '15 questões cada',
    reviewMistakes: 'Revisar meus erros'
  },

  demoQuiz: [
    {
      question: 'Qual alternativa NÃO é um benefício de usar o AWS Lambda?',
      options: [
        'O AWS Lambda executa código sem provisionar ou gerenciar servidores.',
        'O AWS Lambda oferece capacidade computacional redimensionável na nuvem.',
        'Não há cobrança quando seu código do AWS Lambda não está em execução.',
        'O AWS Lambda pode ser chamado diretamente de qualquer aplicativo móvel.'
      ]
    },
    {
      question: 'Qual serviço da AWS armazena e recupera objetos e é conhecido pela durabilidade?',
      options: ['Amazon EC2', 'Amazon S3', 'Amazon RDS', 'Amazon VPC']
    },
    {
      question: 'Qual serviço da AWS oferece uma rede virtual dedicada à sua conta AWS?',
      options: ['Amazon VPC', 'AWS Direct Connect', 'Amazon Route 53', 'AWS Transit Gateway']
    }
  ],

  question: {
    counter: (index: number, total: number) => `Questão ${index} de ${total}`,
    selectAnswers: (count: number) => `Selecione ${count} respostas`,
    finishQuiz: 'Finalizar simulado',
    finish: 'Finalizar',
    check: 'Verificar',
    checking: 'Verificando...',
    continue: 'Continuar',
    finishPractice: 'Finalizar treino',
    finishing: 'Finalizando...',
    notQuite: 'Quase lá',
    correctStreak: (count: number) => `Correto, ${count} seguidas`,
    answerIs: (answer: string) => `Resposta: ${answer}`,
    streak: (count: number) => (count === 1 ? '1 acerto seguido' : `${count} acertos seguidos`)
  },

  shortcuts: {
    select: 'selecionar',
    check: 'verificar',
    continue: 'continuar',
    next: 'próxima',
    finish: 'finalizar',
    navigate: 'navegar'
  },

  drill: {
    label: 'Feito para você',
    composition: ({ missed, due, unseen, mastered }) =>
      `${missed} erradas · ${due} vencidas · ${unseen} novas${mastered > 0 ? ` · ${mastered} dominadas` : ''}`,
    signInPitch: 'Entre e as questões que você errou voltam para você.',
    reviewedMissed: (count: number) =>
      count === 1
        ? 'Você acabou de refazer 1 questão que tinha errado antes.'
        : `Você acabou de refazer ${count} questões que tinha errado antes.`,
    mistakesCount: (count: number) =>
      count === 1 ? '1 erro' : `${count} erros`,
    mistakesReviewed: (count: number) =>
      count === 1
        ? 'Você acabou de revisar 1 erro.'
        : `Você acabou de revisar ${count} erros.`,
    nothingToReview:
      'Nada para revisar ainda. Faça um simulado ou um treino de domínio primeiro.',
    signInRequired: 'Entre para revisar seus erros.'
  },

  confidence: {
    label: 'Quanta certeza você tem?',
    revisitHint: 'Marcada para revisar antes de finalizar.',
    options: {
      guess: 'Chute',
      unsure: 'Em dúvida',
      confident: 'Confiante'
    }
  },

  navigator: {
    landmark: 'Navegador de questões',
    questionLabel: (index: number, answered: boolean, needsReview = false) =>
      `Questão ${index}${answered ? ', respondida' : ', não respondida'}${
        needsReview ? ', marcada para revisar' : ''
      }`
  },

  confirmFinish: {
    titleWithUnanswered: 'Finalizar com questões em branco?',
    title: 'Finalizar esta tentativa?',
    bodyAllAnswered:
      'Suas respostas serão enviadas para correção, e uma tentativa finalizada não pode ser alterada.',
    bodyWithUnanswered: (count: number) =>
      count === 1
        ? 'Ainda há 1 questão sem resposta. Ela será considerada incorreta, e uma tentativa finalizada não pode ser alterada.'
        : `Ainda há ${count} questões sem resposta. Elas serão consideradas incorretas, e uma tentativa finalizada não pode ser alterada.`,
    keepAnswering: 'Continuar respondendo',
    finishAnyway: 'Finalizar mesmo assim'
  },

  report: {
    trigger: 'Relatar um problema',
    reported: 'Problema relatado',
    title: 'O que está errado nesta questão?',
    reasonsHint: 'Marque tudo o que se aplica.',
    reasons: {
      wrong_answer_key: 'A resposta marcada está errada',
      unclear_wording: 'A questão não faz sentido',
      bad_explanation: 'A explicação não ajuda',
      outdated: 'Isto está desatualizado'
    },
    suggest: {
      trigger: 'Sugerir uma correção',
      title: 'Como deveria estar?',
      hint: 'Edite a questão e marque as respostas que deveriam estar certas.',
      questionLabel: 'Questão',
      answerLabel: (index: number) =>
        `Resposta ${String.fromCharCode(65 + index)}`,
      correct: 'Certa',
      correctLabel: (index: number) => `Resposta ${String.fromCharCode(65 + index)} está certa`,
      noChanges: 'Nada alterado ainda.',
      changes: (count: number) =>
        count === 1
          ? '1 alteração para enviar'
          : `${count} alterações para enviar`
    },
    commentLabel: 'Mais alguma coisa? (opcional)',
    commentPlaceholder: 'Conte o que parece errado.',
    commentCounter: (used: number, max: number) => `${used}/${max}`,
    cancel: 'Cancelar',
    submit: 'Enviar relato',
    submitting: 'Enviando...',
    success: 'Valeu, vamos revisar esta questão.',
    error: 'Não foi possível enviar este relato. Tente de novo.'
  },

  review: {
    all: 'Todas',
    wrong: 'Erradas',
    right: 'Certas',
    verdict: (correct: boolean) => (correct ? 'Correta' : 'Incorreta'),
    rowLabel: (index: number) => `Questão ${index}:`,
    stripLabel: 'Questões do simulado',
    stripQuestion: (index: number, correct: boolean) => `Questão ${index}, ${correct ? 'correta' : 'incorreta'}`,
    summaryHeading: 'Resumo das questões',
    reviewHeading: 'Revisão das questões',
    questionLabel: (index: number, text: string) => `Questão ${index}: ${text}`,
    clickToView: (correct: boolean) =>
      `${correct ? 'Correto' : 'Incorreto'}. Clique para ver os detalhes`,
    explanation: 'Explicação',
    yourAnswer: '(Sua resposta)',
    correctAnswer: '(Resposta correta)',
    ratedAs: (rating: string) => `Você estava: ${rating}`
  },

  attempt: {
    startExamError: 'Não foi possível iniciar o simulado. Tente de novo.',
    startDrillError: 'Não foi possível iniciar o treino. Tente de novo.',
    unsavedAnswers:
      'Algumas respostas não foram salvas. Estamos salvando de novo. Envie quando estiverem salvas.',
    unsavedCount: (count: number) =>
      count === 1 ? '1 resposta ainda não foi salva.' : `${count} respostas ainda não foram salvas.`,
    emptyTitle: 'Nenhuma questão para mostrar',
    emptyBody: 'Esta tentativa voltou sem questões. Volte e comece outra.',
    verdict: (passed: boolean) => (passed ? 'APROVADO' : 'REPROVADO'),
    leave: 'Sair',
    mute: 'Silenciar som'
  },

  results: {
    quizTitle: 'Resultado do simulado',
    practiceTitle: 'Resultado do treino',
    passingScore: (passed: boolean, score: string) =>
      `${passed ? 'APROVADO' : 'REPROVADO'} (Nota de corte: ${score})`,
    scoreLine: (correct: number, total: number) =>
      `Você acertou ${correct} de ${total} questões`,
    confidenceHeading: 'O que sua confiança diz',
    luckyGuesses: 'Chutes certeiros',
    luckyGuessesHint: 'Você chutou e acertou. Ainda vale estudar.',
    misconceptions: 'Conceitos errados',
    misconceptionsHint: 'Você tinha certeza e errou. Comece por aqui.',
    longestRun: (count: number) => `Maior sequência: ${count}.`,
    missedReturn: 'O que você errou volta em mixes futuros.',
    nextDrill: 'Começar próximo treino',
    reviewQuestions: 'Revisar questões',
    stripHint: 'Toque numa coluna para abrir a questão.',
    stripLegend: 'A altura mostra sua confiança. Verde é acerto, vermelho é erro.',
    domainBreakdown: 'Detalhe por domínio',
    domainStats: (
      correct: number,
      total: number,
      pct: number,
      weight: number
    ) => `${correct}/${total} (${pct}%) · peso ${weight}%`,
    restartQuiz: 'Refazer simulado',
    submitError:
      'Não foi possível enviar esta tentativa. Ela pode já estar finalizada. Use "Tentar de novo" para começar outra.',
    answerError:
      'Não foi possível salvar essa resposta. Verifique sua conexão e selecione de novo.',
    checkError: 'Não foi possível verificar esta resposta. Tente de novo.',
    finishError: 'Não foi possível finalizar este treino. Tente de novo.'
  },

  providers: {
    aws: 'Amazon Web Services',
    azure: 'Microsoft Azure',
    gcp: 'Google Cloud'
  }
};
