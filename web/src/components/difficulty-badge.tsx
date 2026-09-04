import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/i18n/use-i18n';
import type { QuestionDifficulty } from '@/http/generated/api.schemas';

const difficultyClasses: Record<QuestionDifficulty, string> = {
  easy: 'bg-success text-black',
  medium: 'bg-warning text-black',
  hard: 'bg-destructive text-black'
};

export function DifficultyBadge({
  difficulty
}: {
  difficulty?: QuestionDifficulty;
}) {
  const { t } = useI18n();
  if (!difficulty) return null;
  return (
    <Badge variant='outline' className={difficultyClasses[difficulty]}>
      {t.difficulty[difficulty]}
    </Badge>
  );
}
