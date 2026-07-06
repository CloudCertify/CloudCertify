import { BookOpen } from 'lucide-react';
import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'wouter';
import { capitalize, cn } from '@/lib/utils';
import { getLevelStyle } from '@/lib/quiz-level';

type CertificationCardProps = {
  title: string;
  description?: string;
  icon: ReactNode;
  difficulty: string;
  questions: number;
  available?: boolean;
  href?: string;
};

export function CertificationCard({
  title,
  description,
  icon,
  difficulty,
  questions,
  available = false,
  href
}: CertificationCardProps) {
  const level = getLevelStyle(difficulty);

  return (
    <Card className='flex flex-col overflow-hidden relative border-2 border-black shadow-[4px_4px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#000] transition-all pt-0'>
      <div className={cn('h-2 w-full border-b-2 border-black', level.bg)} />
      <CardHeader className='pb-0'>
        <div className='flex justify-center mb-4 relative'>
          <div className={cn('h-14 w-14 rounded-[5px] border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_0px_#000]', level.bg, level.ink)}>
            {icon}
          </div>
          {!available && (
            <Badge variant='secondary' className='absolute top-0 right-0'>
              Soon
            </Badge>
          )}
        </div>
        <CardTitle className='text-xl font-black text-black text-center text-balance'>{title}</CardTitle>
        {description ? (
          <CardDescription className='mt-2 text-center text-balance'>{description}</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className='flex-1' />
      <CardFooter className='flex flex-col gap-3'>
        <div className='flex justify-between items-center text-sm w-full'>
          <Badge className={cn('border-black', level.bg, level.ink)}>
            {capitalize(difficulty)}
          </Badge>
          <div className='flex items-center gap-1 font-medium text-black'>
            <span>{questions} Questions</span>
            <BookOpen className='h-4 w-4' />
          </div>
        </div>
        {available && href ? (
          <Button className='w-full' asChild>
            <Link href={href}>Start Learning</Link>
          </Button>
        ) : (
          <Button className='w-full' disabled={!available} variant='outline'>
            Soon
          </Button>
        )}
      </CardFooter>
      {!available && (
        <div className='absolute inset-0 bg-white/60 pointer-events-none' />
      )}
    </Card>
  );
}
