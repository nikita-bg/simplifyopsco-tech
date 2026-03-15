import { useEffect } from 'react';
import { WaveformVisualizer } from './WaveformVisualizer';
import { useVoice } from '../hooks/useVoice';
import { useBridge } from '../hooks/useBridge';
import type { PageContext, Session } from '../lib/types';

interface Props {
  session: Session;
  pageContext?: PageContext;
  primaryColor?: string;
}

const STATUS_LABEL: Record<string, string> = {
  idle: 'Tap to start',
  connecting: 'Connecting...',
  listening: 'Listening...',
  speaking: 'Speaking...',
  error: 'Tap to retry',
};

export function VoiceView({ session, pageContext, primaryColor = '#6366f1' }: Props) {
  const { executeActions } = useBridge();
  const { status, error, analyser, start, stop, setActionsHandler } = useVoice(
    session.token,
    pageContext
  );

  useEffect(() => {
    setActionsHandler(executeActions);
  }, [executeActions, setActionsHandler]);

  // Stop voice session on unmount (e.g. user switches mode)
  useEffect(() => {
    return () => stop();
  }, [stop]);

  const isActive = status === 'listening' || status === 'speaking';
  const isConnecting = status === 'connecting';

  const handleClick = () => {
    if (status === 'idle' || status === 'error') {
      start();
    } else if (isActive) {
      stop();
    }
  };

  return (
    <div className="so-voice">
      <WaveformVisualizer
        analyser={analyser}
        color={primaryColor}
        active={isActive}
      />

      <button
        className={`so-mic-btn${isActive ? ' so-mic-btn--active' : ''}${isConnecting ? ' so-mic-btn--loading' : ''}`}
        onClick={handleClick}
        disabled={isConnecting}
        aria-label={isActive ? 'Stop voice session' : 'Start voice session'}
      >
        {/* Microphone icon */}
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>

        {/* Ripple rings when active */}
        {isActive && (
          <>
            <span className="so-mic-ring so-mic-ring--1" />
            <span className="so-mic-ring so-mic-ring--2" />
          </>
        )}
      </button>

      <p className="so-voice-label" aria-live="polite">
        {STATUS_LABEL[status] ?? 'Tap to start'}
      </p>

      {error && (
        <p className="so-voice-error" role="alert">
          {error}
        </p>
      )}

      {/* Fallback note when mic permission denied */}
      {status === 'error' && error?.includes('Permission') && (
        <p className="so-voice-hint">
          Please allow microphone access in your browser.
        </p>
      )}
    </div>
  );
}
