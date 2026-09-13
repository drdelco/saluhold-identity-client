import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// DocumentFacesPicker.tsx — elegir anverso y (opcionalmente) reverso, a la vista.
//
// Un `<input multiple>` admite dos fotos, pero solo si el usuario sabe que
// tiene que seleccionarlas a la vez en el diálogo del sistema, y en el móvil
// la cámara devuelve una sola: el reverso era imposible. Aquí cada cara tiene
// su hueco, su botón y su miniatura, y "Leer documento" se activa con el
// anverso. El reverso queda claro que es opcional y para qué sirve.
//
// Sirve para dos orígenes: `camara` (cámara trasera del móvil, una foto por
// hueco) y `archivo` (selector de ficheros). No lee nada: devuelve los
// ficheros en orden [anverso, reverso?] y se cierra.
import { useEffect, useRef, useState } from 'react';
import { Modal, Stack, Group, Button, Text, Paper, Image, ActionIcon, SimpleGrid } from '@mantine/core';
import { Camera, Upload, ScanLine, X, CreditCard } from 'lucide-react';
function Hueco({ titulo, ayuda, foto, origen, onElegir, onQuitar, }) {
    return (_jsx(Paper, { p: "sm", radius: "md", withBorder: true, style: { borderStyle: foto ? 'solid' : 'dashed', minHeight: 170 }, children: _jsxs(Stack, { gap: 6, align: "center", justify: "center", h: "100%", children: [_jsx(Text, { size: "sm", fw: 600, children: titulo }), foto ? (_jsxs(_Fragment, { children: [_jsx(Image, { src: foto.url, alt: titulo, h: 96, w: "auto", fit: "contain", radius: "sm" }), _jsxs(Group, { gap: 4, children: [_jsx(Button, { size: "compact-xs", variant: "subtle", color: "gray", onClick: onElegir, children: "Cambiar" }), _jsx(ActionIcon, { size: "sm", variant: "subtle", color: "gray", onClick: onQuitar, "aria-label": `Quitar ${titulo}`, children: _jsx(X, { size: 14 }) })] })] })) : (_jsxs(_Fragment, { children: [_jsx(CreditCard, { size: 28, style: { color: 'var(--mantine-color-dimmed)' } }), _jsx(Button, { size: "xs", variant: "light", color: "serene", leftSection: origen === 'camara' ? _jsx(Camera, { size: 14 }) : _jsx(Upload, { size: 14 }), onClick: onElegir, children: origen === 'camara' ? 'Hacer foto' : 'Elegir foto' }), _jsx(Text, { size: "xs", c: "dimmed", ta: "center", children: ayuda })] }))] }) }));
}
export default function DocumentFacesPicker({ opened, onClose, onListo, origen }) {
    const [anverso, setAnverso] = useState(null);
    const [reverso, setReverso] = useState(null);
    const anversoRef = useRef(null);
    const reversoRef = useRef(null);
    // Al cerrar se sueltan las miniaturas: no queda copia de la foto en memoria.
    useEffect(() => {
        if (opened)
            return;
        setAnverso(prev => { if (prev)
            URL.revokeObjectURL(prev.url); return null; });
        setReverso(prev => { if (prev)
            URL.revokeObjectURL(prev.url); return null; });
    }, [opened]);
    const asignar = (setter) => (files) => {
        const f = files?.[0];
        if (!f)
            return;
        setter(prev => {
            if (prev)
                URL.revokeObjectURL(prev.url);
            return { fichero: f, url: URL.createObjectURL(f) };
        });
    };
    const quitar = (setter) => () => setter(prev => { if (prev)
        URL.revokeObjectURL(prev.url); return null; });
    const leer = () => {
        if (!anverso)
            return;
        const ficheros = reverso ? [anverso.fichero, reverso.fichero] : [anverso.fichero];
        onListo(ficheros);
        onClose();
    };
    const inputProps = {
        type: 'file',
        accept: origen === 'camara' ? 'image/*' : 'image/jpeg,image/png,image/webp',
        style: { display: 'none' },
        ...(origen === 'camara' ? { capture: 'environment' } : {}),
    };
    return (_jsx(Modal, { opened: opened, onClose: onClose, title: origen === 'camara' ? 'Fotografiar el documento' : 'Subir fotos del documento', size: "md", centered: true, zIndex: 400, children: _jsxs(Stack, { gap: "sm", children: [_jsxs(SimpleGrid, { cols: 2, spacing: "sm", children: [_jsx(Hueco, { titulo: "Anverso", ayuda: "La cara con la foto y el n\u00FAmero.", foto: anverso, origen: origen, onElegir: () => anversoRef.current?.click(), onQuitar: quitar(setAnverso) }), _jsx(Hueco, { titulo: "Reverso", ayuda: "Opcional. Solo hace falta para el domicilio.", foto: reverso, origen: origen, onElegir: () => reversoRef.current?.click(), onQuitar: quitar(setReverso) })] }), _jsx(Text, { size: "xs", c: "dimmed", children: "La foto no se guarda: se procesa y se descarta." }), _jsxs(Group, { justify: "flex-end", children: [_jsx(Button, { variant: "subtle", color: "gray", onClick: onClose, children: "Cancelar" }), _jsx(Button, { color: "serene", leftSection: _jsx(ScanLine, { size: 16 }), onClick: leer, disabled: !anverso, children: "Leer documento" })] }), _jsx("input", { ref: anversoRef, ...inputProps, onChange: (e) => { asignar(setAnverso)(e.currentTarget.files); e.currentTarget.value = ''; } }), _jsx("input", { ref: reversoRef, ...inputProps, onChange: (e) => { asignar(setReverso)(e.currentTarget.files); e.currentTarget.value = ''; } })] }) }));
}
//# sourceMappingURL=DocumentFacesPicker.js.map