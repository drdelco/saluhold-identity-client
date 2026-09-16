import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Stack, Group, Box, Text, TextInput, NativeSelect, Select, SimpleGrid } from '@mantine/core';
import { OPCIONES_SEXO } from '../sexo';
import { validarIdentificador } from '../identificador';
import { pide, } from './altaPaciente';
import { textosUI, interpolar } from './textos';
export default function CamposAltaPaciente({ perfil, valores, onChange, provisional = false, disabled = false, revisar = [], paises, idiomas, prefijoSlot, secciones = true, autoFocusNombre = false, }) {
    const t = textosUI();
    const marca = (campo) => (revisar.includes(campo) ? t.avisoRevisar : undefined);
    const Seccion = ({ children }) => secciones ? _jsx(Text, { size: "sm", fw: 600, c: "dimmed", tt: "uppercase", children: children }) : null;
    // El VALOR es el contrato de Identity ('H' es hombre, 'M' es MUJER) y no se
    // traduce nunca; lo único que cambia de idioma es el rótulo.
    const rotuloSexo = {
        H: t.sexoHombre, M: t.sexoMujer, O: t.sexoOtro,
    };
    // Solo se comprueba la letra de un DNI o un NIE; un pasaporte no la tiene, y
    // ahí `validarIdentificador` devuelve 'no-aplica'.
    const validacion = !provisional && valores.nif.trim() ? validarIdentificador(valores.nif) : null;
    // El aviso se redacta AQUÍ y no se usa `validacion.mensaje`: ese lo compone el
    // núcleo, que comparten también las Cloud Functions, y viene siempre en
    // castellano. Los datos del fallo sí salen de allí.
    const errorNif = validacion?.estado === 'invalido'
        ? interpolar(validacion.tipo === 'DNI' ? t.nifLetraIncorrectaDni : t.nifLetraIncorrectaNie, {
            numero: validacion.normalizado.slice(0, 8),
            esperada: validacion.letraEsperada,
            letra: validacion.normalizado.slice(8),
        })
        : undefined;
    return (_jsxs(Stack, { gap: "md", children: [_jsx(Seccion, { children: t.seccionIdentidad }), !provisional && pide(perfil, 'nif') && (_jsx(TextInput, { label: t.nif, placeholder: t.nifPlaceholder, required: true, disabled: disabled, value: valores.nif, onChange: (e) => {
                    const v = e.currentTarget.value.toUpperCase();
                    onChange({ nif: v });
                }, error: errorNif, description: validacion?.estado === 'valido'
                    ? interpolar(t.nifValido, { tipo: validacion.tipo })
                    : marca('nif'), styles: { input: { fontFamily: 'monospace' } } })), _jsxs(SimpleGrid, { cols: 2, children: [_jsx(TextInput, { label: t.nombre, required: true, autoFocus: autoFocusNombre, disabled: disabled, value: valores.nombre, onChange: (e) => { const v = e.currentTarget.value; onChange({ nombre: v }); }, description: marca('nombre') }), _jsx(TextInput, { label: t.apellidos, required: true, disabled: disabled, value: valores.apellidos, onChange: (e) => { const v = e.currentTarget.value; onChange({ apellidos: v }); }, description: marca('apellidos') })] }), _jsx(Seccion, { children: t.seccionContacto }), _jsxs(SimpleGrid, { cols: 2, children: [_jsx(TextInput, { label: t.email, type: "email", required: provisional, disabled: disabled, value: valores.email, onChange: (e) => { const v = e.currentTarget.value; onChange({ email: v }); } }), _jsxs(Box, { children: [_jsxs(Text, { size: "sm", fw: 500, mb: 2, children: [t.telefono, provisional ? ' *' : ''] }), _jsxs(Group, { gap: 6, wrap: "nowrap", align: "flex-start", children: [prefijoSlot, _jsx(TextInput, { type: "tel", style: { flex: 1 }, disabled: disabled, value: valores.telefono, onChange: (e) => { const v = e.currentTarget.value; onChange({ telefono: v }); } })] })] })] }), provisional && (_jsx(Text, { size: "xs", c: "dimmed", children: t.contactoObligatorioProvisional })), (pide(perfil, 'sexo') || pide(perfil, 'fechaNacimiento') || pide(perfil, 'idiomaInforme')) && (_jsxs(SimpleGrid, { cols: 3, children: [pide(perfil, 'sexo') && (_jsx(NativeSelect, { label: t.sexo, disabled: disabled, value: valores.sexo, onChange: (e) => { const v = e.currentTarget.value; onChange({ sexo: v }); }, data: [
                            { value: '', label: t.seleccionar },
                            ...OPCIONES_SEXO.map(o => ({ value: o.value, label: rotuloSexo[o.value] })),
                        ], description: marca('sexo') })), pide(perfil, 'fechaNacimiento') && (_jsx(TextInput, { label: t.fechaNacimiento, type: "date", disabled: disabled, value: valores.fechaNacimiento, onChange: (e) => { const v = e.currentTarget.value; onChange({ fechaNacimiento: v }); }, description: marca('fechaNacimiento') })), pide(perfil, 'idiomaInforme') && idiomas && (_jsx(NativeSelect, { label: t.idiomaInformes, disabled: disabled, value: valores.idiomaInforme, onChange: (e) => { const v = e.currentTarget.value; onChange({ idiomaInforme: v }); }, data: idiomas }))] })), pide(perfil, 'nacionalidad') && (_jsx(Select, { label: t.nacionalidad, searchable: true, clearable: true, nothingFoundMessage: t.sinCoincidencias, placeholder: t.sinEspecificar, disabled: disabled, value: valores.nacionalidad || null, onChange: (v) => onChange({ nacionalidad: v || '' }), data: paises, description: marca('nacionalidad') })), pide(perfil, 'direccion') && (_jsxs(Stack, { gap: "sm", children: [_jsx(Seccion, { children: t.seccionDireccion }), _jsx(TextInput, { label: t.direccion, disabled: disabled, value: valores.calle, onChange: (e) => { const v = e.currentTarget.value; onChange({ calle: v }); }, description: marca('calle') }), _jsxs(SimpleGrid, { cols: 4, children: [_jsx(TextInput, { label: t.codigoPostal, disabled: disabled, value: valores.codigoPostal, onChange: (e) => { const v = e.currentTarget.value; onChange({ codigoPostal: v }); }, description: marca('codigoPostal') }), _jsx(TextInput, { label: t.poblacion, disabled: disabled, value: valores.poblacion, onChange: (e) => { const v = e.currentTarget.value; onChange({ poblacion: v }); }, description: marca('poblacion') }), _jsx(TextInput, { label: t.provincia, disabled: disabled, value: valores.provincia, onChange: (e) => { const v = e.currentTarget.value; onChange({ provincia: v }); }, description: marca('provincia') }), _jsx(Select, { label: t.pais, searchable: true, allowDeselect: false, nothingFoundMessage: t.sinCoincidencias, disabled: disabled, value: valores.pais || null, onChange: (v) => onChange({ pais: v || '' }), data: paises })] }), _jsx(Text, { size: "xs", c: "dimmed", children: t.avisoNormalizacionEspana })] }))] }));
}
//# sourceMappingURL=CamposAltaPaciente.js.map