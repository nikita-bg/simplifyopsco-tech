import { useState, useCallback, useRef } from 'react';
import { getVoiceToken } from '../lib/api';
import type { PageContext, SiteAction, SiteActionType } from '../lib/types';

export type VoiceStatus =
  | 'idle'
  | 'connecting'
  | 'listening'
  | 'speaking'
  | 'error';

interface RealtimeEvent {
  type: string;
  call_id?: string;
  name?: string;
  arguments?: string;
  delta?: string;
  audio?: string;
}

const OPENAI_REALTIME_URL =
  'https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17';

/** Maps OpenAI function call names → SiteActionType */
const FUNCTION_ACTION_MAP: Record<string, SiteActionType> = {
  scrollToElement: 'scrollToElement',
  highlightElement: 'highlightElement',
  navigateTo: 'navigateTo',
  showProductCard: 'showProductCard',
  showComparison: 'showComparison',
  openContactForm: 'openContactForm',
};

export function useVoice(token: string | null, pageContext?: PageContext) {
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const onActionsRef = useRef<((actions: SiteAction[]) => void) | null>(null);

  const setActionsHandler = useCallback(
    (handler: (actions: SiteAction[]) => void) => {
      onActionsRef.current = handler;
    },
    []
  );

  /** Handle incoming function calls from OpenAI Realtime API */
  const handleFunctionCall = useCallback(
    (callId: string, name: string, argsJson: string) => {
      const actionType = FUNCTION_ACTION_MAP[name];
      if (!actionType || !onActionsRef.current) return;

      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(argsJson) as Record<string, unknown>;
      } catch {
        // ignore malformed args
      }

      const action: SiteAction = { type: actionType, ...args } as SiteAction;
      onActionsRef.current([action]);

      // Send function result back to OpenAI so it can continue
      dcRef.current?.send(
        JSON.stringify({
          type: 'conversation.item.create',
          item: {
            type: 'function_call_output',
            call_id: callId,
            output: JSON.stringify({ success: true }),
          },
        })
      );
      dcRef.current?.send(JSON.stringify({ type: 'response.create' }));
    },
    []
  );

  /** Handle events received on the WebRTC data channel */
  const handleRealtimeEvent = useCallback(
    (event: RealtimeEvent) => {
      switch (event.type) {
        case 'response.audio.delta':
          setStatus('speaking');
          break;
        case 'response.audio.done':
          setStatus('listening');
          break;
        case 'response.function_call_arguments.done':
          if (event.call_id && event.name && event.arguments !== undefined) {
            handleFunctionCall(event.call_id, event.name, event.arguments);
          }
          break;
        case 'error':
          setError('Voice error — switching to chat mode');
          setStatus('error');
          break;
      }
    },
    [handleFunctionCall]
  );

  const start = useCallback(async () => {
    if (!token || status !== 'idle') return;
    setStatus('connecting');
    setError(null);

    try {
      // 1. Get ephemeral key from our backend
      const { ephemeralKey } = await getVoiceToken(token, pageContext);

      // 2. Set up peer connection
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      // 3. Play remote audio (agent's voice)
      const remoteAudio = document.createElement('audio');
      remoteAudio.autoplay = true;
      pc.ontrack = (e) => {
        remoteAudio.srcObject = e.streams[0];

        // Hook up analyser for waveform on agent's audio stream
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;
        const source = ctx.createMediaStreamSource(e.streams[0]);
        const node = ctx.createAnalyser();
        node.fftSize = 256;
        source.connect(node);
        setAnalyser(node);
      };

      // 4. Capture microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // Hook up analyser for microphone waveform (when not yet speaking)
      if (!audioCtxRef.current) {
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;
        const micSource = ctx.createMediaStreamSource(stream);
        const node = ctx.createAnalyser();
        node.fftSize = 256;
        micSource.connect(node);
        setAnalyser(node);
      }

      // 5. Data channel for control events
      const dc = pc.createDataChannel('oai-events');
      dcRef.current = dc;

      dc.onopen = () => setStatus('listening');
      dc.onmessage = (e) => {
        try {
          handleRealtimeEvent(JSON.parse(e.data as string) as RealtimeEvent);
        } catch {
          // skip malformed events
        }
      };

      // 6. Create SDP offer and exchange with OpenAI
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpRes = await fetch(OPENAI_REALTIME_URL, {
        method: 'POST',
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${ephemeralKey}`,
          'Content-Type': 'application/sdp',
        },
      });

      if (!sdpRes.ok) throw new Error(`SDP exchange failed: ${sdpRes.status}`);

      const answer: RTCSessionDescriptionInit = {
        type: 'answer',
        sdp: await sdpRes.text(),
      };
      await pc.setRemoteDescription(answer);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to start voice';
      setError(msg);
      setStatus('error');
    }
  }, [token, status, pageContext, handleRealtimeEvent]);

  const stop = useCallback(() => {
    dcRef.current?.close();
    pcRef.current?.close();
    audioCtxRef.current?.close();
    pcRef.current = null;
    dcRef.current = null;
    audioCtxRef.current = null;
    setAnalyser(null);
    setStatus('idle');
    setError(null);
  }, []);

  return { status, error, analyser, start, stop, setActionsHandler };
}
