const { queryRef, executeQuery, mutationRef, executeMutation, validateArgs } = require('firebase/data-connect');

const connectorConfig = {
  connector: 'example',
  service: 'dona-cida',
  location: 'us-east4'
};
exports.connectorConfig = connectorConfig;

const createVendorRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateVendor', inputVars);
}
createVendorRef.operationName = 'CreateVendor';
exports.createVendorRef = createVendorRef;

exports.createVendor = function createVendor(dcOrVars, vars) {
  return executeMutation(createVendorRef(dcOrVars, vars));
};

const listProductsByVendorRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListProductsByVendor', inputVars);
}
listProductsByVendorRef.operationName = 'ListProductsByVendor';
exports.listProductsByVendorRef = listProductsByVendorRef;

exports.listProductsByVendor = function listProductsByVendor(dcOrVars, vars) {
  return executeQuery(listProductsByVendorRef(dcOrVars, vars));
};

const updateProductStockRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpdateProductStock', inputVars);
}
updateProductStockRef.operationName = 'UpdateProductStock';
exports.updateProductStockRef = updateProductStockRef;

exports.updateProductStock = function updateProductStock(dcOrVars, vars) {
  return executeMutation(updateProductStockRef(dcOrVars, vars));
};

const listOrdersByCustomerNameRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListOrdersByCustomerName', inputVars);
}
listOrdersByCustomerNameRef.operationName = 'ListOrdersByCustomerName';
exports.listOrdersByCustomerNameRef = listOrdersByCustomerNameRef;

exports.listOrdersByCustomerName = function listOrdersByCustomerName(dcOrVars, vars) {
  return executeQuery(listOrdersByCustomerNameRef(dcOrVars, vars));
};
