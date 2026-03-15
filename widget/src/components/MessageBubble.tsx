import type { Message } from '../lib/types';

interface Props {
  message: Message;
}

export function MessageBubble({ message }: Props) {
  return (
    <div className={`so-bubble so-bubble--${message.role}`}>
      <p className="so-bubble-text">
        {message.content}
        {message.isStreaming && message.content && (
          <span className="so-cursor" aria-hidden="true" />
        )}
      </p>
      {message.isStreaming && !message.content && (
        <span className="so-streaming-dots" aria-label="Typing">
          <span />
          <span />
          <span />
        </span>
      )}
    </div>
  );
}
