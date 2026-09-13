/// <reference types="react" />
export type OrigenFoto = 'camara' | 'archivo';
interface Props {
    opened: boolean;
    onClose: () => void;
    onListo: (ficheros: File[]) => void;
    origen: OrigenFoto;
}
export default function DocumentFacesPicker({ opened, onClose, onListo, origen }: Props): import("react").JSX.Element;
export {};
//# sourceMappingURL=DocumentFacesPicker.d.ts.map