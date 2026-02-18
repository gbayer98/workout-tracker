"use client";

interface SanityCheckModalProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function SanityCheckModal({
  message,
  onConfirm,
  onCancel,
}: SanityCheckModalProps) {
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-card-border rounded-xl p-6 max-w-sm w-full space-y-4">
        <p className="text-foreground text-base leading-relaxed">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 bg-primary text-white font-medium rounded-lg hover:bg-primary-hover transition-colors"
          >
            Yes, I&apos;m sure
          </button>
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 border border-card-border text-muted hover:text-foreground rounded-lg transition-colors"
          >
            Let me fix that
          </button>
        </div>
      </div>
    </div>
  );
}
