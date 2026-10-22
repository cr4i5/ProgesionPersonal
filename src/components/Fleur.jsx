// Flor de lis scout: usa public/fleur.png (blanco sobre transparente) como máscara,
// así toma el color que se le indique (amarillo, vino, blanco...).
export default function Fleur({ size = 24, color = 'currentColor', className = '', title }) {
  return (
    <span className={`fleur ${className}`} style={{ width: size, height: size, background: color }}
      role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true} />
  )
}

// Logo de la marca: flor de lis amarilla sobre recuadro vino.
export function BrandLogo({ size = 38 }) {
  return <span className="brand-mark" style={{ width: size, height: size }}><Fleur size={Math.round(size * 0.68)} /></span>
}
