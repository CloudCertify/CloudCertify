import { QuizLevel } from '@/http/generated/api.schemas';

type LevelStyle = {
  /** Solid fill for accent surfaces (strips, icon tiles, markers). */
  bg: string;
  /** Ink color readable on top of `bg`. */
  ink: string;
};

// Difficulty ladder shares the roadmap tier colors; professional gets its
// own color so all four levels are distinguishable at a glance.
const LEVEL_STYLES: Record<QuizLevel, LevelStyle> = {
  foundational: { bg: 'bg-success', ink: 'text-white' },
  associate: { bg: 'bg-primary', ink: 'text-white' },
  specialist: { bg: 'bg-secondary', ink: 'text-black' },
  professional: { bg: 'bg-destructive', ink: 'text-white' }
};

const FALLBACK_STYLE: LevelStyle = { bg: 'bg-primary', ink: 'text-white' };

/** Difficulty ladder, easiest first. Drives roadmap/path ordering. */
export const LEVEL_ORDER: QuizLevel[] = [
  'foundational',
  'associate',
  'specialist',
  'professional'
];

/**
 * Official English tier names. Never localized: a certification's level is part
 * of its name (AWS Certified Solutions Architect – Associate), and the name
 * itself isn't translated either.
 */
export const LEVEL_LABELS: Record<QuizLevel, string> = {
  foundational: 'Foundational',
  associate: 'Associate',
  specialist: 'Specialty',
  professional: 'Professional'
};

export function getLevelStyle(level?: string | null): LevelStyle {
  return LEVEL_STYLES[level as QuizLevel] ?? FALLBACK_STYLE;
}
