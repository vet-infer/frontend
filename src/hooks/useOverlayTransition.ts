import { useEffect, useState } from "react";

type OverlayTransitionState = {
  shouldRender: boolean;
  isVisible: boolean;
};

export function useOverlayTransition(isOpen: boolean, durationMs = 160): OverlayTransitionState {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);
  const [renderedIsOpen, setRenderedIsOpen] = useState(isOpen);

  if (isOpen !== renderedIsOpen) {
    setRenderedIsOpen(isOpen);
    if (isOpen) {
      setShouldRender(true);
    } else {
      setIsVisible(false);
    }
  }

  useEffect(() => {
    if (!isOpen) {
      if (!shouldRender) {
        return;
      }

      const timeoutId = setTimeout(() => setShouldRender(false), durationMs);
      return () => clearTimeout(timeoutId);
    }

    let innerFrameId: number | undefined;
    const outerFrameId = requestAnimationFrame(() => {
      innerFrameId = requestAnimationFrame(() => setIsVisible(true));
    });

    return () => {
      cancelAnimationFrame(outerFrameId);
      if (innerFrameId !== undefined) {
        cancelAnimationFrame(innerFrameId);
      }
    };
  }, [isOpen, durationMs, shouldRender]);

  return { shouldRender, isVisible };
}
