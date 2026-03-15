import type { ChatMode } from '../lib/types';

const MODES: { value: ChatMode; label: string }[] = [
  { value: 'chat', label: 'Chat' },
  { value: 'hybrid', label: 'Voice' },
  { value: 'voice', label: 'Live' },
];

interface Props {
  mode: ChatMode;
  onChange: (mode: ChatMode) => void;
}

export function ModeToggle({ mode, onChange }: Props) {
  return (
    <div className="so-mode-toggle" role="tablist" aria-label="Chat mode">
      {MODES.map((m) => (
        <button
          key={m.value}
          role="tab"
          aria-selected={mode === m.value}
          className={`so-mode-btn${mode === m.value ? ' so-mode-btn--active' : ''}`}
          onClick={() => onChange(m.value)}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
