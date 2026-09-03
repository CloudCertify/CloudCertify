import type { QuestionDifficulty } from '@/http/generated/api.schemas';

type SampleQuestion = {
  question: string;
  options: string[];
  category: string;
  difficulty: QuestionDifficulty;
};

/**
 * EN-US copy. This object's shape is the contract every other locale must
 * satisfy (`pt.ts` is typed as `Messages`), so a missing key is a build error
 * rather than a blank string at runtime.
 */
export const en = {
  common: {
    dashboard: 'Dashboard',
    progress: 'Progress',
    backToDashboard: 'Back to Dashboard',
    backToCertification: 'Back to Certification',
    back: 'Back',
    soon: 'Soon',
    starting: 'Starting...',
    submitting: 'Submitting...',
    tryAgain: 'Try Again',
    next: 'Next',
    previous: 'Previous',
    pass: 'PASS',
    fail: 'FAIL',
    correct: 'Correct',
    incorrect: 'Incorrect',
    questions: (count: number) => `${count} Questions`
  },

  language: {
    label: 'Language',
    switcherAriaLabel: 'Change language',
    lockedDuringAttempt:
      'Language is fixed for this attempt — finish or leave it to switch.',
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
    certifications: 'Certifications',
    pricing: 'Pricing'
  },

  footer: {
    buyMeACoffee: 'Buy me a coffee',
    rights: (year: number) => `© ${year} CloudCertify. All rights reserved.`
  },

  auth: {
    continueWith: (provider: string) => `Continue with ${provider}`,
    profile: 'Profile',
    profileMenu: (name: string) => `Profile menu for ${name}`,
    logOut: 'Log out',
    signingIn: 'Signing you in...',
    failedTitle: "Login didn't work",
    failedBody:
      "We couldn't complete the sign-in — the login link was missing or expired. You can try again, or keep using CloudCertify without an account.",
    tryAgainFromDashboard: 'Try again from the Dashboard',
    goHome: 'Go Home'
  },

  levels: {
    foundational: 'Foundational',
    associate: 'Associate',
    specialist: 'Specialty',
    professional: 'Professional'
  },

  difficulty: {
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard'
  },

  home: {
    heroBadge: 'Free — no card, no account',
    heroTitleLead: 'Pass your',
    heroTitleCert: 'cert',
    heroTitleTail: 'the first time.',
    /**
     * Where the rotating provider chip sits relative to `heroTitleCert`:
     * "Pass your [AWS] cert" (EN) vs "Passe na sua certificação [AWS]" (PT).
     */
    heroTitleChipFirst: true,
    heroSubtitle:
      'Real exam-style questions, focused domain drills and full-length simulations for AWS, Google Cloud and Azure. Built to get you certified — not to upsell you.',
    heroPrimaryCta: 'Start learning',
    heroSecondaryCta: 'Browse certifications',
    heroMockQuestion:
      'Which service runs containers without managing servers or clusters?',
    heroFreeSticker: ['100%', 'free'],
    marquee: [
      'AWS Certified',
      'Google Cloud',
      'Microsoft Azure',
      'Practice Exams',
      'Domain Drills',
      'Pass First Try'
    ],
    stats: {
      questions: 'practice questions',
      paths: 'certification paths',
      providers: 'cloud providers',
      price: 'forever, no upsell'
    },
    roadmapEyebrow: 'The roadmap',
    roadmapTitle: 'Pick your path',
    roadmapSubtitle:
      'Start at the foundations and work up to the specialty exams — one provider at a time.',
    sampleTitle: 'Try a question',
    sampleSubtitle:
      'The real thing: exam-style stems, plausible distractors, instant feedback.',
    pricingTitle: 'Simple pricing',
    pricingSubtitle:
      'No subscriptions. No premium tiers. Just free cloud certification training.',
    pricingPeriod: '/ forever',
    pricingNote: 'No catches. Seriously.',
    pricingPerks: [
      'All AWS, GCP and Azure questions',
      'Full exam simulation mode',
      'No credit card required'
    ],
    pricingCta: 'Start learning now',
    featuresBadge: 'Why CloudCertify',
    featuresTitle: 'Focused on cloud certification success',
    featuresSubtitle:
      'Designed to help you pass certification exams across AWS, Google Cloud and Azure.',
    features: [
      {
        title: 'Multi-cloud question bank',
        body: 'Hundreds of practice questions covering AWS, Google Cloud and Azure certification exams.'
      },
      {
        title: 'Cloud concepts coverage',
        body: 'Concepts, services, security and pricing models across all three major providers.'
      },
      {
        title: 'Exam-focused learning',
        body: 'Questions aligned with the latest exam objectives and question formats.'
      }
    ],
    ctaCardTitle: 'Ready to get cloud certified?',
    ctaCardBody:
      'Take the first step towards your AWS, GCP or Azure certification today.',
    sampleQuestions: [
      {
        question:
          'Which AWS service would you use to run containers without managing servers or clusters?',
        options: ['Amazon ECS', 'Amazon EKS', 'AWS Fargate', 'AWS Lambda'],
        category: 'AWS Solutions Architect',
        difficulty: 'medium'
      },
      {
        question:
          'Which AWS service allows you to run code without provisioning or managing servers?',
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
          'Which Google Cloud service is used to store unstructured objects, similar to Amazon S3?',
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
          'Which Azure service provides serverless compute to run event-driven code without managing infrastructure?',
        options: [
          'Azure App Service',
          'Azure Functions',
          'Azure Logic Apps',
          'Azure Container Instances'
        ],
        category: 'Azure',
        difficulty: 'easy'
      }
    ] as SampleQuestion[]
  },

  roadmap: {
    emptyTier: 'No exams at this tier yet — check back soon.',
    providerSoon: 'This provider is launching soon. Get notified when it goes live.'
  },

  dashboard: {
    title: 'Dashboard',
    subtitle: 'Continue your cloud certification journey',
    loadError: 'Failed to load certifications. Please try again later.',
    empty: (provider: string) =>
      `No ${provider} certifications are available yet. Check back soon.`
  },

  progress: {
    eyebrow: 'Per-Quiz Progress',
    title: 'Know what to drill next.',
    subtitle:
      'Your current Domain standing and Exam movement, one Quiz at a time.',
    quizSelector: 'Selected Quiz',
    finishedExams: (count: number) =>
      count === 1 ? '1 finished Exam' : `${count} finished Exams`,
    finishedDrills: (count: number) =>
      count === 1 ? '1 finished Drill' : `${count} finished Drills`,
    signInTitle: 'Your history needs a home.',
    signInBody:
      'Sign in to claim past Submissions and see your weakest Domains, Drill Mix actions, and progress over time.',
    emptyTitle: 'No Progress yet.',
    emptyBody:
      'Finish an Exam or Drill and this page will turn that evidence into your next move.',
    browseQuizzes: 'Browse Quizzes',
    loadErrorTitle: 'Progress is unavailable.',
    loadErrorBody: 'We could not load your Quiz history. Please try again.',
    detailErrorBody:
      'We could not load Progress for this Quiz. Please try again.',
    nextMove: 'Your next move',
    leadTitle: (domain: string) => `Focus on ${domain}.`,
    leadBody: (standing: number, seen: number) =>
      `${standing}% Standing across ${seen} seen Questions. It is your weakest eligible Domain.`,
    buildBaselineTitle: 'Build a useful baseline.',
    buildBaselineBody:
      'Finish more Questions so CloudCertify can identify the Domain where a Drill Mix will help most.',
    startDomainDrill: (domain: string) => `Start ${domain} Drill Mix`,
    startExam: 'Start an Exam',
    nextExam: 'Start the next Exam',
    startExamError: 'Could not start the Exam. Please try again.',
    startDrillError: 'Could not start the Drill. Please try again.',
    currentStanding: 'Current standing',
    byDomain: 'By Domain',
    latestSnapshot: 'Latest snapshot',
    noDomains: 'Finish some Questions to establish Domain standing.',
    domainMeta: (index: number, seen: number) =>
      `Domain ${String(index).padStart(2, '0')} / ${seen} seen`,
    delta: (value: number) => `${value >= 0 ? '+' : ''}${value} pts`,
    standingLabel: (domain: string, standing: number) =>
      `${domain}: ${standing}% Standing`,
    movement: 'Movement',
    examScore: 'Exam percent correct',
    noExamEyebrow: 'No Exam baseline',
    firstExamTitle: 'Put the first point on the line.',
    firstExamBody:
      'Your Drill history already shapes Domain standing. Finish an Exam to start movement tracking.',
    baselineSet: 'Baseline set',
    baselineBody:
      'Finish one more Exam to see movement from this baseline. Your Domain standing is already useful now.',
    trendLabel: (first: number, last: number, count: number) =>
      `Exam percent correct moved from ${first}% to ${last}% across ${count} finished Exams`,
    finishedOnly: 'Finished Submissions only / newest 10 Exams'
  },

  certificationCard: {
    startLearning: 'Start Learning'
  },

  quizDetail: {
    emailLabel: 'Your email',
    emailPlaceholder: 'you@example.com',
    emailInvalid: 'Please enter a valid email address.',
    startExamError: 'Failed to start the exam. Please try again.',
    startPracticeError: 'Failed to start the drill. Please try again.',
    fullExamHeading: 'Full simulation exam',
    fullExamBody:
      "Full-length exam simulation. At the end you'll see your scaled score, whether you'd pass, and which domains need work.",
    questionsInPool: (count: number) => `${count} Questions in pool`,
    perExam: (range: string) => `~${range} per exam`,
    scaledScoreBadge: 'Scaled Score',
    passFailBadge: 'Pass / Fail',
    domainBreakdownBadge: 'Domain Breakdown',
    startExam: 'Start Exam',
    practiceHeading: 'Drills',
    practiceSubtitle:
      '15-question focused drills per domain. Fast feedback, no pass/fail pressure.',
    practice: 'Practice',
    notFound: 'Quiz not found.'
  },

  question: {
    counter: (index: number, total: number) => `Question ${index} of ${total}`,
    selectAnswers: (count: number) => `Select ${count} answers`,
    finishQuiz: 'Finish Quiz',
    check: 'Check',
    checking: 'Checking...',
    continue: 'Continue',
    finishPractice: 'Finish drill',
    finishing: 'Finishing...',
    notQuite: 'Not quite'
  },

  drill: {
    label: 'Built for you',
    composition: (missed: number, unseen: number, mastered: number) =>
      `${missed} review · ${unseen} new · ${mastered} refresh`,
    signInPitch: 'Sign in and your missed questions come back to you.',
    reviewedMissed: (count: number) =>
      count === 1
        ? "You just retook 1 question you'd missed before."
        : `You just retook ${count} questions you'd missed before.`
  },

  confidence: {
    label: 'How sure are you?',
    revisitHint: 'Marked to revisit before you finish.',
    options: {
      guess: 'Guess',
      unsure: 'Unsure',
      confident: 'Confident'
    }
  },

  navigator: {
    open: 'Open question navigator',
    openTitle: (index: number, total: number) =>
      `Open question navigator — question ${index} of ${total}`,
    close: 'Close question navigator',
    title: 'Questions',
    landmark: 'Question navigator',
    answeredCount: (answered: number, total: number) =>
      `${answered} of ${total} answered`,
    reviewCount: (count: number) =>
      count === 1 ? '1 to revisit' : `${count} to revisit`,
    questionLabel: (index: number, answered: boolean, needsReview = false) =>
      `Question ${index}${answered ? ', answered' : ', unanswered'}${
        needsReview ? ', marked to revisit' : ''
      }`
  },

  confirmFinish: {
    titleWithUnanswered: 'Finish with unanswered questions?',
    title: 'Finish this attempt?',
    bodyAllAnswered:
      "Your answers will be submitted for grading, and a finished attempt can't be changed.",
    bodyWithUnanswered: (count: number) =>
      count === 1
        ? "1 question is still unanswered. It will be scored as incorrect, and a finished attempt can't be changed."
        : `${count} questions are still unanswered. They will be scored as incorrect, and a finished attempt can't be changed.`,
    keepAnswering: 'Keep answering',
    finishAnyway: 'Finish anyway'
  },

  report: {
    trigger: 'Report a problem',
    reported: 'Problem reported',
    title: "What's wrong with this question?",
    reasonsHint: 'Pick everything that applies.',
    reasons: {
      wrong_answer_key: 'The marked answer is wrong',
      unclear_wording: "The question doesn't make sense",
      bad_explanation: "The explanation doesn't help",
      outdated: 'This is out of date'
    },
    suggest: {
      trigger: 'Suggest a fix',
      title: 'How should it read?',
      hint: 'Edit the question and mark the answers that should be correct.',
      questionLabel: 'Question',
      answerLabel: (index: number) => `Answer ${String.fromCharCode(65 + index)}`,
      correct: 'Correct',
      noChanges: 'No changes yet.',
      changes: (count: number) =>
        count === 1 ? '1 change to send' : `${count} changes to send`
    },
    commentLabel: 'Anything else? (optional)',
    commentPlaceholder: 'Tell us what looks off.',
    commentCounter: (used: number, max: number) => `${used}/${max}`,
    cancel: 'Cancel',
    submit: 'Send report',
    submitting: 'Sending...',
    success: 'Thanks — we will take a look at this question.',
    error: 'Could not send this report. Please try again.'
  },

  review: {
    summaryHeading: 'Question summary',
    reviewHeading: 'Question review',
    questionLabel: (index: number, text: string) => `Question ${index}: ${text}`,
    clickToView: (correct: boolean) =>
      `${correct ? 'Correct' : 'Incorrect'} — Click to view details`,
    explanation: 'Explanation',
    yourAnswer: '(Your answer)',
    correctAnswer: '(Correct answer)',
    ratedAs: (rating: string) => `You were: ${rating}`
  },

  results: {
    quizTitle: 'Quiz results',
    practiceTitle: 'Drill results',
    passingScore: (passed: boolean, score: string) =>
      `${passed ? 'PASS' : 'FAIL'} (Passing score: ${score})`,
    scoreLine: (correct: number, total: number) =>
      `You got ${correct} out of ${total} questions correct`,
    confidenceHeading: 'What your confidence says',
    luckyGuesses: 'Lucky guesses',
    luckyGuessesHint: 'Guessed, and got it right — worth studying anyway.',
    misconceptions: 'Misconceptions',
    misconceptionsHint: "You were sure, and you were wrong — start here.",
    domainBreakdown: 'Domain breakdown',
    domainStats: (correct: number, total: number, pct: number, weight: number) =>
      `${correct}/${total} (${pct}%) · weight ${weight}%`,
    restartQuiz: 'Restart Quiz',
    submitError:
      'Could not submit this attempt. It may already be finished — use "Try Again" to start a new one.',
    restartError: 'Could not start a new attempt. Please try again.',
    answerError: 'Could not save that answer. Check your connection and pick it again.',
    checkError: 'Could not check this answer. Please try again.',
    finishError: 'Could not finish this practice. Please try again.'
  },

  providers: {
    aws: 'Amazon Web Services',
    azure: 'Microsoft Azure',
    gcp: 'Google Cloud'
  }
};

export type Messages = typeof en;
