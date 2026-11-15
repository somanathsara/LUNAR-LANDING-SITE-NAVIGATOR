import React from 'react';

interface NavLinkProps {
  to: string;
  isActive: boolean;
  onClick: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  children: React.ReactNode;
}

export default function NavLink({ to, isActive, onClick, children }: NavLinkProps) {
  return (
    <a
      href={to}
      onClick={onClick}
      className={`nav-link px-3 py-2 rounded-md text-sm font-medium transition-all ${isActive
        ? 'bg-accent-primary/15 text-accent-primary border border-accent-primary/30'
        : 'text-secondary hover:text-primary hover:bg-tertiary'
      }`}
      aria-current={isActive ? 'page' : undefined}
    >
      {children}
    </a>
  );
}