"use strict";
/**
 * pais.ts — traductor ÚNICO entre el nombre de un país y su código ISO 3166-1
 * alfa-2.
 *
 * POR QUÉ
 * Identity guarda el país de pacientes y empresas como TEXTO en
 * `direccion.pais` («España», «Francia»: lo que pinta el selector de las apps),
 * y así se queda (Diego, 2026-10-15: «el país ya se guarda»). Pero VERI*FACTU
 * declara el país de un destinatario extranjero con su código ISO (CodigoPais
 * de IDOtro), y SaluFact lo necesita al emitir. La traducción se hace en la
 * FRONTERA, en quien la necesita, y con una sola tabla: si cada app adivina por
 * su cuenta, una reconoce «Luxemburgo» y otra lo declara español (le pasó a
 * SaluFact hasta el 2026-10-15).
 *
 * LA TABLA: los 249 códigos de la ISO 3166-1 más XK (Kosovo, que ofrecen los
 * selectores de la suite). El nombre es el que escriben esos selectores (la
 * lista `PAISES` de las apps) y, para los territorios que no están en ella, el
 * de CLDR en castellano. Cada país reconoce además su nombre CLDR en castellano
 * y en inglés y unos pocos alias de uso común (Holanda, EE. UU., Inglaterra…).
 * La tabla está escrita aquí, no se calcula con `Intl.DisplayNames`: CLDR
 * cambia nombres entre versiones («República Checa» → «Chequia») y la app
 * nativa no siempre lo tiene; un traductor que da resultados distintos según
 * el motor no es un traductor.
 *
 * Se compara sin tildes, sin mayúsculas y sin signos: «PAÍSES BAJOS», «paises
 * bajos» y «Países-Bajos» son lo mismo. Lo que no se reconoce devuelve null:
 * NUNCA se supone España.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.nombrePaisDe = exports.codigoPaisDe = exports.esCodigoPais = exports.PAISES_ISO = void 0;
/** [código, nombre, ...otros nombres que también se reconocen] */
const TABLA = [
    ['AD', 'Andorra'],
    ['AE', 'Emiratos Árabes Unidos', 'United Arab Emirates'],
    ['AF', 'Afganistán', 'Afghanistan'],
    ['AG', 'Antigua y Barbuda', 'Antigua & Barbuda'],
    ['AI', 'Anguila', 'Anguilla'],
    ['AL', 'Albania'],
    ['AM', 'Armenia'],
    ['AO', 'Angola'],
    ['AQ', 'Antártida', 'Antarctica'],
    ['AR', 'Argentina'],
    ['AS', 'Samoa Americana', 'American Samoa'],
    ['AT', 'Austria'],
    ['AU', 'Australia'],
    ['AW', 'Aruba'],
    ['AX', 'Islas Åland', 'Islas Aland', 'Åland Islands'],
    ['AZ', 'Azerbaiyán', 'Azerbaijan'],
    ['BA', 'Bosnia y Herzegovina', 'Bosnia & Herzegovina'],
    ['BB', 'Barbados'],
    ['BD', 'Bangladés', 'Bangladesh'],
    ['BE', 'Bélgica', 'Belgium'],
    ['BF', 'Burkina Faso'],
    ['BG', 'Bulgaria'],
    ['BH', 'Baréin', 'Bahrain'],
    ['BI', 'Burundi'],
    ['BJ', 'Benín', 'Benin'],
    ['BL', 'San Bartolomé', 'St. Barthélemy'],
    ['BM', 'Bermudas', 'Bermuda'],
    ['BN', 'Brunéi', 'Brunei'],
    ['BO', 'Bolivia'],
    ['BQ', 'Caribe neerlandés', 'Caribbean Netherlands'],
    ['BR', 'Brasil', 'Brazil'],
    ['BS', 'Bahamas'],
    ['BT', 'Bután', 'Bhutan'],
    ['BV', 'Isla Bouvet', 'Bouvet Island'],
    ['BW', 'Botsuana', 'Botswana'],
    ['BY', 'Bielorrusia', 'Belarus'],
    ['BZ', 'Belice', 'Belize'],
    ['CA', 'Canadá', 'Canada'],
    ['CC', 'Islas Cocos', 'Cocos (Keeling) Islands'],
    ['CD', 'República Democrática del Congo', 'Congo - Kinshasa'],
    ['CF', 'República Centroafricana', 'Central African Republic'],
    ['CG', 'República del Congo', 'Congo', 'Congo - Brazzaville'],
    ['CH', 'Suiza', 'Switzerland'],
    ['CI', 'Costa de Marfil', 'Côte d’Ivoire'],
    ['CK', 'Islas Cook', 'Cook Islands'],
    ['CL', 'Chile'],
    ['CM', 'Camerún', 'Cameroon'],
    ['CN', 'China'],
    ['CO', 'Colombia'],
    ['CR', 'Costa Rica'],
    ['CU', 'Cuba'],
    ['CV', 'Cabo Verde', 'Cape Verde'],
    ['CW', 'Curazao', 'Curaçao'],
    ['CX', 'Isla de Navidad', 'Christmas Island'],
    ['CY', 'Chipre', 'Cyprus'],
    ['CZ', 'República Checa', 'Chequia', 'Czechia'],
    ['DE', 'Alemania', 'Germany'],
    ['DJ', 'Yibuti', 'Djibouti'],
    ['DK', 'Dinamarca', 'Denmark'],
    ['DM', 'Dominica'],
    ['DO', 'República Dominicana', 'Dominican Republic'],
    ['DZ', 'Argelia', 'Algeria'],
    ['EC', 'Ecuador'],
    ['EE', 'Estonia'],
    ['EG', 'Egipto', 'Egypt'],
    ['EH', 'Sáhara Occidental', 'Western Sahara'],
    ['ER', 'Eritrea'],
    ['ES', 'España', 'Spain'],
    ['ET', 'Etiopía', 'Ethiopia'],
    ['FI', 'Finlandia', 'Finland'],
    ['FJ', 'Fiyi', 'Fiji'],
    ['FK', 'Islas Malvinas', 'Falkland Islands'],
    ['FM', 'Micronesia'],
    ['FO', 'Islas Feroe', 'Faroe Islands'],
    ['FR', 'Francia', 'France'],
    ['GA', 'Gabón', 'Gabon'],
    ['GB', 'Reino Unido', 'United Kingdom'],
    ['GD', 'Granada', 'Grenada'],
    ['GE', 'Georgia'],
    ['GF', 'Guayana Francesa', 'French Guiana'],
    ['GG', 'Guernesey', 'Guernsey'],
    ['GH', 'Ghana'],
    ['GI', 'Gibraltar'],
    ['GL', 'Groenlandia', 'Greenland'],
    ['GM', 'Gambia'],
    ['GN', 'Guinea'],
    ['GP', 'Guadalupe', 'Guadeloupe'],
    ['GQ', 'Guinea Ecuatorial', 'Equatorial Guinea'],
    ['GR', 'Grecia', 'Greece'],
    ['GS', 'Islas Georgia del Sur y Sandwich del Sur', 'South Georgia & South Sandwich Islands'],
    ['GT', 'Guatemala'],
    ['GU', 'Guam'],
    ['GW', 'Guinea-Bisáu', 'Guinea-Bissau'],
    ['GY', 'Guyana'],
    ['HK', 'Hong Kong', 'RAE de Hong Kong (China)', 'Hong Kong SAR China'],
    ['HM', 'Islas Heard y McDonald', 'Heard & McDonald Islands'],
    ['HN', 'Honduras'],
    ['HR', 'Croacia', 'Croatia'],
    ['HT', 'Haití', 'Haiti'],
    ['HU', 'Hungría', 'Hungary'],
    ['ID', 'Indonesia'],
    ['IE', 'Irlanda', 'Ireland'],
    ['IL', 'Israel'],
    ['IM', 'Isla de Man', 'Isle of Man'],
    ['IN', 'India'],
    ['IO', 'Territorio Británico del Océano Índico', 'British Indian Ocean Territory'],
    ['IQ', 'Irak', 'Iraq'],
    ['IR', 'Irán', 'Iran'],
    ['IS', 'Islandia', 'Iceland'],
    ['IT', 'Italia', 'Italy'],
    ['JE', 'Jersey'],
    ['JM', 'Jamaica'],
    ['JO', 'Jordania', 'Jordan'],
    ['JP', 'Japón', 'Japan'],
    ['KE', 'Kenia', 'Kenya'],
    ['KG', 'Kirguistán', 'Kyrgyzstan'],
    ['KH', 'Camboya', 'Cambodia'],
    ['KI', 'Kiribati'],
    ['KM', 'Comoras', 'Comoros'],
    ['KN', 'San Cristóbal y Nieves', 'St. Kitts & Nevis'],
    ['KP', 'Corea del Norte', 'North Korea'],
    ['KR', 'Corea del Sur', 'South Korea'],
    ['KW', 'Kuwait'],
    ['KY', 'Islas Caimán', 'Cayman Islands'],
    ['KZ', 'Kazajistán', 'Kazakhstan'],
    ['LA', 'Laos'],
    ['LB', 'Líbano', 'Lebanon'],
    ['LC', 'Santa Lucía', 'St. Lucia'],
    ['LI', 'Liechtenstein'],
    ['LK', 'Sri Lanka'],
    ['LR', 'Liberia'],
    ['LS', 'Lesoto', 'Lesotho'],
    ['LT', 'Lituania', 'Lithuania'],
    ['LU', 'Luxemburgo', 'Luxembourg'],
    ['LV', 'Letonia', 'Latvia'],
    ['LY', 'Libia', 'Libya'],
    ['MA', 'Marruecos', 'Morocco'],
    ['MC', 'Mónaco', 'Monaco'],
    ['MD', 'Moldavia', 'Moldova'],
    ['ME', 'Montenegro'],
    ['MF', 'San Martín', 'St. Martin'],
    ['MG', 'Madagascar'],
    ['MH', 'Islas Marshall', 'Marshall Islands'],
    ['MK', 'Macedonia del Norte', 'North Macedonia'],
    ['ML', 'Malí', 'Mali'],
    ['MM', 'Birmania (Myanmar)', 'Myanmar (Birmania)', 'Myanmar (Burma)'],
    ['MN', 'Mongolia'],
    ['MO', 'Macao', 'RAE de Macao (China)', 'Macao SAR China'],
    ['MP', 'Islas Marianas del Norte', 'Northern Mariana Islands'],
    ['MQ', 'Martinica', 'Martinique'],
    ['MR', 'Mauritania'],
    ['MS', 'Montserrat'],
    ['MT', 'Malta'],
    ['MU', 'Mauricio', 'Mauritius'],
    ['MV', 'Maldivas', 'Maldives'],
    ['MW', 'Malaui', 'Malawi'],
    ['MX', 'México', 'Mexico'],
    ['MY', 'Malasia', 'Malaysia'],
    ['MZ', 'Mozambique'],
    ['NA', 'Namibia'],
    ['NC', 'Nueva Caledonia', 'New Caledonia'],
    ['NE', 'Níger', 'Niger'],
    ['NF', 'Isla Norfolk', 'Norfolk Island'],
    ['NG', 'Nigeria'],
    ['NI', 'Nicaragua'],
    ['NL', 'Países Bajos', 'Netherlands'],
    ['NO', 'Noruega', 'Norway'],
    ['NP', 'Nepal'],
    ['NR', 'Nauru'],
    ['NU', 'Niue'],
    ['NZ', 'Nueva Zelanda', 'New Zealand'],
    ['OM', 'Omán', 'Oman'],
    ['PA', 'Panamá', 'Panama'],
    ['PE', 'Perú', 'Peru'],
    ['PF', 'Polinesia Francesa', 'French Polynesia'],
    ['PG', 'Papúa Nueva Guinea', 'Papua New Guinea'],
    ['PH', 'Filipinas', 'Philippines'],
    ['PK', 'Pakistán', 'Pakistan'],
    ['PL', 'Polonia', 'Poland'],
    ['PM', 'San Pedro y Miquelón', 'St. Pierre & Miquelon'],
    ['PN', 'Islas Pitcairn', 'Pitcairn Islands'],
    ['PR', 'Puerto Rico'],
    ['PS', 'Palestina', 'Territorios Palestinos', 'Palestinian Territories'],
    ['PT', 'Portugal'],
    ['PW', 'Palaos', 'Palau'],
    ['PY', 'Paraguay'],
    ['QA', 'Catar', 'Qatar'],
    ['RE', 'Reunión', 'Réunion'],
    ['RO', 'Rumanía', 'Romania'],
    ['RS', 'Serbia'],
    ['RU', 'Rusia', 'Russia'],
    ['RW', 'Ruanda', 'Rwanda'],
    ['SA', 'Arabia Saudita', 'Arabia Saudí', 'Saudi Arabia'],
    ['SB', 'Islas Salomón', 'Solomon Islands'],
    ['SC', 'Seychelles'],
    ['SD', 'Sudán', 'Sudan'],
    ['SE', 'Suecia', 'Sweden'],
    ['SG', 'Singapur', 'Singapore'],
    ['SH', 'Santa Elena', 'St. Helena'],
    ['SI', 'Eslovenia', 'Slovenia'],
    ['SJ', 'Svalbard y Jan Mayen', 'Svalbard & Jan Mayen'],
    ['SK', 'Eslovaquia', 'Slovakia'],
    ['SL', 'Sierra Leona', 'Sierra Leone'],
    ['SM', 'San Marino'],
    ['SN', 'Senegal'],
    ['SO', 'Somalia'],
    ['SR', 'Surinam', 'Suriname'],
    ['SS', 'Sudán del Sur', 'South Sudan'],
    ['ST', 'Santo Tomé y Príncipe', 'São Tomé & Príncipe'],
    ['SV', 'El Salvador'],
    ['SX', 'Sint Maarten'],
    ['SY', 'Siria', 'Syria'],
    ['SZ', 'Esuatini', 'Eswatini'],
    ['TC', 'Islas Turcas y Caicos', 'Turks & Caicos Islands'],
    ['TD', 'Chad'],
    ['TF', 'Territorios Australes Franceses', 'French Southern Territories'],
    ['TG', 'Togo'],
    ['TH', 'Tailandia', 'Thailand'],
    ['TJ', 'Tayikistán', 'Tajikistan'],
    ['TK', 'Tokelau'],
    ['TL', 'Timor Oriental', 'Timor-Leste'],
    ['TM', 'Turkmenistán', 'Turkmenistan'],
    ['TN', 'Túnez', 'Tunisia'],
    ['TO', 'Tonga'],
    ['TR', 'Turquía', 'Türkiye'],
    ['TT', 'Trinidad y Tobago', 'Trinidad & Tobago'],
    ['TV', 'Tuvalu'],
    ['TW', 'Taiwán', 'Taiwan'],
    ['TZ', 'Tanzania'],
    ['UA', 'Ucrania', 'Ukraine'],
    ['UG', 'Uganda'],
    ['UM', 'Islas menores alejadas de EE. UU.', 'U.S. Outlying Islands'],
    ['US', 'Estados Unidos', 'United States'],
    ['UY', 'Uruguay'],
    ['UZ', 'Uzbekistán', 'Uzbekistan'],
    ['VA', 'Vaticano', 'Ciudad del Vaticano', 'Vatican City'],
    ['VC', 'San Vicente y las Granadinas', 'St. Vincent & Grenadines'],
    ['VE', 'Venezuela'],
    ['VG', 'Islas Vírgenes Británicas', 'British Virgin Islands'],
    ['VI', 'Islas Vírgenes de EE. UU.', 'U.S. Virgin Islands'],
    ['VN', 'Vietnam'],
    ['VU', 'Vanuatu'],
    ['WF', 'Wallis y Futuna', 'Wallis & Futuna'],
    ['WS', 'Samoa'],
    ['XK', 'Kosovo'],
    ['YE', 'Yemen'],
    ['YT', 'Mayotte'],
    ['ZA', 'Sudáfrica', 'South Africa'],
    ['ZM', 'Zambia'],
    ['ZW', 'Zimbabue', 'Zimbabwe'],
];
/**
 * Formas comunes que no son el nombre oficial (ya normalizadas: minúsculas, sin
 * tildes ni signos). Canarias, Ceuta y Melilla son España: es lo que alguien
 * escribe a veces en «país».
 */
const ALIAS = {
    'espanya': 'ES',
    'reino de espana': 'ES',
    'esp': 'ES',
    'canarias': 'ES',
    'islas canarias': 'ES',
    'ceuta': 'ES',
    'melilla': 'ES',
    'holanda': 'NL',
    'the netherlands': 'NL',
    'inglaterra': 'GB',
    'escocia': 'GB',
    'gales': 'GB',
    'irlanda del norte': 'GB',
    'gran bretana': 'GB',
    'great britain': 'GB',
    'england': 'GB',
    'scotland': 'GB',
    'wales': 'GB',
    'uk': 'GB',
    'eeuu': 'US',
    'ee uu': 'US',
    'usa': 'US',
    'u s a': 'US',
    'estados unidos de america': 'US',
    'united states of america': 'US',
    'emiratos arabes': 'AE',
    'arabia saudi': 'SA',
    'turkey': 'TR',
    'birmania': 'MM',
    'myanmar': 'MM',
    'suazilandia': 'SZ',
    'swaziland': 'SZ',
    'macedonia': 'MK',
    'moldova': 'MD',
    'santa sede': 'VA',
    'ciudad del vaticano': 'VA',
    'republica de irlanda': 'IE',
};
/** Sin tildes, sin signos, en minúsculas y con un solo espacio. */
function clave(texto) {
    return String(texto ?? '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}
/** Todos los países, ordenados por nombre en castellano. */
exports.PAISES_ISO = TABLA
    .map(([codigo, nombre]) => ({ codigo, nombre }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
const POR_CODIGO = new Map(TABLA.map(([codigo, nombre]) => [codigo, nombre]));
const POR_CLAVE = new Map();
for (const [codigo, ...nombres] of TABLA) {
    for (const n of nombres) {
        const k = clave(n);
        if (k && !POR_CLAVE.has(k))
            POR_CLAVE.set(k, codigo);
    }
}
for (const [k, codigo] of Object.entries(ALIAS))
    POR_CLAVE.set(k, codigo);
/** ¿Es un código ISO 3166-1 alfa-2 de la tabla? (mayúsculas exactas) */
function esCodigoPais(codigo) {
    return typeof codigo === 'string' && POR_CODIGO.has(codigo);
}
exports.esCodigoPais = esCodigoPais;
/**
 * El código ISO 3166-1 alfa-2 de un país escrito: «España» → ES, «paises
 * bajos» → NL, «United States» → US, «fr» → FR. null si no se reconoce (o si
 * viene vacío): nunca supone España.
 */
function codigoPaisDe(texto) {
    const limpio = String(texto ?? '').trim();
    if (!limpio)
        return null;
    if (/^[A-Za-z]{2}$/.test(limpio)) {
        const c = limpio.toUpperCase();
        if (POR_CODIGO.has(c))
            return c;
    }
    return POR_CLAVE.get(clave(limpio)) ?? null;
}
exports.codigoPaisDe = codigoPaisDe;
/** El nombre en castellano de un código ISO (el que guarda `direccion.pais`): FR → «Francia». */
function nombrePaisDe(codigo) {
    return POR_CODIGO.get(String(codigo ?? '').trim().toUpperCase()) ?? null;
}
exports.nombrePaisDe = nombrePaisDe;
//# sourceMappingURL=pais.js.map