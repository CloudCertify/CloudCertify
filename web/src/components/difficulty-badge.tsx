import { Badge } from '@/components/ui/badge';
import type { QuestionDifficulty } from '@/http/generated/api.schemas';

const difficultyClasses: Record<QuestionDifficulty, string> = {
  easy: 'bg-success text-black',
  medium: 'bg-warning text-black',
  hard: 'bg-destructive text-black'
};

const difficultyLabels: Record<QuestionDifficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard'
};

export function DifficultyBadge({
  difficulty
}: {
  difficulty?: QuestionDifficulty;
}) {
  if (!difficulty) return null;
  return (
    <Badge variant='outline' className={difficultyClasses[difficulty]}>
      {difficultyLabels[difficulty]}
    </Badge>
  );
}
