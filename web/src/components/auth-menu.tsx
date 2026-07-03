import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/auth/context';

function GoogleIcon() {
  return (
    <svg viewBox='0 0 24 24' className='h-4 w-4' aria-hidden='true'>
      <path
        fill='currentColor'
        d='M21.35 11.1H12v2.9h5.35c-.5 2.5-2.6 3.9-5.35 3.9a5.9 5.9 0 1 1 0-11.8c1.5 0 2.85.55 3.9 1.45l2.15-2.15A8.9 8.9 0 1 0 12 21c5.15 0 8.9-3.6 8.9-8.9 0-.35-.05-.7-.1-1z'
      />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox='0 0 24 24' className='h-4 w-4' aria-hidden='true'>
      <path
        fill='currentColor'
        d='M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.1.39-1.99 1.03-2.69-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.03a9.56 9.56 0 0 1 5 0c1.91-1.3 2.75-1.03 2.75-1.03.55 1.38.2 2.4.1 2.65.64.7 1.03 1.6 1.03 2.69 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.75c0 .27.18.58.69.48A10 10 0 0 0 12 2z'
      />
    </svg>
  );
}

/**
 * Header auth controls: "Continue with ..." entry points when anonymous,
 * name + avatar + logout when a User is logged in. Login stays optional —
 * this never blocks any anonymous flow.
 */
export function AuthMenu() {
  const { isAuthenticated, user, login, logout } = useAuth();

  if (!isAuthenticated) {
    return (
      <div className='flex items-center gap-2'>
        <Button variant='outline' size='sm' onClick={() => login('google')}>
          <GoogleIcon />
          <span className='ml-2 hidden sm:inline'>Continue with Google</span>
          <span className='ml-2 sm:hidden'>Google</span>
        </Button>
        <Button variant='outline' size='sm' onClick={() => login('github')}>
          <GitHubIcon />
          <span className='ml-2 hidden sm:inline'>Continue with GitHub</span>
          <span className='ml-2 sm:hidden'>GitHub</span>
        </Button>
      </div>
    );
  }

  return (
    <div className='flex items-center gap-3'>
      <div className='flex items-center gap-2'>
        {user?.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt=''
            className='h-8 w-8 rounded-[5px] border-2 border-black object-cover'
          />
        ) : (
          <div className='flex h-8 w-8 items-center justify-center rounded-[5px] border-2 border-black bg-primary text-sm font-black text-white'>
            {(user?.displayName ?? user?.email ?? '?').charAt(0).toUpperCase()}
          </div>
        )}
        <span className='hidden max-w-40 truncate text-sm font-bold text-black md:inline'>
          {user?.displayName ?? user?.email}
        </span>
      </div>
      <Button variant='outline' size='sm' onClick={logout} aria-label='Log out'>
        <LogOut className='h-4 w-4' />
        <span className='ml-2 hidden sm:inline'>Log out</span>
      </Button>
    </div>
  );
}
