import { Cloud, Coffee } from 'lucide-react';

export function Footer() {
  return (
    <footer className='w-full border-t-2 border-black py-6 md:py-0 bg-white'>
      <div className='container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row'>
        <div className='flex items-center gap-2 text-lg font-black'>
          <div className='h-8 w-8 rounded-[5px] border-2 border-black bg-primary flex items-center justify-center shadow-[2px_2px_0px_0px_#000]'>
            <Cloud className='h-4 w-4 text-white' />
          </div>
          <p className='text-black'>CloudCertify</p>
        </div>
        <div className='flex flex-col items-center gap-4 md:flex-row md:gap-6'>
          <a
            href='https://buymeacoffee.com/snowye'
            target='_blank'
            rel='noopener noreferrer'
            className='inline-flex items-center gap-2 rounded-[5px] border-2 border-black bg-[#FFDD00] px-4 py-2 text-sm font-black text-black shadow-[2px_2px_0px_0px_#000] transition-all hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_#000] active:translate-y-0 active:shadow-[1px_1px_0px_0px_#000]'
          >
            <Coffee className='h-4 w-4' />
            Buy me a coffee
          </a>
          <p className='text-center text-sm text-black/70 font-medium md:text-left'>
            &copy; {new Date().getFullYear()} CloudCertify. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
