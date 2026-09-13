/// <reference types="react" />
import type { LecturaOk } from './documento';
interface Props {
    opened: boolean;
    onClose: () => void;
    onLectura: (lectura: LecturaOk) => void;
}
export default function QrHandoffModal({ opened, onClose, onLectura }: Props): import("react").JSX.Element;
export {};
//# sourceMappingURL=QrHandoffModal.d.ts.map