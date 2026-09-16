import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
// ScanIdButton.tsx — botón de "escanear DNI" reutilizable.
//
// Las tres pantallas de alta montan este componente y aplican el resultado. La
// decisión de qué hacer con lo leído no está aquí: vive en `useScanIdDocument`,
// para que ninguna pantalla pueda saltarse la búsqueda previa.
//
// Todas las vías pasan por un selector con dos huecos (anverso y reverso
// opcional), para que se vea cómo aportar las dos caras:
//   - MÓVIL: cámara trasera (`capture="environment"`; con "user" saldría la
//     frontal, inútil para un documento) o galería.
//   - ESCRITORIO: la cámara del propio equipo (getUserMedia, con su propio
//     flujo de dos capturas), la cámara del móvil enlazada por QR (la foto se
//     lee en el móvil y aquí solo llegan los campos), o subir fotos.
import { useState } from 'react';
import { Button, Group, Stack, Text, Alert, Loader, Menu } from '@mantine/core';
import { ScanLine, AlertTriangle, RotateCcw, Camera, Smartphone, Upload, ChevronDown } from 'lucide-react';
import { useScanIdDocument } from './useScanIdDocument';
import WebcamCaptureModal from './WebcamCaptureModal';
import QrHandoffModal from './QrHandoffModal';
import DocumentFacesPicker from './DocumentFacesPicker';
import { hayTraspasoQr } from './config';
import { textosUI } from './textos';
/** Qué clave del diccionario rotula cada paso. El texto se busca al pintar. */
const CLAVE_PROGRESO = {
    comprimiendo: 'progresoComprimiendo',
    leyendo: 'progresoLeyendo',
    buscando: 'progresoBuscando',
};
/**
 * En un móvil no hay menú de vías: se usa la cámara trasera y punto. El
 * user-agent cubre el caso de abrir la app de escritorio desde un teléfono, y
 * `rutaMovil` el de una PWA que vive bajo un prefijo propio (en SaluFile, /rx).
 */
function esDispositivoMovil(rutaMovil) {
    if (typeof window === 'undefined')
        return false;
    if (rutaMovil && window.location.pathname.startsWith(rutaMovil))
        return true;
    const ua = navigator.userAgent;
    const iPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
    return /Android|iPhone|iPad|iPod/i.test(ua) || iPadOS;
}
export default function ScanIdButton({ onResultado, size = 'sm', disabled, fullWidth, rutaMovil }) {
    const t = textosUI();
    const { escanear, procesarLectura, escaneando, progreso, error, limpiar } = useScanIdDocument();
    const [ultimoAviso, setUltimoAviso] = useState(null);
    const [abierta, setAbierta] = useState(null);
    const [ultimaVia, setUltimaVia] = useState(null);
    const movil = esDispositivoMovil(rutaMovil);
    // El traspaso al móvil solo se ofrece si la app lo ha configurado: enseñar un
    // camino que no lleva a ninguna parte es peor que no enseñarlo.
    const conQr = hayTraspasoQr();
    const abrir = (via) => {
        limpiar();
        setUltimaVia(via);
        setAbierta(via);
    };
    const cerrar = () => setAbierta(null);
    const entregar = (r) => {
        if (r.avisos.includes('sin_reverso_no_hay_direccion')) {
            setUltimoAviso(t.avisoSinReverso);
        }
        else if (r.avisos.includes('documento_caducado')) {
            setUltimoAviso(t.avisoDocumentoCaducado);
        }
        onResultado(r);
    };
    /** Fotos hechas o subidas AQUÍ: se leen y se decide. */
    const procesar = async (ficheros) => {
        if (!ficheros.length)
            return;
        limpiar();
        setUltimoAviso(null);
        const r = await escanear(ficheros);
        if (r)
            entregar(r);
    };
    /** Lectura hecha en el MÓVIL: solo queda decidir. */
    const procesarDesdeMovil = async (lectura) => {
        limpiar();
        setUltimoAviso(null);
        const r = await procesarLectura(lectura);
        if (r)
            entregar(r);
    };
    const claveProgreso = CLAVE_PROGRESO[progreso || ''];
    const etiqueta = escaneando
        ? (claveProgreso ? t[claveProgreso] : t.progresoGenerico)
        : t.escanearDni;
    return (_jsxs(Stack, { gap: 6, children: [_jsx(Group, { gap: "xs", wrap: "wrap", children: movil ? (_jsxs(_Fragment, { children: [_jsx(Button, { size: size, variant: "light", color: "serene", leftSection: escaneando ? _jsx(Loader, { size: 14 }) : _jsx(ScanLine, { size: 16 }), onClick: () => abrir('camara'), disabled: disabled || escaneando, fullWidth: fullWidth, children: etiqueta }), !escaneando && (_jsx(Button, { size: size, variant: "subtle", color: "gray", onClick: () => abrir('archivo'), disabled: disabled, children: t.subirFotos }))] })) : (_jsxs(Menu, { shadow: "md", width: 250, position: "bottom-start", disabled: disabled || escaneando, children: [_jsx(Menu.Target, { children: _jsx(Button, { size: size, variant: "light", color: "serene", leftSection: escaneando ? _jsx(Loader, { size: 14 }) : _jsx(ScanLine, { size: 16 }), rightSection: !escaneando && _jsx(ChevronDown, { size: 14 }), disabled: disabled || escaneando, fullWidth: fullWidth, children: etiqueta }) }), _jsxs(Menu.Dropdown, { children: [_jsx(Menu.Label, { children: t.fotografiarCon }), _jsx(Menu.Item, { leftSection: _jsx(Camera, { size: 16 }), onClick: () => abrir('webcam'), children: t.camaraEquipo }), conQr && (_jsx(Menu.Item, { leftSection: _jsx(Smartphone, { size: 16 }), onClick: () => abrir('qr'), children: t.camaraMovilQr })), _jsx(Menu.Divider, {}), _jsx(Menu.Item, { leftSection: _jsx(Upload, { size: 16 }), onClick: () => abrir('archivo'), children: t.subirFotosDocumento })] })] })) }), _jsx(Text, { size: "xs", c: "dimmed", children: t.avisoEscanerPie }), ultimoAviso && (_jsx(Text, { size: "xs", c: "salu-yellow.8", children: ultimoAviso })), error && (_jsx(Alert, { color: "salu-yellow", variant: "light", p: "xs", icon: _jsx(AlertTriangle, { size: 14 }), children: _jsxs(Group, { justify: "space-between", wrap: "nowrap", gap: "xs", children: [_jsx(Text, { size: "xs", children: error }), _jsx(Button, { size: "compact-xs", variant: "subtle", leftSection: _jsx(RotateCcw, { size: 12 }), onClick: () => abrir(ultimaVia ?? (movil ? 'camara' : 'webcam')), children: t.repetir })] }) })), _jsx(DocumentFacesPicker, { opened: abierta === 'camara' || abierta === 'archivo', origen: abierta === 'camara' ? 'camara' : 'archivo', onClose: cerrar, onListo: (ficheros) => void procesar(ficheros) }), !movil && (_jsxs(_Fragment, { children: [_jsx(WebcamCaptureModal, { opened: abierta === 'webcam', onClose: cerrar, onCapturado: (ficheros) => void procesar(ficheros) }), conQr && (_jsx(QrHandoffModal, { opened: abierta === 'qr', onClose: cerrar, onLectura: (lectura) => void procesarDesdeMovil(lectura) }))] }))] }));
}
//# sourceMappingURL=ScanIdButton.js.map