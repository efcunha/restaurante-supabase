const { test } = require('@playwright/test');
test('get index', () => {
    console.log(test.info().parallelIndex, test.info().workerIndex, test.info().repeatEachIndex);
});
