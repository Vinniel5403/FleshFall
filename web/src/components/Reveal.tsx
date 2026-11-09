"use client";

import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";

type From = "up" | "left" | "right" | "fade";
const OFFSET: Record<From, { x?: number; y?: number }> = { up: { y: 48 }, left: { x: -60 }, right: { x: 60 }, fade: {} };

/** Fades/slides children in once when scrolled into view. */
export function Reveal({
  from = "up",
  delay = 0,
  className,
  children,
  ...rest
}: { from?: From; delay?: number } & Omit<HTMLMotionProps<"div">, "initial" | "whileInView">) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, ...OFFSET[from] }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.8, delay, ease: [0.2, 0.8, 0.2, 1] }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/** Staggers direct <RevealItem> children. */
export function RevealGroup({ className, children, stagger = 0.08 }: { className?: string; children: React.ReactNode; stagger?: number }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.15 }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: stagger } } }}
    >
      {children}
    </motion.div>
  );
}

export function RevealItem({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <motion.div
      className={className}
      variants={{ hidden: { opacity: 0, y: 36 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.2, 0.8, 0.2, 1] } } }}
    >
      {children}
    </motion.div>
  );
}
