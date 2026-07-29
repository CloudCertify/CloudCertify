import { CheckCircle, XCircle } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion';
import { ConfidenceBadge } from '@/components/confidence-badge';
import { useI18n } from '@/i18n/context';
import type { QuizResultQuestionDto } from '@/http/generated/api.schemas';

type QuestionReviewProps = {
  questions: QuizResultQuestionDto[];
  /** Defaults to the localized "Question summary". */
  heading?: string;
};

export function QuestionReview({ questions, heading }: QuestionReviewProps) {
  const { t } = useI18n();

  return (
    <div className='space-y-6'>
      <h3 className='text-xl font-black text-black'>
        {heading ?? t.review.summaryHeading}
      </h3>
      <Accordion type='single' collapsible className='w-full'>
        {questions.map((question, index) => {
          const isCorrect = question.answers.every(a =>
            a.isCorrect ? a.wasSelected : !a.wasSelected
          );

          return (
            <AccordionItem key={question.id} value={`question-${question.id}`}>
              <AccordionTrigger className='hover:no-underline'>
                <div className='flex items-start gap-3 text-left'>
                  <div
                    className={`h-6 w-6 rounded-[5px] border-2 border-black flex items-center justify-center shrink-0 ${
                      isCorrect ? 'bg-success' : 'bg-destructive'
                    }`}
                  >
                    {isCorrect ? (
                      <CheckCircle className='h-4 w-4 text-black' />
                    ) : (
                      <XCircle className='h-4 w-4 text-black' />
                    )}
                  </div>
                  <div>
                    <p className='font-bold text-black'>
                      {t.review.questionLabel(index + 1, question.text ?? '')}
                    </p>
                    <p className='text-sm text-black/70 font-medium mt-1'>
                      {t.review.clickToView(isCorrect)}
                    </p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className='space-y-3 pt-2 pl-9'>
                  {/* Beside the explanation on purpose: the rating and the correction
                      belong together (ADR 0006). Absent when the question was unrated. */}
                  <ConfidenceBadge value={question.confidence} />
                  {question.explanation && (
                    <div className='p-3 rounded-[5px] border-2 border-black bg-background'>
                      <p className='text-sm font-bold text-black mb-1'>
                        {t.review.explanation}
                      </p>
                      <p className='text-sm text-black/80'>{question.explanation}</p>
                    </div>
                  )}
                  {question.answers.map(answer => {
                    const isCorrectAnswer = answer.isCorrect;
                    const isUserAnswer = answer.wasSelected;

                    let bgColor = 'bg-white';
                    if (isUserAnswer && isCorrectAnswer) bgColor = 'bg-success/15';
                    else if (isUserAnswer && !isCorrectAnswer) bgColor = 'bg-destructive/15';
                    else if (!isUserAnswer && isCorrectAnswer) bgColor = 'bg-success/15';

                    return (
                      <div
                        key={answer.id}
                        className={`p-3 rounded-[5px] border-2 border-black flex items-start gap-2 ${bgColor}`}
                      >
                        <div
                          className={`w-6 h-6 rounded-[5px] flex items-center justify-center border-2 border-black mt-0.5 shrink-0 ${
                            isCorrectAnswer || isUserAnswer
                              ? 'bg-black text-white'
                              : 'bg-white'
                          }`}
                        >
                          {isCorrectAnswer && <CheckCircle className='h-3 w-3' />}
                          {isUserAnswer && !isCorrectAnswer && (
                            <XCircle className='h-3 w-3' />
                          )}
                        </div>
                        <div className='flex-1'>
                          <span className='font-medium text-black'>{answer.text}</span>
                          {isUserAnswer && (
                            <span className='ml-2 text-sm font-bold text-black/70'>
                              {t.review.yourAnswer}
                            </span>
                          )}
                          {isCorrectAnswer && (
                            <span className='ml-2 text-sm font-bold text-black'>
                              {t.review.correctAnswer}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
