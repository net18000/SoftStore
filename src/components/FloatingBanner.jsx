import React from 'react';

const FloatingBanner = ({ banner, side }) => {
  if (!banner) return null;
  return (
    <div 
      className={`fixed top-1/2 -translate-y-1/2 z-40 hidden xl:flex flex-col items-center gap-4 p-4 rounded-3xl shadow-2xl transition-all hover:scale-105 ${side === 'left' ? 'left-6' : 'right-6'} animate-in fade-in slide-in-from-${side}-8 duration-700`}
      style={{ backgroundColor: banner.bgColor, width: '180px' }}
    >
      <div className="w-full aspect-[3/4] rounded-2xl overflow-hidden border border-white/20 shadow-inner bg-black/5">
        <img src={banner.imageUrl} alt={banner.title} className="w-full h-full object-contain" />
      </div>
      <div className="text-center space-y-2">
        <h4 className="text-sm font-black text-white leading-tight drop-shadow-sm">{banner.title}</h4>
        <p className="text-[10px] font-bold text-white/80 line-clamp-2">{banner.subtitle}</p>
      </div>
      {banner.link && (
        <a 
          href={banner.link} 
          target="_blank" 
          rel="noopener noreferrer"
          className="w-full bg-white text-slate-900 text-[10px] font-black py-2.5 rounded-xl text-center hover:bg-blue-50 transition-all uppercase tracking-widest shadow-lg"
        >
          Ver más
        </a>
      )}
    </div>
  );
};

export default FloatingBanner;
