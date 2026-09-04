import { Languages } from 'lucide-react';
import {
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n/use-i18n';
import { LANGUAGES } from '@/i18n/language';

type LanguageSwitcherProps = {
  /**
   * True while an attempt is running: a Submission's Language is fixed at
   * start, so switching mid-attempt would only desync the UI from the served
   * questions (CONTEXT.md → Language).
   */
  locked?: boolean;
  className?: string;
};

/** Segmented EN / PT control. Drives `Accept-Language` for every later request. */
export function LanguageSwitcher({ locked = false, className }: LanguageSwitcherProps) {
  const { language, setLanguage, t } = useI18n();

  return (
    <div
      role='group'
      aria-label={t.language.switcherAriaLabel}
      title={locked ? t.language.lockedDuringAttempt : t.language.label}
      className={cn(
        'inline-flex items-center gap-1 rounded-none border-2 border-black bg-white p-1 shadow-[2px_2px_0px_0px_#000]',
        locked && 'opacity-60',
        className
      )}
    >
      <Languages className='ml-1 h-4 w-4 shrink-0 text-black' aria-hidden='true' />
      {LANGUAGES.map(code => {
        const isActive = code === language;
        return (
          <button
            key={code}
            type='button'
            lang={code}
            disabled={locked}
            aria-pressed={isActive}
            aria-label={t.language.names[code]}
            onClick={() => setLanguage(code)}
            className={cn(
              'rounded-none border-2 px-2 py-0.5 text-xs font-black transition-all',
              isActive
                ? 'border-black bg-primary text-white'
                : 'border-transparent text-black hover:bg-background',
              locked ? 'cursor-not-allowed' : 'cursor-pointer'
            )}
          >
            {t.language.short[code]}
          </button>
        );
      })}
    </div>
  );
}

/**
 * The same segmented control adapted to a menu's roving-focus semantics, so
 * arrow keys reach both language choices without dismissing the menu.
 */
export function MenuLanguageSwitcher({ locked = false }: { locked?: boolean }) {
  const { language, setLanguage, t } = useI18n();

  const changeLanguage = (value: string) => {
    if (value === 'en-US' || value === 'pt-BR') setLanguage(value);
  };

  return (
    <div
      role='group'
      aria-label={t.language.switcherAriaLabel}
      title={locked ? t.language.lockedDuringAttempt : t.language.label}
      className={cn(
        'flex items-center gap-1 rounded-none border-2 border-black bg-white p-1 shadow-[2px_2px_0px_0px_#000]',
        locked && 'opacity-60'
      )}
    >
      <Languages className='ml-1 h-4 w-4 shrink-0' aria-hidden='true' />
      <DropdownMenuRadioGroup
        value={language}
        onValueChange={changeLanguage}
        className='flex items-center gap-1'
      >
        {LANGUAGES.map(code => {
          const isActive = code === language;
          return (
            <DropdownMenuRadioItem
              key={code}
              value={code}
              disabled={locked}
              aria-label={t.language.names[code]}
              onSelect={event => event.preventDefault()}
              className={cn(
                'h-auto rounded-none border-2 px-2 py-0.5 text-xs font-black',
                isActive
                  ? 'border-black bg-primary text-white focus:bg-primary'
                  : 'border-transparent text-black focus:bg-background focus:text-black',
                locked ? 'cursor-not-allowed' : 'cursor-pointer'
              )}
            >
              {t.language.short[code]}
            </DropdownMenuRadioItem>
          );
        })}
      </DropdownMenuRadioGroup>
    </div>
  );
}
