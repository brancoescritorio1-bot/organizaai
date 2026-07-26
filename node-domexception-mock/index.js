// Mock para node-domexception que expõe a DOMException nativa
// Disponível nativamente no escopo global em ambientes Node.js modernos (18+)
module.exports = globalThis.DOMException || Error;
