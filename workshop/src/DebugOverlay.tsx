import React from 'react';

const TapToggle: React.FC<{ onActivate: () => void }> = ({ onActivate }) => {
  const taps = React.useRef(0);
  const timer = React.useRef<ReturnType<typeof setTimeout>>();
  const handleTap = () => {
    taps.current += 1;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { taps.current = 0; }, 600);
    if (taps.current >= 3) { taps.current = 0; onActivate(); }
  };
  return (
    <div
      onPointerDown={handleTap}
      style={{ position: 'fixed', bottom: 0, right: 0, width: 60, height: 60, zIndex: 99998 }}
    />
  );
};

export const DebugOverlay: React.FC = () => {
  const [show, setShow] = React.useState(false);
  const [info, setInfo] = React.useState('');

  React.useEffect(() => {
    const apiKey = import.meta.env.VITE_FIREBASE_API_KEY ?? '(empty)';
    const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '(empty)';

    // Check if Tailwind CSS is actually applied
    const testEl = document.createElement('div');
    testEl.className = 'hidden';
    document.body.appendChild(testEl);
    const twWorks = window.getComputedStyle(testEl).display === 'none';
    document.body.removeChild(testEl);

    // List all loaded stylesheets
    const sheets = Array.from(document.styleSheets).map(s => {
      try { return s.href ?? '(inline)'; } catch { return '(blocked)'; }
    }).join('\n  ');

    setInfo(
      `href: ${window.location.href}\n` +
      `protocol: ${window.location.protocol}\n` +
      `pathname: ${window.location.pathname}\n` +
      `FIREBASE_API_KEY: ${String(apiKey).slice(0, 14)}...\n` +
      `FIREBASE_PROJECT_ID: ${projectId}\n` +
      `MODE: ${import.meta.env.MODE}\n` +
      `BASE_URL: ${import.meta.env.BASE_URL}\n` +
      `Tailwind works: ${twWorks}\n` +
      `CSS sheets:\n  ${sheets}`
    );
  }, []);

  return (
    <>
      <TapToggle onActivate={() => setShow(v => !v)} />
      {show && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 99999,
          background: 'rgba(0,0,0,0.92)', color: '#0f0', fontFamily: 'monospace',
          fontSize: 11, padding: 12, whiteSpace: 'pre-wrap', maxHeight: '50vh', overflow: 'auto'
        }}>
          <div style={{ color: '#ff0', marginBottom: 6, fontSize: 13 }}>🔍 DEBUG — tap ×3 bottom-right to close</div>
          {info}
        </div>
      )}
    </>
  );
};
