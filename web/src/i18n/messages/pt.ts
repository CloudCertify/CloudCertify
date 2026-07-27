import type { Messages } from './en';

/**
 * PT-BR copy. Typed as `Messages`, so this file fails to compile the moment a
 * key is added to `en.ts` and not translated here — no silent English leaks.
 * Cloud service names (Amazon S3, AWS Lambda, …) stay untranslated on purpose.
 */
export const pt: Messages = {
  common: {
    dashboard: 'Painel',
    backToDashboard: 'Voltar ao painel',
    backToHome: 'Voltar ao início',
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
    buyMeACoffee: 'Me pague um café',
    rights: (year: number) =>
      `© ${year} CloudCertify. Todos os direitos reservados.`
  },

  auth: {
    continueWith: (provider: string) => `Continuar com ${provider}`,
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
    professional: 'Professional'
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
    providerSoon: 'Este provedor chega em breve. Avisaremos quando estiver no ar.'
  },

  dashboard: {
    title: 'Painel',
    subtitle: 'Continue sua jornada de certificação em nuvem',
    loadError: 'Não foi possível carregar as certificações. Tente mais tarde.',
    empty: (provider: string) =>
      `Ainda não há certificações da ${provider} disponíveis. Volte em breve.`
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
    practiceHeading: 'Treino por domínio',
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

  navigator: {
    open: 'Abrir navegador de questões',
    openTitle: (index: number, total: number) =>
      `Abrir navegador de questões — questão ${index} de ${total}`,
    close: 'Fechar navegador de questões',
    title: 'Questões',
    landmark: 'Navegador de questões',
    answeredCount: (answered: number, total: number) =>
      `${answered} de ${total} respondidas`,
    questionLabel: (index: number, answered: boolean) =>
      `Questão ${index}${answered ? ', respondida' : ', não respondida'}`
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

  review: {
    summaryHeading: 'Resumo das questões',
    reviewHeading: 'Revisão das questões',
    questionLabel: (index: number, text: string) => `Questão ${index}: ${text}`,
    clickToView: (correct: boolean) =>
      `${correct ? 'Correto' : 'Incorreto'} — Clique para ver os detalhes`,
    explanation: 'Explicação',
    yourAnswer: '(Sua resposta)',
    correctAnswer: '(Resposta correta)'
  },

  results: {
    quizTitle: 'Resultado do simulado',
    practiceTitle: 'Resultado do treino',
    passingScore: (passed: boolean, score: string) =>
      `${passed ? 'APROVADO' : 'REPROVADO'} (Nota de corte: ${score})`,
    scoreLine: (correct: number, total: number) =>
      `Você acertou ${correct} de ${total} questões`,
    domainBreakdown: 'Detalhe por domínio',
    domainStats: (correct: number, total: number, pct: number, weight: number) =>
      `${correct}/${total} (${pct}%) · peso ${weight}%`,
    restartQuiz: 'Refazer simulado',
    submitError:
      'Não foi possível enviar esta tentativa. Ela pode já estar finalizada — use "Tentar de novo" para começar outra.',
    restartError: 'Não foi possível iniciar uma nova tentativa. Tente de novo.',
    checkError: 'Não foi possível verificar esta resposta. Tente de novo.',
    finishError: 'Não foi possível finalizar este treino. Tente de novo.'
  },

  providers: {
    aws: 'Amazon Web Services',
    azure: 'Microsoft Azure',
    gcp: 'Google Cloud'
  }
};
