import { useEffect } from 'react';
import { useLocation } from 'react-router';

export function ScrollToTopOnNavigate() {
  const { pathname } = useLocation();
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  
  return null;
}
