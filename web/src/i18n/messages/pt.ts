import type { Messages } from './en';

/**
 * PT-BR copy. Typed as `Messages`, so this file fails to compile the moment a
 * key is added to `en.ts` and not translated here — no silent English leaks.
 * Cloud service names (Amazon S3, AWS Lambda, …) stay untranslated on purpose.
 */
export const pt: Messages = {
  common: {
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
    questions: (count: number) => `${count} questões`
  },

  language: {
    label: 'Idioma',
    switcherAriaLabel: 'Mudar idioma',
    lockedDuringAttempt:
      'O idioma fica fixo nesta tentativa — finalize ou saia para trocar.',
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
    pricing: 'Preço'
  },

  footer: {
    buyMeACoffee: 'Buy me a coffee',
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
      'Não conseguimos concluir o login — o link estava ausente ou expirado. Você pode tentar de novo ou continuar usando o CloudCertify sem conta.',
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
    heroBadge: 'Grátis — sem cartão, sem conta',
    heroTitleLead: 'Passe na sua',
    heroTitleCert: 'certificação',
    heroTitleTail: 'de primeira',
    heroTitleChipFirst: false,
    heroSubtitle:
      'Questões no estilo da prova, treinos focados por domínio e simulados completos de AWS, Google Cloud e Azure. Feito para te certificar — não para te vender nada.',
    heroPrimaryCta: 'Começar a estudar',
    heroSecondaryCta: 'Ver certificações',
    heroMockQuestion:
      'Qual serviço executa contêineres sem gerenciar servidores ou clusters?',
    heroFreeSticker: ['100%', 'grátis'],
    marquee: [
      'AWS Certified',
      'Google Cloud',
      'Microsoft Azure',
      'Simulados',
      'Treinos por domínio',
      'Passe de primeira'
    ],
    stats: {
      questions: 'questões de prática',
      paths: 'trilhas de certificação',
      providers: 'provedores de nuvem',
      price: 'para sempre, sem pegadinha'
    },
    roadmapEyebrow: 'A trilha',
    roadmapTitle: 'Escolha seu caminho',
    roadmapSubtitle:
      'Comece pelas provas fundamentais e avance até as de especialidade — um provedor por vez.',
    sampleTitle: 'Experimente uma questão',
    sampleSubtitle:
      'Como na prova: enunciados reais, alternativas plausíveis e feedback na hora.',
    pricingTitle: 'Preço simples',
    pricingSubtitle:
      'Sem assinatura. Sem plano premium. Só treino gratuito para certificações em nuvem.',
    pricingPeriod: '/ para sempre',
    pricingNote: 'Sem pegadinha. Sério.',
    pricingPerks: [
      'Todas as questões de AWS, GCP e Azure',
      'Modo simulado completo',
      'Sem cartão de crédito'
    ],
    pricingCta: 'Começar a estudar agora',
    featuresBadge: 'Por que CloudCertify',
    featuresTitle: 'Focado na sua aprovação em certificações de nuvem',
    featuresSubtitle:
      'Feito para te ajudar a passar nas provas de certificação da AWS, Google Cloud e Azure.',
    features: [
      {
        title: 'Banco de questões multicloud',
        body: 'Centenas de questões de prática cobrindo as provas de certificação da AWS, Google Cloud e Azure.'
      },
      {
        title: 'Cobertura dos conceitos de nuvem',
        body: 'Conceitos, serviços, segurança e modelos de preço dos três principais provedores.'
      },
      {
        title: 'Estudo focado na prova',
        body: 'Questões alinhadas aos objetivos e formatos mais recentes das provas.'
      }
    ],
    ctaCardTitle: 'Pronto para se certificar em nuvem?',
    ctaCardBody:
      'Dê hoje o primeiro passo rumo à sua certificação AWS, GCP ou Azure.',
    sampleQuestions: [
      {
        question:
          'Qual serviço da AWS você usaria para executar contêineres sem gerenciar servidores ou clusters?',
        options: ['Amazon ECS', 'Amazon EKS', 'AWS Fargate', 'AWS Lambda'],
        category: 'AWS Solutions Architect',
        difficulty: 'medium'
      },
      {
        question:
          'Qual serviço da AWS permite executar código sem provisionar ou gerenciar servidores?',
        options: [
          'AWS Elastic Beanstalk',
          'Amazon EC2',
          'AWS Lambda',
          'Amazon ECS'
        ],
        category: 'AWS Developer',
        difficulty: 'medium'
      },
      {
        question:
          'Qual serviço do Google Cloud é usado para armazenar objetos não estruturados, semelhante ao Amazon S3?',
        options: [
          'Cloud Filestore',
          'Cloud SQL',
          'Cloud Storage',
          'Persistent Disk'
        ],
        category: 'Google Cloud',
        difficulty: 'easy'
      },
      {
        question:
          'Qual serviço do Azure oferece computação serverless para executar código orientado a eventos sem gerenciar infraestrutura?',
        options: [
          'Azure App Service',
          'Azure Functions',
          'Azure Logic Apps',
          'Azure Container Instances'
        ],
        category: 'Azure',
        difficulty: 'easy'
      }
    ]
  },

  roadmap: {
    emptyTier: 'Ainda não há provas neste nível — volte em breve.',
    providerSoon:
      'Este provedor chega em breve. Avisaremos quando estiver no ar.'
  },

  dashboard: {
    title: 'Painel',
    subtitle: 'Continue sua jornada de certificação em nuvem',
    loadError: 'Não foi possível carregar as certificações. Tente mais tarde.',
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
    startExamError: 'Não foi possível iniciar o simulado. Tente de novo.',
    startDrillError: 'Não foi possível iniciar o treino. Tente de novo.',
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
    startExamError: 'Não foi possível iniciar o simulado. Tente de novo.',
    startPracticeError: 'Não foi possível iniciar o treino. Tente de novo.',
    fullExamHeading: 'Simulado completo',
    fullExamBody:
      'Simulado no formato da prova. No fim você vê sua pontuação escalada, se passaria e quais domínios precisam de atenção.',
    questionsInPool: (count: number) => `${count} questões no banco`,
    perExam: (range: string) => `~${range} por prova`,
    scaledScoreBadge: 'Pontuação escalada',
    passFailBadge: 'Aprovado / Reprovado',
    domainBreakdownBadge: 'Detalhe por domínio',
    startExam: 'Iniciar simulado',
    practiceHeading: 'Treinos',
    practiceSubtitle:
      'Treinos focados de 15 questões por domínio. Feedback rápido, sem pressão de aprovação.',
    practice: 'Treinar',
    notFound: 'Quiz não encontrado.'
  },

  question: {
    counter: (index: number, total: number) => `Questão ${index} de ${total}`,
    selectAnswers: (count: number) => `Selecione ${count} respostas`,
    finishQuiz: 'Finalizar simulado',
    check: 'Verificar',
    checking: 'Verificando...',
    continue: 'Continuar',
    finishPractice: 'Finalizar treino',
    finishing: 'Finalizando...',
    notQuite: 'Quase lá'
  },

  drill: {
    label: 'Feito para você',
    composition: (missed: number, unseen: number, mastered: number) =>
      `${missed} revisão · ${unseen} novas · ${mastered} reforço`,
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
    open: 'Abrir navegador de questões',
    openTitle: (index: number, total: number) =>
      `Abrir navegador de questões — questão ${index} de ${total}`,
    close: 'Fechar navegador de questões',
    title: 'Questões',
    landmark: 'Navegador de questões',
    answeredCount: (answered: number, total: number) =>
      `${answered} de ${total} respondidas`,
    reviewCount: (count: number) =>
      count === 1 ? '1 para revisar' : `${count} para revisar`,
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
    success: 'Valeu — vamos revisar esta questão.',
    error: 'Não foi possível enviar este relato. Tente de novo.'
  },

  review: {
    summaryHeading: 'Resumo das questões',
    reviewHeading: 'Revisão das questões',
    questionLabel: (index: number, text: string) => `Questão ${index}: ${text}`,
    clickToView: (correct: boolean) =>
      `${correct ? 'Correto' : 'Incorreto'} — Clique para ver os detalhes`,
    explanation: 'Explicação',
    yourAnswer: '(Sua resposta)',
    correctAnswer: '(Resposta correta)',
    ratedAs: (rating: string) => `Você estava: ${rating}`
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
    luckyGuessesHint: 'Você chutou e acertou — ainda vale estudar.',
    misconceptions: 'Conceitos errados',
    misconceptionsHint: 'Você tinha certeza e errou — comece por aqui.',
    domainBreakdown: 'Detalhe por domínio',
    domainStats: (
      correct: number,
      total: number,
      pct: number,
      weight: number
    ) => `${correct}/${total} (${pct}%) · peso ${weight}%`,
    restartQuiz: 'Refazer simulado',
    submitError:
      'Não foi possível enviar esta tentativa. Ela pode já estar finalizada — use "Tentar de novo" para começar outra.',
    restartError: 'Não foi possível iniciar uma nova tentativa. Tente de novo.',
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
