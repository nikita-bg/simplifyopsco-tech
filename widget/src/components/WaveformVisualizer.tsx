import { useEffect, useRef } from 'react';

interface Props {
  analyser: AnalyserNode | null;
  /** Color of the bars — defaults to current CSS --so-primary */
  color?: string;
  active?: boolean;
}

const BAR_COUNT = 32;

/**
 * Canvas-based waveform visualizer.
 * When active=false or analyser is null, renders a static idle animation.
 */
export function WaveformVisualizer({ analyser, color = '#6366f1', active = true }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const barW = W / BAR_COUNT - 2;
    let phase = 0;

    const dataArray = analyser
      ? new Uint8Array(analyser.frequencyBinCount)
      : null;

    const draw = () => {
      animRef.current = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, W, H);

      if (analyser && dataArray && active) {
        // Live frequency data
        analyser.getByteFrequencyData(dataArray);
        const step = Math.floor(dataArray.length / BAR_COUNT);

        for (let i = 0; i < BAR_COUNT; i++) {
          const value = dataArray[i * step] / 255;
          const barH = Math.max(3, value * H);
          const x = i * (barW + 2);
          const y = (H - barH) / 2;
          ctx.fillStyle = color;
          ctx.globalAlpha = 0.4 + value * 0.6;
          ctx.beginPath();
          ctx.roundRect(x, y, barW, barH, 2);
          ctx.fill();
        }
      } else {
        // Idle: gentle sine wave animation
        phase += 0.05;
        for (let i = 0; i < BAR_COUNT; i++) {
          const value = (Math.sin(phase + i * 0.4) + 1) / 2;
          const barH = 4 + value * (H * 0.35);
          const x = i * (barW + 2);
          const y = (H - barH) / 2;
          ctx.fillStyle = color;
          ctx.globalAlpha = 0.2 + value * 0.2;
          ctx.beginPath();
          ctx.roundRect(x, y, barW, barH, 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [analyser, color, active]);

  return (
    <canvas
      ref={canvasRef}
      className="so-waveform"
      width={280}
      height={64}
      aria-hidden="true"
    />
  );
}
