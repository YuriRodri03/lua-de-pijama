import React from 'react';

export default function Button({ children, variant = 'primary', className = '', ...props }) {
  // Adicionado: flexbox para alinhar textos/ícones e estados de "disabled"
  const baseStyles = "flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider py-2.5 px-5 rounded-xl transition-all duration-200 cursor-pointer shadow-xs active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100";
  
  const variants = {
    primary: "bg-lua-rose-dark hover:bg-lua-rose-dark/90 text-white shadow-md hover:shadow-lg disabled:hover:bg-lua-rose-dark",
    secondary: "bg-lua-cream text-lua-rose-dark hover:bg-lua-rose-dark hover:text-white border border-lua-rose-dark/20 disabled:hover:bg-lua-cream disabled:hover:text-lua-rose-dark",
    gold: "bg-lua-gold text-slate-900 hover:bg-lua-gold-dark disabled:hover:bg-lua-gold",
    outline: "border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:hover:bg-transparent"
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