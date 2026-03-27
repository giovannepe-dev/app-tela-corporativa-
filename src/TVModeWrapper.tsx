import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import DevicePairing from './pages/DevicePairing';

/**
 * Este wrapper garante que QUALQUER rota seja interceptada
 * e redirecionada para DevicePairing em TV Mode
 */
export default function TVModeWrapper({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // SEMPRE redireciona para /pair se não estiver lá
    if (location.pathname !== '/pair' && location.pathname !== '/player' && !location.pathname.startsWith('/player/')) {
      console.log('📺 TV Mode Wrapper: Redirecting from', location.pathname, 'to /pair');
      navigate('/pair', { replace: true });
    }
  }, [location.pathname, navigate]);

  // Se está em rota permitida, renderiza filhos
  if (location.pathname === '/pair' || location.pathname === '/player' || location.pathname.startsWith('/player/')) {
    return <>{children}</>;
  }

  // Default: sempre mostra pareamento
  return <DevicePairing />;
}
