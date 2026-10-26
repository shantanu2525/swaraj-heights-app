import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "../utils/cn";

/**
 * Tracks the *visible* viewport. On mobile the on-screen keyboard shrinks this
 * but not `100dvh`, so a dialog sized to `dvh` would hide its footer behind the
 * keyboard. Sizing to the visual viewport keeps the Save button reachable.
 */
function useVisualViewport() {
  const read = () => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    return {
      height: vv ? vv.height : typeof window !== "undefined" ? window.innerHeight : 800,
      top: vv ? vv.offsetTop : 0,
    };
  };

  const [box, setBox] = useState(read);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) {
      const onResize = () => setBox(read());
      window.addEventListener("resize", onResize);
      return () => window.removeEventListener("resize", onResize);
    }
    const onResize = () => setBox({ height: vv.height, top: vv.offsetTop });
    vv.addEventListener("resize", onResize);
    vv.addEventListener("scroll", onResize);
    return () => {
      vv.removeEventListener("resize", onResize);
      vv.removeEventListener("scroll", onResize);
    };
  }, []);

  return box;
}

interface Props {
  onClose: () => void;
  /** max width of the dialog */
  size?: "sm" | "md" | "lg";
  /** stacking order — nested dialogs pass a higher layer */
  layer?: number;
  children: React.ReactNode;
}

const SIZES = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-2xl",
};

/**
 * Centred, scroll-safe dialog shell used by every popup.
 *
 * The portal keeps `position: fixed` relative to the viewport even when the
 * trigger lives inside an animated/transformed card. The panel itself never
 * exceeds the visual viewport; its middle section scrolls while the header
 * and action footer stay reachable on phones, tablets and desktop screens.
 */
export default function Modal({ onClose, size = "md", layer = 70, children }: Props) {
  const viewport = useVisualViewport();

  // close on Escape + lock background scroll while open
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed left-0 right-0 top-0 w-screen overflow-hidden"
      style={{ zIndex: layer, height: viewport.height, transform: `translateY(${viewport.top}px)` }}
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        aria-label="Close dialog"
        className="animate-fade absolute inset-0 size-full cursor-default bg-pine-950/50 backdrop-blur-[3px]"
        onClick={onClose}
      />
      <div className="relative flex h-full w-full items-center justify-center p-2.5 sm:p-5">
        <div
          className={cn(
            "animate-pop card flex max-h-full w-full min-w-0 flex-col overflow-hidden rounded-2xl! shadow-[0_24px_60px_-20px_rgba(13,31,23,0.5)] sm:rounded-3xl!",
            SIZES[size]
          )}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}

/**
 * Scrollable body for tall forms. Caps height relative to the viewport so the
 * sticky header/footer stay visible, while never collapsing on small screens.
 */
export function ModalBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "modal-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6",
        className
      )}
    >
      {children}
    </div>
  );
}
