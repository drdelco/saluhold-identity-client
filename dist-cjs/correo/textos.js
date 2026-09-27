"use strict";
// Textos FIJOS del marco del correo (pie, remitente, enlace alternativo) en los
// idiomas de la suite. El cuerpo lo escribe cada app en su idioma: aquí solo
// vive lo que pone `renderCorreo` por su cuenta.
//
// Los doce idiomas son los de `IDIOMAS` en
// sanacloud/functions/email-textos-paciente.js (y los del pie de SaluFirst),
// con sus mismas frases: quien compare un correo nuevo con uno de hoy lee lo
// mismo. El árabe NO es de la suite: está para que el marco sepa componerse de
// derecha a izquierda (la muestra RTL de la galería) el día que se añada un
// idioma así. Un idioma que no esté aquí cae al castellano.
Object.defineProperty(exports, "__esModule", { value: true });
exports.esRtl = exports.idiomaDelMarco = exports.TEXTOS_MARCO = exports.IDIOMAS_SUITE = void 0;
exports.IDIOMAS_SUITE = ['es', 'ca', 'en', 'fr', 'pt', 'it', 'de', 'nl', 'sv', 'no', 'ru', 'zh'];
/** Idiomas que se escriben de derecha a izquierda. */
const RTL = new Set(['ar', 'he', 'fa', 'ur']);
exports.TEXTOS_MARCO = {
    es: { universo: 'Parte del universo {saluhold}', derechos: 'Todos los derechos reservados.', enviadoCon: 'Enviado con {app}', enviadoMediante: 'Enviado mediante {app}', via: 'vía', enlaceAlternativo: 'Si el botón no se muestra correctamente, copie y pegue esta dirección en su navegador:', tel: 'Tel.' },
    ca: { universo: 'Part de l’univers {saluhold}', derechos: 'Tots els drets reservats.', enviadoCon: 'Enviat amb {app}', enviadoMediante: 'Enviat mitjançant {app}', via: 'via', enlaceAlternativo: 'Si el botó no es mostra correctament, copiï i enganxi aquesta adreça al navegador:', tel: 'Tel.' },
    en: { universo: 'Part of the {saluhold} universe', derechos: 'All rights reserved.', enviadoCon: 'Sent with {app}', enviadoMediante: 'Sent via {app}', via: 'via', enlaceAlternativo: 'If the button does not display correctly, copy and paste this address into your browser:', tel: 'Tel.' },
    fr: { universo: 'Membre de l’univers {saluhold}', derechos: 'Tous droits réservés.', enviadoCon: 'Envoyé avec {app}', enviadoMediante: 'Envoyé via {app}', via: 'via', enlaceAlternativo: 'Si le bouton ne s’affiche pas correctement, copiez et collez cette adresse dans votre navigateur :', tel: 'Tél.' },
    pt: { universo: 'Parte do universo {saluhold}', derechos: 'Todos os direitos reservados.', enviadoCon: 'Enviado com {app}', enviadoMediante: 'Enviado através de {app}', via: 'via', enlaceAlternativo: 'Se o botão não aparecer corretamente, copie e cole este endereço no seu navegador:', tel: 'Tel.' },
    it: { universo: 'Parte dell’universo {saluhold}', derechos: 'Tutti i diritti riservati.', enviadoCon: 'Inviato con {app}', enviadoMediante: 'Inviato tramite {app}', via: 'tramite', enlaceAlternativo: 'Se il pulsante non viene visualizzato correttamente, copia e incolla questo indirizzo nel browser:', tel: 'Tel.' },
    de: { universo: 'Teil des {saluhold}-Universums', derechos: 'Alle Rechte vorbehalten.', enviadoCon: 'Gesendet mit {app}', enviadoMediante: 'Gesendet über {app}', via: 'über', enlaceAlternativo: 'Falls die Schaltfläche nicht richtig angezeigt wird, kopieren Sie diese Adresse in Ihren Browser:', tel: 'Tel.' },
    nl: { universo: 'Onderdeel van het {saluhold}-universum', derechos: 'Alle rechten voorbehouden.', enviadoCon: 'Verzonden met {app}', enviadoMediante: 'Verzonden via {app}', via: 'via', enlaceAlternativo: 'Wordt de knop niet goed weergegeven? Kopieer dit adres dan naar uw browser:', tel: 'Tel.' },
    sv: { universo: 'En del av {saluhold}-universumet', derechos: 'Alla rättigheter förbehållna.', enviadoCon: 'Skickat med {app}', enviadoMediante: 'Skickat via {app}', via: 'via', enlaceAlternativo: 'Om knappen inte visas korrekt, kopiera och klistra in den här adressen i din webbläsare:', tel: 'Tel.' },
    no: { universo: 'En del av {saluhold}-universet', derechos: 'Alle rettigheter forbeholdt.', enviadoCon: 'Sendt med {app}', enviadoMediante: 'Sendt via {app}', via: 'via', enlaceAlternativo: 'Hvis knappen ikke vises riktig, kopier og lim inn denne adressen i nettleseren:', tel: 'Tlf.' },
    ru: { universo: 'Часть экосистемы {saluhold}', derechos: 'Все права защищены.', enviadoCon: 'Отправлено с помощью {app}', enviadoMediante: 'Отправлено через {app}', via: 'через', enlaceAlternativo: 'Если кнопка отображается неправильно, скопируйте этот адрес и вставьте его в браузер:', tel: 'Тел.' },
    zh: { universo: '{saluhold} 生态系统成员', derechos: '版权所有。', enviadoCon: '由 {app} 发送', enviadoMediante: '通过 {app} 发送', via: '经由', enlaceAlternativo: '如果按钮无法正常显示，请将此地址复制并粘贴到浏览器中：', tel: '电话' },
    // Fuera de la suite: solo para el marco de derecha a izquierda.
    ar: { universo: 'جزء من منظومة {saluhold}', derechos: 'جميع الحقوق محفوظة.', enviadoCon: 'أُرسلت باستخدام {app}', enviadoMediante: 'أُرسلت عبر {app}', via: 'عبر', enlaceAlternativo: 'إذا لم يظهر الزر بشكل صحيح، فانسخ هذا العنوان والصقه في متصفحك:', tel: 'هاتف' },
};
/** Código de dos letras del idioma pedido, o `es` si no hay textos para él. */
function idiomaDelMarco(idioma) {
    const c = String(idioma || '').toLowerCase().slice(0, 2);
    return exports.TEXTOS_MARCO[c] ? c : 'es';
}
exports.idiomaDelMarco = idiomaDelMarco;
function esRtl(idioma) {
    return RTL.has(idioma);
}
exports.esRtl = esRtl;
//# sourceMappingURL=textos.js.map