export function MaizeOrnament({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 220 210" fill="none" aria-hidden="true">
      <circle cx="110" cy="92" r="77" stroke="currentColor" strokeWidth=".6" opacity=".4" />
      <circle cx="110" cy="92" r="67" stroke="currentColor" strokeWidth=".6" opacity=".25" />
      <path d="M110 186V43M110 146C79 144 60 118 48 94c39 2 59 25 62 52Zm0 17c34-6 56-28 67-52-43 1-63 26-67 52Z" stroke="currentColor" strokeWidth="1.4" />
      <path d="M111 116c-20-14-26-33-23-49 3-18 11-33 22-40 13 12 23 29 24 45 2 19-6 35-23 44Z" stroke="currentColor" strokeWidth="1.4" />
      <path d="M110 39v65M98 47l12 7 12-7M94 60l16 7 17-7M94 75l16 7 19-7M96 90l14 7 15-7M70 113l35 30M151 128l-36 30" stroke="currentColor" strokeWidth=".8" opacity=".8" />
      <path d="m44 40 4 6-4 6-4-6 4-6Zm134 13 4 6-4 6-4-6 4-6ZM110 8v8M22 93h8M190 93h8" stroke="currentColor" />
      <path d="M69 186h82M86 194h48" stroke="currentColor" strokeWidth=".7" />
    </svg>
  );
}

export default function BookCover({ back = false }: { back?: boolean }) {
  return (
    <div className={`book-cover ${back ? 'book-back-cover' : ''}`}>
      <div className="book-cover-rule" />
      <p className="book-cover-edition">EDICIÓN COLECTIVA · AULA</p>
      {back ? (
        <>
          <MaizeOrnament className="book-cover-ornament" />
          <p className="book-back-quote">Un relato antiguo.<br />Muchas voces nuevas.</p>
        </>
      ) : (
        <>
          <p className="book-cover-kicker">EL LIBRO DE NUESTRA CLASE</p>
          <h2>Popol<br /><em>Vuh</em></h2>
          <MaizeOrnament className="book-cover-ornament" />
          <p className="book-cover-subtitle">Historias, imágenes y voces<br />creadas por nosotros.</p>
        </>
      )}
      <div className="book-cover-bottom"><span />UNA CREACIÓN COMPARTIDA<span /></div>
    </div>
  );
}
