import { ModeToggle } from './ModeToggle';
import type { AgentConfig, ChatMode } from '../lib/types';

interface Props {
  config: AgentConfig | null;
  mode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
}

export function WidgetHeader({ config, mode, onModeChange }: Props) {
  return (
    <header className="so-header">
      <div className="so-header-brand">
        {config?.logoUrl && (
          <img
            src={config.logoUrl}
            alt=""
            className="so-logo"
            aria-hidden="true"
          />
        )}
        <span className="so-business-name">
          {config?.businessName ?? 'AI Assistant'}
        </span>
      </div>
      <ModeToggle mode={mode} onChange={onModeChange} />
    </header>
  );
}
