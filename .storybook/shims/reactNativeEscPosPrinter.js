const mockPrinters = [{ name: 'Storybook Printer', target: 'storybook-printer-01' }];

const reactNativeEscPosPrinter = {
  async discover() {
    return mockPrinters;
  },

  async connect() {
    return true;
  },

  async disconnect() {
    return true;
  },

  async printText() {
    return true;
  },

  async cutPaper() {
    return true;
  },

  async isConnected() {
    return true;
  },
};

export default reactNativeEscPosPrinter;
module.exports = reactNativeEscPosPrinter;
