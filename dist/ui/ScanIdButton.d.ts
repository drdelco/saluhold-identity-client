/// <reference types="react" />
import { type ResultadoEscaneo } from './useScanIdDocument';
interface Props {
    onResultado: (r: ResultadoEscaneo) => void;
    /** Compacto para las cabeceras móviles. */
    size?: 'xs' | 'sm';
    disabled?: boolean;
    fullWidth?: boolean;
    /** Prefijo de ruta de la PWA móvil de la app, si tiene (SaluFile: '/rx'). */
    rutaMovil?: string;
}
export default function ScanIdButton({ onResultado, size, disabled, fullWidth, rutaMovil }: Props): import("react").JSX.Element;
export {};
//# sourceMappingURL=ScanIdButton.d.ts.map