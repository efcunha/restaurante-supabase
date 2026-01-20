import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, MutationRef, MutationPromise } from 'firebase/data-connect';

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

interface CreateVendorRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateVendorVariables): MutationRef<CreateVendorData, CreateVendorVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateVendorVariables): MutationRef<CreateVendorData, CreateVendorVariables>;
  operationName: string;
}
export const createVendorRef: CreateVendorRef;

export function createVendor(vars: CreateVendorVariables): MutationPromise<CreateVendorData, CreateVendorVariables>;
export function createVendor(dc: DataConnect, vars: CreateVendorVariables): MutationPromise<CreateVendorData, CreateVendorVariables>;

interface ListProductsByVendorRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListProductsByVendorVariables): QueryRef<ListProductsByVendorData, ListProductsByVendorVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ListProductsByVendorVariables): QueryRef<ListProductsByVendorData, ListProductsByVendorVariables>;
  operationName: string;
}
export const listProductsByVendorRef: ListProductsByVendorRef;

export function listProductsByVendor(vars: ListProductsByVendorVariables): QueryPromise<ListProductsByVendorData, ListProductsByVendorVariables>;
export function listProductsByVendor(dc: DataConnect, vars: ListProductsByVendorVariables): QueryPromise<ListProductsByVendorData, ListProductsByVendorVariables>;

interface UpdateProductStockRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateProductStockVariables): MutationRef<UpdateProductStockData, UpdateProductStockVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpdateProductStockVariables): MutationRef<UpdateProductStockData, UpdateProductStockVariables>;
  operationName: string;
}
export const updateProductStockRef: UpdateProductStockRef;

export function updateProductStock(vars: UpdateProductStockVariables): MutationPromise<UpdateProductStockData, UpdateProductStockVariables>;
export function updateProductStock(dc: DataConnect, vars: UpdateProductStockVariables): MutationPromise<UpdateProductStockData, UpdateProductStockVariables>;

interface ListOrdersByCustomerNameRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListOrdersByCustomerNameVariables): QueryRef<ListOrdersByCustomerNameData, ListOrdersByCustomerNameVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ListOrdersByCustomerNameVariables): QueryRef<ListOrdersByCustomerNameData, ListOrdersByCustomerNameVariables>;
  operationName: string;
}
export const listOrdersByCustomerNameRef: ListOrdersByCustomerNameRef;

export function listOrdersByCustomerName(vars: ListOrdersByCustomerNameVariables): QueryPromise<ListOrdersByCustomerNameData, ListOrdersByCustomerNameVariables>;
export function listOrdersByCustomerName(dc: DataConnect, vars: ListOrdersByCustomerNameVariables): QueryPromise<ListOrdersByCustomerNameData, ListOrdersByCustomerNameVariables>;

