"use client";

// Lazy-mount heavy WebGL only when it nears the viewport. Caps the number of live
// canvases (60fps on weak/projector GPUs) AND times each canvas's entrance
// animation to when the viewer actually arrives at it.
import { useEffect, useRef, useState } from "react";

export default function MountWhenNear({
  children,
  rootMargin = "120px",
  className,
}: {
  children: React.ReactNode;
  rootMargin?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShow(true);
          io.disconnect();
        }
      },
      { rootMargin }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);

  return (
    <div ref={ref} className={className}>
      {show ? children : null}
    </div>
  );
}
