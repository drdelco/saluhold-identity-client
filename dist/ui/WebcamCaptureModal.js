import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// WebcamCaptureModal.tsx — fotografiar el documento con la cámara del equipo.
//
// En un PC no hay `capture="environment"` que valga: el input de fichero abre
// el explorador. Aquí se usa getUserMedia, se muestra la previsualización y
// cada captura se convierte en un File JPEG que entra por el MISMO camino que
// una foto subida o hecha en el móvil. El modal no sabe nada de la lectura:
// devuelve ficheros y se cierra.
//
// La captura vive solo en memoria hasta que se lee; no se guarda ni se sube.
import { useEffect, useRef, useState } from 'react';
import { Modal, Stack, Group, Button, Text, Select, Alert, Box, Image, Loader } from '@mantine/core';
import { Camera, AlertTriangle, RotateCcw, ScanLine } from 'lucide-react';
import { mensajeDeError } from './config';
import { textosUI, interpolar } from './textos';
/** Qué clave rotula cada fallo de `getUserMedia`. El texto se busca al fallar. */
const CLAVE_CAMARA = {
    NotAllowedError: 'camaraPermisoDenegado',
    NotFoundError: 'camaraNoEncontrada',
    NotReadableError: 'camaraEnUso',
    OverconstrainedError: 'camaraNoDisponible',
};
export default function WebcamCaptureModal({ opened, onClose, onCapturado }) {
    const t = textosUI();
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const [dispositivos, setDispositivos] = useState([]);
    const [dispositivoId, setDispositivoId] = useState(null);
    const [iniciando, setIniciando] = useState(false);
    const [errorCamara, setErrorCamara] = useState(null);
    const [capturas, setCapturas] = useState([]);
    const detener = () => {
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        if (videoRef.current)
            videoRef.current.srcObject = null;
    };
    const arrancar = async (deviceId) => {
        detener();
        setIniciando(true);
        setErrorCamara(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: false,
                video: deviceId
                    ? { deviceId: { exact: deviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } }
                    : { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play().catch(() => { });
            }
            // Las etiquetas de los dispositivos solo llegan tras conceder permiso.
            const lista = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'videoinput');
            setDispositivos(lista);
            const activo = stream.getVideoTracks()[0]?.getSettings().deviceId;
            if (activo)
                setDispositivoId(activo);
        }
        catch (e) {
            const clave = CLAVE_CAMARA[e?.name];
            setErrorCamara(clave ? t[clave] : mensajeDeError(e, t.errorAbrirCamara));
        }
        finally {
            setIniciando(false);
        }
    };
    useEffect(() => {
        if (!opened)
            return;
        if (!navigator.mediaDevices?.getUserMedia) {
            setErrorCamara(t.camaraNoSoportada);
            return;
        }
        void arrancar(null);
        return () => {
            detener();
            setCapturas(prev => { prev.forEach(c => URL.revokeObjectURL(c.url)); return []; });
            setErrorCamara(null);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [opened]);
    const capturar = async () => {
        const video = videoRef.current;
        if (!video || !video.videoWidth)
            return;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d')?.drawImage(video, 0, 0);
        const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.92));
        if (!blob)
            return;
        const cara = capturas.length === 0 ? 'anverso' : 'reverso';
        const fichero = new File([blob], `${cara}.jpg`, { type: 'image/jpeg' });
        setCapturas(prev => [...prev, { fichero, url: URL.createObjectURL(blob) }]);
    };
    const repetirUltima = () => {
        setCapturas(prev => {
            const ultima = prev[prev.length - 1];
            if (ultima)
                URL.revokeObjectURL(ultima.url);
            return prev.slice(0, -1);
        });
    };
    const leer = () => {
        const ficheros = capturas.map(c => c.fichero);
        onCapturado(ficheros);
        onClose();
    };
    const puedeCapturar = !errorCamara && !iniciando && capturas.length < 2;
    return (_jsx(Modal, { opened: opened, onClose: onClose, title: t.camaraEquipo, size: "lg", centered: true, zIndex: 400, children: _jsxs(Stack, { gap: "sm", children: [_jsx(Text, { size: "sm", c: "dimmed", children: t.instruccionesWebcam }), dispositivos.length > 1 && (_jsx(Select, { size: "xs", label: t.camara, value: dispositivoId, data: dispositivos.map((d, i) => ({
                        value: d.deviceId,
                        label: d.label || interpolar(t.camaraNumerada, { n: i + 1 }),
                    })), onChange: (v) => { if (v) {
                        setDispositivoId(v);
                        void arrancar(v);
                    } }, allowDeselect: false })), errorCamara ? (_jsx(Alert, { color: "salu-yellow", variant: "light", icon: _jsx(AlertTriangle, { size: 16 }), children: _jsxs(Group, { justify: "space-between", wrap: "nowrap", children: [_jsx(Text, { size: "sm", children: errorCamara }), _jsx(Button, { size: "compact-xs", variant: "subtle", leftSection: _jsx(RotateCcw, { size: 12 }), onClick: () => void arrancar(dispositivoId), children: t.reintentar })] }) })) : (_jsxs(Box, { pos: "relative", bg: "dark.8", style: { borderRadius: 8, overflow: 'hidden', minHeight: 240 }, children: [_jsx("video", { ref: videoRef, autoPlay: true, playsInline: true, muted: true, style: { width: '100%', display: 'block', maxHeight: '55vh', objectFit: 'contain' } }), iniciando && (_jsx(Group, { pos: "absolute", inset: 0, justify: "center", align: "center", children: _jsx(Loader, { color: "white", size: "sm" }) }))] })), capturas.length > 0 && (_jsx(Group, { gap: "sm", children: capturas.map((c, i) => (_jsxs(Stack, { gap: 2, align: "center", children: [_jsx(Image, { src: c.url, alt: i === 0 ? t.anverso : t.reverso, w: 120, radius: "sm" }), _jsx(Text, { size: "xs", c: "dimmed", children: i === 0 ? t.anverso : t.reverso })] }, c.url))) })), _jsxs(Group, { justify: "space-between", wrap: "wrap", children: [_jsxs(Group, { gap: "xs", children: [_jsx(Button, { variant: "light", color: "serene", leftSection: _jsx(Camera, { size: 16 }), onClick: () => void capturar(), disabled: !puedeCapturar, children: capturas.length === 0 ? t.capturarAnverso : t.capturarReverso }), capturas.length > 0 && (_jsx(Button, { variant: "subtle", color: "gray", leftSection: _jsx(RotateCcw, { size: 14 }), onClick: repetirUltima, children: capturas.length === 1 ? t.repetirAnverso : t.repetirReverso }))] }), _jsx(Button, { color: "serene", leftSection: _jsx(ScanLine, { size: 16 }), onClick: leer, disabled: capturas.length === 0, children: t.leerDocumento })] })] }) }));
}
//# sourceMappingURL=WebcamCaptureModal.js.map