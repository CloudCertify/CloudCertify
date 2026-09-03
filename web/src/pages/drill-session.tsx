import { useState, useEffect } from 'react';
import { Link, useLocation, useParams } from 'wouter';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { PracticeQuestionCard } from '@/components/practice-question-card';
import type { PracticePhase } from '@/components/practice-question-card';
import { QuestionReview } from '@/components/question-review';
import { DrillBanner } from '@/components/drill-banner';
import { ReportQuestionControl } from '@/components/report-question-control';
import { Footer } from '@/components/footer';
import { AppHeader } from '@/components/app-header';
import { PageBackLink } from '@/components/page-back-link';
import { useI18n } from '@/i18n/context';
import { toast } from 'sonner';
import {
  postQuizQuizIdDrillsDrillIdStart,
  postQuizQuizIdDrillsDrillIdCheck,
  postQuizQuizIdDrillsDrillIdFinish
} from '@/http/generated/api';

// Drill attempts are scored as a 0–100 percentage; pass is server-decided (issue #10).
const PASS_THRESHOLD = 70;
import type {
  DrillDetailDto,
  CheckAnswerResponseDto,
  QuizResultQuestionDto
} from '@/http/generated/api.schemas';

type SessionData = {
  drillDetail: DrillDetailDto;
  email: string | null;
};

type Phase = 'quiz' | 'results';

export function DrillSessionPage() {
  const params = useParams<{ id: string; drillId: string }>();
  const quizId = Number(params.id);
  const drillId = Number(params.drillId);
  const [, navigate] = useLocation();
  const { t } = useI18n();

  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [phase, setPhase] = useState<Phase>('quiz');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  // Per-question reveal state machine: `answering` until Check, then `revealed`.
  const [questionPhase, setQuestionPhase] =
    useState<PracticePhase>('answering');
  const [reveal, setReveal] = useState<CheckAnswerResponseDto | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [passed, setPassed] = useState(false);
  const [correctCount, setCorrectCount] = useState<number | null>(null);
  const [totalQuestions, setTotalQuestions] = useState<number | null>(null);
  const [resultQuestions, setResultQuestions] = useState<
    QuizResultQuestionDto[] | null
  >(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  // One Report per (Submission, Question): a Question reported in-session must
  // already read as reported when it comes back on the results list (#41).
  const [reportedQuestionIds, setReportedQuestionIds] = useState<number[]>([]);

  const markReported = (questionId: number) =>
    setReportedQuestionIds(current =>
      current.includes(questionId) ? current : [...current, questionId]
    );

  useEffect(() => {
    const raw = sessionStorage.getItem(`drill-session-${quizId}-${drillId}`);
    if (!raw) {
      navigate(`/quiz/${quizId}`);
      return;
    }
    try {
      setSessionData(JSON.parse(raw));
    } catch {
      navigate(`/quiz/${quizId}`);
    }
  }, [quizId, drillId, navigate]);

  if (!sessionData) return null;

  const { drillDetail, email } = sessionData;
  const questions = drillDetail.questions ?? [];
  const questionsCount = questions.length;
  const currentQuestion = questions[currentIndex];

  const isLast = currentIndex >= questionsCount - 1;

  const handleAnswerSelect = (answerId: number) => {
    // Options lock once Checked; ignore any clicks while revealed.
    if (questionPhase === 'revealed') return;
    const type = currentQuestion.type;
    const selectCount = currentQuestion.selectCount ?? 1;

    setSelectedIds(current => {
      if (type === 'multiple_response') {
        if (current.includes(answerId)) {
          return current.filter(id => id !== answerId);
        }
        if (current.length >= selectCount) return current;
        return [...current, answerId];
      }
      return [answerId];
    });
  };

  const handleCheck = async () => {
    if (currentQuestion.id == null) return;
    setIsChecking(true);
    try {
      const res = await postQuizQuizIdDrillsDrillIdCheck(quizId, drillId, {
        submissionId: drillDetail.submissionId,
        questionId: currentQuestion.id,
        answerIds: selectedIds
      });
      setReveal(res.data);
      setQuestionPhase('revealed');
    } catch {
      // Leave the question in `answering` so the learner can retry the Check.
      toast.error(t.results.checkError);
    } finally {
      setIsChecking(false);
    }
  };

  const finishDrill = async () => {
    setIsFinishing(true);
    try {
      const res = await postQuizQuizIdDrillsDrillIdFinish(quizId, drillId, {
        submissionId: drillDetail.submissionId
      });
      setScore(res.data.score);
      setPassed(res.data.passed);
      setCorrectCount(res.data.correctCount);
      setTotalQuestions(res.data.totalQuestions);
      setResultQuestions(res.data.questions);
      setPhase('results');
    } catch {
      // Keep the session intact so Continue can be retried.
      toast.error(t.results.finishError);
    } finally {
      setIsFinishing(false);
    }
  };

  const handleContinue = () => {
    if (isLast) {
      finishDrill();
      return;
    }
    // Advance to the next question and reset its reveal state. No going back.
    setCurrentIndex(i => i + 1);
    setSelectedIds([]);
    setReveal(null);
    setQuestionPhase('answering');
  };

  const handleTryAgain = async () => {
    setIsRestarting(true);
    try {
      const res = await postQuizQuizIdDrillsDrillIdStart(quizId, drillId, {
        email
      });
      const newData: SessionData = { drillDetail: res.data, email };
      sessionStorage.setItem(
        `drill-session-${quizId}-${drillId}`,
        JSON.stringify(newData)
      );
      setSessionData(newData);
      setCurrentIndex(0);
      setSelectedIds([]);
      setReveal(null);
      setQuestionPhase('answering');
      setScore(null);
      setPassed(false);
      setCorrectCount(null);
      setTotalQuestions(null);
      setResultQuestions(null);
      // A new Submission may report the same Questions again.
      setReportedQuestionIds([]);
      setPhase('quiz');
    } catch {
      toast.error(t.results.restartError);
    } finally {
      setIsRestarting(false);
    }
  };

  if (phase === 'results') {
    const total = totalQuestions ?? 0;
    const correct = correctCount ?? 0;
    // Server-authoritative 0–100 score; fall back to a local ratio only if absent.
    const percentage =
      score ?? (total > 0 ? Math.round((correct / total) * 100) : 0);
    const scoreColor =
      percentage >= 80 ? '#15a06e' : percentage >= 60 ? '#ffb020' : '#e23b48';
    // Amber reads with black ink; the darker green/red bands take white.
    const scoreInk =
      percentage >= 60 && percentage < 80 ? 'text-black' : 'text-white';

    return (
      <div className='flex min-h-dvh flex-col bg-background'>
        <AppHeader />
        <main className='flex-1 container max-w-4xl mx-auto py-12 px-4'>
          <PageBackLink href={`/quiz/${quizId}`} className='mb-6'>
            {t.common.backToCertification}
          </PageBackLink>
          <Card className='w-full border-4 border-black shadow-[8px_8px_0px_0px_#000]'>
            <CardHeader className='text-center border-b-2 border-black pb-6'>
              <CardTitle className='text-2xl md:text-3xl font-black text-black'>
                {t.results.practiceTitle}
              </CardTitle>
              <p className='text-black/70 font-medium mt-1'>
                {drillDetail.title}
              </p>
              {drillDetail.domain && (
                <div className='flex justify-center mt-2'>
                  <Badge
                    variant='outline'
                    className='border-2 border-black font-bold'
                  >
                    {drillDetail.domain}
                  </Badge>
                </div>
              )}
            </CardHeader>
            <CardContent className='space-y-8 py-8'>
              <div className='flex flex-col items-center space-y-4'>
                <div
                  className='h-32 w-32 rounded-[5px] border-4 border-black flex items-center justify-center shadow-[4px_4px_0px_0px_#000]'
                  style={{ backgroundColor: scoreColor }}
                >
                  <span className={`text-5xl font-black ${scoreInk}`}>
                    {percentage}%
                  </span>
                </div>
                <Badge className={passed ? 'bg-success' : 'bg-destructive'}>
                  {t.results.passingScore(passed, `${PASS_THRESHOLD}%`)}
                </Badge>
                <p className='text-xl font-bold text-black'>
                  {t.results.scoreLine(correct, total)}
                </p>
                <div className='w-full max-w-md'>
                  <Progress value={percentage} />
                </div>
              </div>

              {/* After the Check the same fact is a reward, not a prime (issue #53): over the
                  review it lands as a win, and an anonymous visitor sees the pitch here too. */}
              <DrillBanner
                composition={drillDetail.composition}
                place='review'
              />

              <QuestionReview
                questions={resultQuestions ?? []}
                heading={t.review.reviewHeading}
                renderReportControl={question =>
                  drillDetail.submissionId == null ? null : (
                    <ReportQuestionControl
                      submissionId={drillDetail.submissionId}
                      questionId={question.id}
                      reported={reportedQuestionIds.includes(question.id)}
                      onReported={markReported}
                      suggestable={{
                        text: question.text,
                        answers: question.answers.map(answer => ({
                          id: answer.id,
                          text: answer.text ?? '',
                          isCorrect: answer.isCorrect
                        }))
                      }}
                    />
                  )
                }
              />
            </CardContent>
            <CardFooter className='flex flex-col sm:flex-row gap-4 justify-between border-t-2 border-black pt-6'>
              <Button
                variant='outline'
                onClick={handleTryAgain}
                disabled={isRestarting}
              >
                {isRestarting ? t.common.starting : t.common.tryAgain}
              </Button>
              <Button asChild>
                <Link href={`/quiz/${quizId}`}>
                  {t.common.backToCertification}
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className='flex min-h-dvh flex-col bg-background'>
      <AppHeader languageLocked />
      <main className='flex-1 container max-w-4xl mx-auto py-12 px-4'>
        <PageBackLink href={`/quiz/${quizId}`} className='mb-6'>
          {t.common.back}
        </PageBackLink>
        {/* Only before the first answer: once the drill is under way the slot has said its
            piece, and repeating it would just be noise. */}
        {currentIndex === 0 && questionPhase === 'answering' && (
          <DrillBanner composition={drillDetail.composition} />
        )}
        <PracticeQuestionCard
          index={currentIndex}
          total={questionsCount}
          question={currentQuestion}
          meta={<Badge>{drillDetail.title}</Badge>}
          selectedIds={selectedIds}
          onSelect={handleAnswerSelect}
          phase={questionPhase}
          reveal={reveal}
          onCheck={handleCheck}
          onContinue={handleContinue}
          isChecking={isChecking}
          isFinishing={isFinishing}
          isLast={isLast}
          reportControl={
            currentQuestion.id != null &&
            drillDetail.submissionId != null && (
              <ReportQuestionControl
                submissionId={drillDetail.submissionId}
                questionId={currentQuestion.id}
                reported={reportedQuestionIds.includes(currentQuestion.id)}
                onReported={markReported}
                // The key only exists after the Check, which is also the only
                // moment this control is rendered (issue #41).
                suggestable={
                  reveal == null
                    ? undefined
                    : {
                        text: currentQuestion.text ?? '',
                        answers: (currentQuestion.answers ?? [])
                          .filter(answer => answer.id != null)
                          .map(answer => ({
                            id: answer.id!,
                            text: answer.text ?? '',
                            isCorrect: (reveal.correctAnswerIds ?? []).includes(
                              answer.id!
                            )
                          }))
                      }
                }
              />
            )
          }
        />
      </main>
      <Footer />
    </div>
  );
}
