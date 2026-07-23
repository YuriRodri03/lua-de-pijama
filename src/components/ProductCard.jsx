import React from 'react';
import Button from './Button';

export default function ProductCard({ nome, preco, imagem, tag, onComprar }) {
  return (
    <div className="bg-white border border-lua-rose-dark/10 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 group flex flex-col h-full">
      
      {/* Área da Imagem Dinâmica */}
      <div className="bg-lua-cream h-64 flex items-center justify-center relative overflow-hidden">
        {tag && (
          <span className="absolute top-3 left-3 bg-white/90 text-lua-rose-dark text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border border-lua-rose-dark/20 z-10">
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
          <span className="text-5xl group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300 select-none">
            ✨
          </span>
        )}
      </div>
      
      {/* Informações do Produto */}
      <div className="p-5 flex flex-col flex-grow justify-between gap-4">
        <div>
          <h3 className="font-serif text-slate-800 font-semibold group-hover:text-lua-rose-dark transition-colors line-clamp-2 text-left">
            {nome}
          </h3>
          <p className="text-lua-rose-dark font-medium mt-1 text-left">
            {preco}
          </p>
        </div>
        
        {/* MODIFICADO: De Espiar para Comprar */}
        <Button 
          variant="primary" 
          onClick={onComprar} 
          className="w-full bg-lua-rose-dark hover:bg-lua-rose text-white"
          disabled={tag === "Esgotado"}
        >
          {tag === "Esgotado" ? "Esgotado" : "Adicionar à Sacola"}
        </Button>
      </div>
    </div>
  );
}