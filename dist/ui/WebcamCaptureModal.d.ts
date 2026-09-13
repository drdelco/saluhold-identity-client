/// <reference types="react" />
interface Props {
    opened: boolean;
    onClose: () => void;
    /** Anverso y, si se capturó, reverso. */
    onCapturado: (ficheros: File[]) => void;
}
export default function WebcamCaptureModal({ opened, onClose, onCapturado }: Props): import("react").JSX.Element;
export {};
//# sourceMappingURL=WebcamCaptureModal.d.ts.map