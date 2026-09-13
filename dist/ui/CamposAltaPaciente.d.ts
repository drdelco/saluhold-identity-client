import type { ReactNode } from 'react';
import { type FormularioAlta, type PerfilAlta } from './altaPaciente';
export interface CamposAltaPacienteProps {
    perfil: PerfilAlta;
    valores: FormularioAlta;
    /** Cambios parciales; el padre decide cómo los funde en su estado. */
    onChange: (cambios: Partial<FormularioAlta>) => void;
    /** Ficha sin documento: no se pide el NIF y el contacto pasa a ser lo crítico. */
    provisional?: boolean;
    disabled?: boolean;
    /**
     * Campos que el lector del documento no leyó con certeza. Se marcan para que
     * el ojo vaya a ellos; NUNCA para impedir guardar.
     */
    revisar?: string[];
    /** Lista de países de la app (cada una tiene la suya). */
    paises: Array<{
        value: string;
        label: string;
    }>;
    /** Idiomas de informe. Solo lo usa SaluFirst. */
    idiomas?: Array<{
        value: string;
        label: string;
    }>;
    /** Selector de prefijo telefónico de la app. */
    prefijoSlot?: ReactNode;
    /**
     * Rótulos que separan identidad, contacto y dirección. Puestos por defecto
     * porque el formulario es largo y sin ellos es un muro de campos; se pueden
     * quitar en pantallas estrechas, donde ocupan más de lo que orientan.
     */
    secciones?: boolean;
    /** El cursor empieza en el nombre. Útil cuando el modal abre directo al alta. */
    autoFocusNombre?: boolean;
}
export default function CamposAltaPaciente({ perfil, valores, onChange, provisional, disabled, revisar, paises, idiomas, prefijoSlot, secciones, autoFocusNombre, }: CamposAltaPacienteProps): import("react").JSX.Element;
//# sourceMappingURL=CamposAltaPaciente.d.ts.map