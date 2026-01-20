import { queryRef, executeQuery, mutationRef, executeMutation, validateArgs } from 'firebase/data-connect';

export const connectorConfig = {
  connector: 'example',
  service: 'dona-cida',
  location: 'us-east4'
};

export const createVendorRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateVendor', inputVars);
}
createVendorRef.operationName = 'CreateVendor';

export function createVendor(dcOrVars, vars) {
  return executeMutation(createVendorRef(dcOrVars, vars));
}

export const listProductsByVendorRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListProductsByVendor', inputVars);
}
listProductsByVendorRef.operationName = 'ListProductsByVendor';

export function listProductsByVendor(dcOrVars, vars) {
  return executeQuery(listProductsByVendorRef(dcOrVars, vars));
}

export const updateProductStockRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpdateProductStock', inputVars);
}
updateProductStockRef.operationName = 'UpdateProductStock';

export function updateProductStock(dcOrVars, vars) {
  return executeMutation(updateProductStockRef(dcOrVars, vars));
}

export const listOrdersByCustomerNameRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListOrdersByCustomerName', inputVars);
}
listOrdersByCustomerNameRef.operationName = 'ListOrdersByCustomerName';

export function listOrdersByCustomerName(dcOrVars, vars) {
  return executeQuery(listOrdersByCustomerNameRef(dcOrVars, vars));
}

