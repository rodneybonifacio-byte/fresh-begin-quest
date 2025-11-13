import { useEffect, useState } from "react";

const breakpoints = {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
};

type Breakpoint = keyof typeof breakpoints;

export const useBreakpoint = (min?: Breakpoint, max?: Breakpoint) => {
    const [matches, setMatches] = useState(false);

    useEffect(() => {
        let query = '';

        if (min && max) {
            query = `(min-width: ${breakpoints[min]}px) and (max-width: ${breakpoints[max] - 1}px)`;
        } else if (min) {
            query = `(min-width: ${breakpoints[min]}px)`;
        } else if (max) {
            query = `(max-width: ${breakpoints[max] - 1}px)`;
        }

        const mediaQuery = window.matchMedia(query);

        const handleChange = () => setMatches(mediaQuery.matches);
        handleChange();

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [min, max]);

    return matches;
};
