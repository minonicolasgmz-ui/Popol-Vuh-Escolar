export function EditorialMark({ className = '' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 160 180" fill="none" aria-hidden="true">
    <circle cx="80" cy="73" r="59" stroke="currentColor" strokeWidth=".6" opacity=".5" />
    <path d="M80 159V58M80 142C41 135 30 111 30 98c29 2 46 18 50 44ZM80 125c31-10 49-31 48-50-26 5-43 24-48 50ZM80 154c24-5 35-14 44-29" stroke="currentColor" strokeWidth="1.3" />
    <path d="M80 99c-12-13-17-31-9-49l9-19 9 19c8 18 3 36-9 49Z" stroke="currentColor" strokeWidth="1.3" />
    <path d="M73 55h14M70 64h20M70 73h20M74 82h12M80 39v51M43 32v10m-5-5h10M119 124v10m-5-5h10M120 32v6m-3-3h6" stroke="currentColor" strokeWidth=".8" />
    <circle cx="30" cy="72" r="1.6" fill="currentColor" /><circle cx="115" cy="54" r="1.4" fill="currentColor" />
    <path d="M56 167h48M67 172h26" stroke="currentColor" strokeWidth=".8" />
  </svg>;
}

export function Brand({ light = false }: { light?: boolean }) {
  return <span className={`brand ${light ? 'brand-light' : ''}`}><span className="brand-symbol" aria-hidden="true">P<span>V</span></span><span>Popol Vuh<small>EDICIÓN DE NUESTRA CLASE</small></span></span>;
}
