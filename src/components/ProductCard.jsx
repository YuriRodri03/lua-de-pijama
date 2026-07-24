import React from 'react';
import Button from './Button';

export default function ProductCard({ nome, preco, imagem, tag, onComprar }) {
  return (
    <div className="bg-white border border-lua-rose-dark/10 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 group flex flex-col h-full">
      
      {/* Área da Imagem Dinâmica */}
      <div className="bg-lua-cream h-48 md:h-64 flex items-center justify-center relative overflow-hidden shrink-0">
        {tag && (
          <span className="absolute top-2 md:top-3 left-2 md:left-3 bg-white/90 text-lua-rose-dark text-[9px] md:text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border border-lua-rose-dark/20 z-10">
            {tag}
          </span>
        )}
        
        {imagem ? (
          <img 
            src={imagem} 
            alt={nome} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
            loading="lazy"
          />
        ) : (
          <span className="text-4xl md:text-5xl group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300 select-none">
            ✨
          </span>
        )}
      </div>
      
      {/* Informações do Produto */}
      <div className="p-3 md:p-5 flex flex-col flex-grow justify-between gap-3 md:gap-4">
        <div>
          <h3 className="font-serif text-sm md:text-base text-slate-800 font-semibold group-hover:text-lua-rose-dark transition-colors line-clamp-2 text-left">
            {nome}
          </h3>
          <p className="text-xs md:text-sm text-lua-rose-dark font-bold mt-1 text-left">
            {preco}
          </p>
        </div>
        
        {/* Botão de Compra */}
        <Button 
          variant="primary" 
          onClick={onComprar} 
          className="w-full bg-lua-rose-dark hover:bg-lua-rose text-white text-[11px] md:text-sm py-2 md:py-2.5 px-1 shadow-sm"
          disabled={tag === "Esgotado"}
        >
          {tag === "Esgotado" ? "Esgotado" : "Adicionar à Sacola"}
        </Button>
      </div>
    </div>
  );
}