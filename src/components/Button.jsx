import React from 'react';

export default function Button({ children, variant = 'primary', className = '', ...props }) {
  const baseStyles = "text-xs font-bold uppercase tracking-wider py-2.5 px-5 rounded-xl transition-all duration-200 cursor-pointer shadow-xs active:scale-95";
  
  const variants = {
    primary: "bg-lua-rose-dark hover:bg-lua-rose-dark/90 text-white shadow-md hover:shadow-lg",
    secondary: "bg-lua-cream text-lua-rose-dark hover:bg-lua-rose-dark hover:text-white border border-lua-rose-dark/20",
    gold: "bg-lua-gold text-slate-900 hover:bg-lua-gold-dark",
    outline: "border border-slate-200 text-slate-600 hover:bg-slate-50"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`} 
      {...props}
    >
      {children}
    </button>
  );
}