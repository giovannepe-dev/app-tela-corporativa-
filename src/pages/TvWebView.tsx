import { useEffect } from 'react';

export default function TvWebView() {
  useEffect(() => {
    // Redirect to Lovable app for TV display
    window.location.href = 'https://comfort-craft-engine.lovable.app';
  }, []);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: '#000',
      color: '#fff',
      fontSize: '24px'
    }}>
      Carregando Comfort Craft Engine...
    </div>
  );
}
