/**
 * Widget Embed Page
 *
 * This page is loaded inside the iframe created by widget.js
 * It renders the VoiceWidget component in an isolated environment
 *
 * URL: /widget/embed?api_key=so_live_...
 */

import { Suspense } from 'react';
import { VoiceWidgetEmbed } from '@/components/widget/VoiceWidgetEmbed';

export const runtime = 'edge'; // Deploy to Edge for low latency

export default function WidgetEmbedPage() {
  return (
    <Suspense fallback={<WidgetLoadingState />}>
      <VoiceWidgetEmbed />
    </Suspense>
  );
}

function WidgetLoadingState() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100vh',
        background: 'transparent',
      }}
    >
      <div
        style={{
          width: '40px',
          height: '40px',
          border: '3px solid rgba(37, 106, 244, 0.2)',
          borderTop: '3px solid #256AF4',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
