import { useCart } from '../context/CartContext';
import { useEffect, useRef, useState } from 'react';

export default function Toast() {
    const { lastAdded } = useCart();
    const [visible, setVisible] = useState(false);
    const [text, setText] = useState(null);
    const rafRef = useRef(null);
    const hideTimerRef = useRef(null);

    useEffect(() => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);

        if (lastAdded) {
            setText(lastAdded);
            rafRef.current = requestAnimationFrame(() => setVisible(true));
            return () => {
                if (rafRef.current) cancelAnimationFrame(rafRef.current);
            };
        }

        if (text) {
            setVisible(false);
            hideTimerRef.current = setTimeout(() => setText(null), 300);
            return () => clearTimeout(hideTimerRef.current);
        }

        return undefined;
    }, [lastAdded, text]);

    if (!text) return null;

    return (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 md:right-6 md:left-auto z-50 pointer-events-none">
            <div
                className={`pointer-events-auto flex items-center gap-3 bg-brand-600 text-white px-4 py-3 rounded-lg shadow-lg transform transition-all duration-300 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                role="status"
                aria-live="polite"
            >
                <svg width="36" height="36" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
                    <defs>
                        <linearGradient id="g1" x1="0" x2="1" y1="0" y2="1">
                            <stop offset="0%" stopColor="#ffb347" />
                            <stop offset="100%" stopColor="#ff5e62" />
                        </linearGradient>
                        <linearGradient id="g2" x1="0" x2="1">
                            <stop offset="0%" stopColor="#2f855a" />
                            <stop offset="100%" stopColor="#2b6cb0" />
                        </linearGradient>
                    </defs>
                    <g>
                        <path d="M32 8c-2 6-8 8-8 14 0 6 8 10 8 10s8-4 8-10c0-6-6-8-8-14z" fill="url(#g1)" />
                        <path d="M12 44c4 6 12 10 20 10s16-4 20-10H12z" fill="url(#g2)" />
                    </g>
                </svg>

                <div className="flex flex-col">
                    <span className="font-medium">Item added to cart</span>
                    <span className="text-sm text-white/90">{text}</span>
                </div>
            </div>
        </div>
    );
}
