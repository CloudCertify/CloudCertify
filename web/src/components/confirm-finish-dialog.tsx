import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';

type ConfirmFinishDialogProps = {
  open: boolean;
  unansweredCount: number;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Guard for finishing a full Quiz with unanswered questions — a Submission is
 * final and unanswered questions are scored wrong. Native <dialog> gives us
 * the focus trap and Esc-to-close for free.
 */
export function ConfirmFinishDialog({
  open,
  unansweredCount,
  onConfirm,
  onCancel
}: ConfirmFinishDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onCancel}
      className='m-auto w-full max-w-md rounded-[5px] border-4 border-black bg-white p-0 shadow-[8px_8px_0px_0px_#000] backdrop:bg-black/50'
    >
      <div className='border-b-2 border-black px-6 py-4'>
        <h2 className='text-xl font-black text-black'>Finish with unanswered questions?</h2>
      </div>
      <p className='px-6 py-4 font-medium text-black/80'>
        {unansweredCount === 1
          ? '1 question is still unanswered. It'
          : `${unansweredCount} questions are still unanswered. They`}{' '}
        will be scored as incorrect, and a finished attempt can't be changed.
      </p>
      <div className='flex justify-end gap-3 border-t-2 border-black px-6 py-4'>
        <Button variant='outline' onClick={onCancel}>
          Keep answering
        </Button>
        <Button onClick={onConfirm}>Finish anyway</Button>
      </div>
    </dialog>
  );
}
