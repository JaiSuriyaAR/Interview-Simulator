import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { ChevronDown } from 'lucide-react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  glass?: boolean;
  className?: string;
  key?: React.Key;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}

export const Card = ({ children, className, glass = true, ...props }: CardProps) => (
  <div 
    className={cn(
      "rounded-2xl border border-white/10 shadow-lg overflow-hidden",
      glass && "bg-white/5 backdrop-blur-xl",
      className
    )}
    {...props}
  >
    {children}
  </div>
);

export const Button = ({ 
  children, 
  className, 
  variant = 'primary', 
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'outline' | 'ghost' }) => {
  const variants = {
    primary: "bg-emerald-600 hover:bg-emerald-500 text-white",
    secondary: "bg-white/10 hover:bg-white/20 text-white",
    outline: "border border-white/20 hover:bg-white/5 text-white",
    ghost: "hover:bg-white/5 text-white/70 hover:text-white",
  };

  return (
    <button 
      className={cn(
        "px-6 py-3 rounded-full font-medium transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

export const Typography = {
  H1: ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <h1 className={cn("text-4xl md:text-5xl font-bold tracking-tight text-white", className)}>{children}</h1>
  ),
  H2: ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <h2 className={cn("text-2xl md:text-3xl font-semibold text-white/90", className)}>{children}</h2>
  ),
  Body: ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <p className={cn("text-base text-white/70 leading-relaxed", className)}>{children}</p>
  ),
};

export const Select = ({ 
  options,
  value,
  onChange,
  placeholder = "Select an option",
  className,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className={cn("relative group", className)} ref={containerRef}>
      {/* Glow effect */}
      <div className={cn(
        "absolute -inset-[1px] bg-gradient-to-r from-emerald-500/0 via-indigo-500/0 to-emerald-500/0 rounded-xl blur-sm opacity-0 group-hover:opacity-100 transition-all duration-500",
        isOpen && "opacity-100 from-emerald-500/20 via-indigo-500/20 to-emerald-500/20"
      )} />
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative w-full flex items-center justify-between bg-[#0a0a0a]/80 backdrop-blur-md border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white/90 focus:outline-none transition-all shadow-2xl",
          isOpen && "border-emerald-500/50 ring-1 ring-emerald-500/20"
        )}
      >
        <span className={cn(!selectedOption && "text-white/30")}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={cn("w-4 h-4 text-white/20 transition-transform duration-300", isOpen && "rotate-180 text-emerald-400")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute z-50 w-full mt-2 bg-[#0d0d0d] border border-white/10 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl"
          >
            <div className="py-1 max-h-60 overflow-y-auto custom-scrollbar">
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full text-left px-4 py-3 text-sm transition-colors flex items-center justify-between",
                    value === option.value 
                      ? "bg-emerald-500/10 text-emerald-400 font-medium" 
                      : "text-white/60 hover:bg-white/5 hover:text-white"
                  )}
                >
                  {option.label}
                  {value === option.value && (
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
