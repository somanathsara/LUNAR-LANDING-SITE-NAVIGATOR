export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export default function Card({
  variant = 'default',
  padding = 'md',
  className = '',
  children,
  ...props
}: CardProps) {
  const variantStyles = {
    default: 'bg-card border border-secondary',
    elevated: 'bg-card shadow-lg border border-secondary/50',
    outlined: 'bg-transparent border border-secondary',
  };

  const paddingStyles = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  return (
    <div
      className={`${variantStyles[variant]} rounded-lg ${paddingStyles[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}