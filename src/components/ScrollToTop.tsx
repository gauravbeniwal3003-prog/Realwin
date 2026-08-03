import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const ScrollToTop = () => {
  const { pathname, search } = useLocation();

  useEffect(() => {
    // Immediate scroll to top across window and root document elements
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;

    // Reset scroll on any inner scrollable containers
    const scrollableEls = document.querySelectorAll('main, div, section');
    scrollableEls.forEach(el => {
      if (el.scrollTop > 0) {
        el.scrollTop = 0;
      }
    });

    // Timeout fallback for async page rendering or image loads
    const timer = setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;
    }, 20);

    return () => clearTimeout(timer);
  }, [pathname, search]);

  return null;
};

