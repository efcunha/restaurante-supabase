/**
 * Mock do PrinterService para plataforma web
 * Retorna funções vazias que não fazem nada
 */

export default {
  discover: () => {
    return Promise.resolve([]);
  },
  connect: () => {
    return Promise.resolve(false);
  },
  disconnect: () => {
    return Promise.resolve();
  },
  printText: () => {
    return Promise.resolve();
  },
  printImage: () => {
    return Promise.resolve();
  },
  cutPaper: () => {
    return Promise.resolve();
  },
};
