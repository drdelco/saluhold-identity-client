import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// QrHandoffModal.tsx — leer el DNI con la cámara del móvil desde el escritorio.
//
// El escritorio abre una sesión de escaneo, la muestra como QR y espera. El
// móvil (SaluFile, identificado en la misma clínica) escanea el QR, fotografía
// el documento, lo lee y deja los campos en la sesión. Este modal solo entrega
// esa lectura al botón, que la procesa igual que si la foto se hubiera hecho
// aquí (búsqueda por NIF antes de nada).
//
// La sesión se borra al consumirse o al cerrar el modal; si no, caduca a los
// 10 minutos (TTL de Firestore).
import { useEffect, useRef, useState } from 'react';
import { Modal, Stack, Group, Text, Button, Image, Alert, Loader, Badge, Center } from '@mantine/core';
import { Smartphone, RotateCcw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import QRCode from 'qrcode';
import { crearSesionEscaneo, escucharSesion, borrarSesion, urlDeSesion, sesionCaducada, SCAN_SESSION_TTL_MIN, } from './sesionEscaneo';
import { mensajeDeError } from './config';
export default function QrHandoffModal({ opened, onClose, onLectura }) {
    const [fase, setFase] = useState('creando');
    const [qr, setQr] = useState(null);
    const [error, setError] = useState(null);
    const [restante, setRestante] = useState(SCAN_SESSION_TTL_MIN * 60);
    const sesionRef = useRef(null);
    const unsubRef = useRef(null);
    const consumidaRef = useRef(false);
    const limpiar = () => {
        unsubRef.current?.();
        unsubRef.current = null;
        if (sesionRef.current) {
            void borrarSesion(sesionRef.current);
            sesionRef.current = null;
        }
    };
    const abrirSesion = async () => {
        limpiar();
        consumidaRef.current = false;
        setFase('creando');
        setError(null);
        setQr(null);
        try {
            const { id, expiresAt } = await crearSesionEscaneo();
            sesionRef.current = id;
            setRestante(Math.max(0, Math.round((expiresAt.getTime() - Date.now()) / 1000)));
            setQr(await QRCode.toDataURL(urlDeSesion(id), { width: 280, margin: 1, errorCorrectionLevel: 'M' }));
            setFase('esperando');
            unsubRef.current = escucharSesion(id, (s) => {
                if (!s || consumidaRef.current)
                    return;
                if (s.status === 'done' && s.lectura?.ok) {
                    consumidaRef.current = true;
                    setFase('recibido');
                    onLectura(s.lectura);
                    // La lectura ya está en el escritorio: la sesión no tiene que
                    // sobrevivir ni un segundo más.
                    limpiar();
                    onClose();
                    return;
                }
                if (sesionCaducada(s)) {
                    setFase('caducado');
                    return;
                }
                if (s.status === 'scanning')
                    setFase('movil-conectado');
            }, (e) => { setError(mensajeDeError(e, 'Se ha perdido la conexión con la sesión.')); setFase('error'); });
        }
        catch (e) {
            setError(mensajeDeError(e, 'No se ha podido crear la sesión de escaneo.'));
            setFase('error');
        }
    };
    useEffect(() => {
        if (!opened)
            return;
        void abrirSesion();
        return () => limpiar();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [opened]);
    // Cuenta atrás: al llegar a cero el QR deja de servir aunque Firestore aún
    // no haya borrado el doc.
    useEffect(() => {
        if (fase !== 'esperando' && fase !== 'movil-conectado')
            return;
        const t = setInterval(() => {
            setRestante(r => {
                if (r <= 1) {
                    setFase('caducado');
                    return 0;
                }
                return r - 1;
            });
        }, 1000);
        return () => clearInterval(t);
    }, [fase]);
    const mm = String(Math.floor(restante / 60)).padStart(2, '0');
    const ss = String(restante % 60).padStart(2, '0');
    return (_jsx(Modal, { opened: opened, onClose: onClose, title: "C\u00E1mara del m\u00F3vil", size: "sm", centered: true, zIndex: 400, children: _jsxs(Stack, { gap: "sm", align: "center", children: [_jsx(Text, { size: "sm", c: "dimmed", ta: "center", children: "Escanea el c\u00F3digo con la c\u00E1mara del m\u00F3vil. Se abrir\u00E1 la p\u00E1gina para fotografiar el documento (hay que estar identificado en esta cl\u00EDnica) y los datos aparecer\u00E1n aqu\u00ED autom\u00E1ticamente." }), fase === 'creando' && _jsx(Center, { h: 280, children: _jsx(Loader, { color: "serene" }) }), (fase === 'esperando' || fase === 'movil-conectado') && qr && (_jsxs(_Fragment, { children: [_jsx(Image, { src: qr, alt: "C\u00F3digo QR para el m\u00F3vil", w: 280, h: 280 }), _jsxs(Group, { gap: "xs", children: [fase === 'movil-conectado'
                                    ? _jsx(Badge, { color: "serene", variant: "light", leftSection: _jsx(Smartphone, { size: 12 }), children: "M\u00F3vil conectado, esperando la foto\u2026" })
                                    : _jsx(Badge, { color: "gray", variant: "light", children: "Esperando al m\u00F3vil\u2026" }), _jsxs(Text, { size: "xs", c: "dimmed", ff: "monospace", children: [mm, ":", ss] })] })] })), fase === 'recibido' && (_jsxs(Group, { gap: "xs", c: "serene.7", children: [_jsx(CheckCircle2, { size: 18 }), _jsx(Text, { size: "sm", children: "Documento recibido." })] })), fase === 'caducado' && (_jsx(Alert, { color: "salu-yellow", variant: "light", icon: _jsx(AlertTriangle, { size: 16 }), w: "100%", children: _jsxs(Group, { justify: "space-between", wrap: "nowrap", children: [_jsx(Text, { size: "sm", children: "El c\u00F3digo ha caducado." }), _jsx(Button, { size: "compact-xs", variant: "subtle", leftSection: _jsx(RotateCcw, { size: 12 }), onClick: () => void abrirSesion(), children: "Generar otro" })] }) })), fase === 'error' && (_jsx(Alert, { color: "salu-red", variant: "light", icon: _jsx(AlertTriangle, { size: 16 }), w: "100%", children: _jsxs(Group, { justify: "space-between", wrap: "nowrap", children: [_jsx(Text, { size: "sm", children: error }), _jsx(Button, { size: "compact-xs", variant: "subtle", leftSection: _jsx(RotateCcw, { size: 12 }), onClick: () => void abrirSesion(), children: "Reintentar" })] }) })), _jsx(Text, { size: "xs", c: "dimmed", ta: "center", children: "La foto se lee en el m\u00F3vil y no se guarda. Aqu\u00ED solo llegan los datos extra\u00EDdos." })] }) }));
}
//# sourceMappingURL=QrHandoffModal.js.map