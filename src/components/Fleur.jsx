// Flor de lis dibujada para esta web (símbolo scout genérico). No es el logo oficial de la ASV ni el Emblema Scout Mundial.
export default function Fleur({ size = 24, color = 'currentColor', outline = false, className, title }) {
  const props = outline ? { fill: 'none', stroke: color, strokeWidth: 2.2, strokeLinejoin: 'round' } : { fill: color }
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 100 100" role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <g {...props}>
        <path d="M50 4 C61 18 64 36 50 58 C36 36 39 18 50 4Z" />
        <path id="petal" d="M43 56 C30 60 12 52 12 32 C12 24 18 20 23 22 C20 28 22 34 30 38 C34 40 40 44 46 52Z" />
        <path d="M57 56 C70 60 88 52 88 32 C88 24 82 20 77 22 C80 28 78 34 70 38 C66 40 60 44 54 52Z" />
        <rect x="31" y="60" width="38" height="8" rx="3.5" />
        <path d="M41 69 C44 80 47 88 50 96 C53 88 56 80 59 69 Z" />
      </g>
    </svg>
  )
}
