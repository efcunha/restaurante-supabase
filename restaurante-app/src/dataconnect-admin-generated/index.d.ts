import { ConnectorConfig, DataConnect, OperationOptions, ExecuteOperationResponse } from 'firebase-admin/data-connect';

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;


export interface CreateVendorData {
  vendor_insert: Vendor_Key;
}

export interface CreateVendorVariables {
  name: string;
  email?: string | null;
  phone?: string | null;
}

export interface ListOrdersByCustomerNameData {
  orders: ({
    id: UUIDString;
    customerName?: string | null;
    customerLocation?: string | null;
    orderDate: DateString;
    status: string;
  } & Order_Key)[];
}

export interface ListOrdersByCustomerNameVariables {
  customerName: string;
}

export interface ListProductsByVendorData {
  products: ({
    id: UUIDString;
    name: string;
    description?: string | null;
    price: number;
  } & Product_Key)[];
}

export interface ListProductsByVendorVariables {
  vendorId: UUIDString;
}

export interface OrderItem_Key {
  orderId: UUIDString;
  productId: UUIDString;
  __typename?: 'OrderItem_Key';
}

export interface Order_Key {
  id: UUIDString;
  __typename?: 'Order_Key';
}

export interface Product_Key {
  id: UUIDString;
  __typename?: 'Product_Key';
}

export interface UpdateProductStockData {
  product_update?: Product_Key | null;
}

export interface UpdateProductStockVariables {
  id: UUIDString;
  stock: number;
}

export interface Vendor_Key {
  id: UUIDString;
  __typename?: 'Vendor_Key';
}

/** Generated Node Admin SDK operation action function for the 'CreateVendor' Mutation. Allow users to execute without passing in DataConnect. */
export function createVendor(dc: DataConnect, vars: CreateVendorVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateVendorData>>;
/** Generated Node Admin SDK operation action function for the 'CreateVendor' Mutation. Allow users to pass in custom DataConnect instances. */
export function createVendor(vars: CreateVendorVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateVendorData>>;

/** Generated Node Admin SDK operation action function for the 'ListProductsByVendor' Query. Allow users to execute without passing in DataConnect. */
export function listProductsByVendor(dc: DataConnect, vars: ListProductsByVendorVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListProductsByVendorData>>;
/** Generated Node Admin SDK operation action function for the 'ListProductsByVendor' Query. Allow users to pass in custom DataConnect instances. */
export function listProductsByVendor(vars: ListProductsByVendorVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListProductsByVendorData>>;

/** Generated Node Admin SDK operation action function for the 'UpdateProductStock' Mutation. Allow users to execute without passing in DataConnect. */
export function updateProductStock(dc: DataConnect, vars: UpdateProductStockVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdateProductStockData>>;
/** Generated Node Admin SDK operation action function for the 'UpdateProductStock' Mutation. Allow users to pass in custom DataConnect instances. */
export function updateProductStock(vars: UpdateProductStockVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdateProductStockData>>;

/** Generated Node Admin SDK operation action function for the 'ListOrdersByCustomerName' Query. Allow users to execute without passing in DataConnect. */
export function listOrdersByCustomerName(dc: DataConnect, vars: ListOrdersByCustomerNameVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListOrdersByCustomerNameData>>;
/** Generated Node Admin SDK operation action function for the 'ListOrdersByCustomerName' Query. Allow users to pass in custom DataConnect instances. */
export function listOrdersByCustomerName(vars: ListOrdersByCustomerNameVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListOrdersByCustomerNameData>>;

