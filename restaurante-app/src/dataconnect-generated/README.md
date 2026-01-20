# Generated TypeScript README
This README will guide you through the process of using the generated JavaScript SDK package for the connector `example`. It will also provide examples on how to use your generated SDK to call your Data Connect queries and mutations.

**If you're looking for the `React README`, you can find it at [`dataconnect-generated/react/README.md`](./react/README.md)**

***NOTE:** This README is generated alongside the generated SDK. If you make changes to this file, they will be overwritten when the SDK is regenerated.*

# Table of Contents
- [**Overview**](#generated-javascript-readme)
- [**Accessing the connector**](#accessing-the-connector)
  - [*Connecting to the local Emulator*](#connecting-to-the-local-emulator)
- [**Queries**](#queries)
  - [*ListProductsByVendor*](#listproductsbyvendor)
  - [*ListOrdersByCustomerName*](#listordersbycustomername)
- [**Mutations**](#mutations)
  - [*CreateVendor*](#createvendor)
  - [*UpdateProductStock*](#updateproductstock)

# Accessing the connector
A connector is a collection of Queries and Mutations. One SDK is generated for each connector - this SDK is generated for the connector `example`. You can find more information about connectors in the [Data Connect documentation](https://firebase.google.com/docs/data-connect#how-does).

You can use this generated SDK by importing from the package `@dataconnect/generated` as shown below. Both CommonJS and ESM imports are supported.

You can also follow the instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#set-client).

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
```

## Connecting to the local Emulator
By default, the connector will connect to the production service.

To connect to the emulator, you can use the following code.
You can also follow the emulator instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#instrument-clients).

```typescript
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
connectDataConnectEmulator(dataConnect, 'localhost', 9399);
```

After it's initialized, you can call your Data Connect [queries](#queries) and [mutations](#mutations) from your generated SDK.

# Queries

There are two ways to execute a Data Connect Query using the generated Web SDK:
- Using a Query Reference function, which returns a `QueryRef`
  - The `QueryRef` can be used as an argument to `executeQuery()`, which will execute the Query and return a `QueryPromise`
- Using an action shortcut function, which returns a `QueryPromise`
  - Calling the action shortcut function will execute the Query and return a `QueryPromise`

The following is true for both the action shortcut function and the `QueryRef` function:
- The `QueryPromise` returned will resolve to the result of the Query once it has finished executing
- If the Query accepts arguments, both the action shortcut function and the `QueryRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Query
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each query. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-queries).

## ListProductsByVendor
You can execute the `ListProductsByVendor` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listProductsByVendor(vars: ListProductsByVendorVariables): QueryPromise<ListProductsByVendorData, ListProductsByVendorVariables>;

interface ListProductsByVendorRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListProductsByVendorVariables): QueryRef<ListProductsByVendorData, ListProductsByVendorVariables>;
}
export const listProductsByVendorRef: ListProductsByVendorRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listProductsByVendor(dc: DataConnect, vars: ListProductsByVendorVariables): QueryPromise<ListProductsByVendorData, ListProductsByVendorVariables>;

interface ListProductsByVendorRef {
  ...
  (dc: DataConnect, vars: ListProductsByVendorVariables): QueryRef<ListProductsByVendorData, ListProductsByVendorVariables>;
}
export const listProductsByVendorRef: ListProductsByVendorRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listProductsByVendorRef:
```typescript
const name = listProductsByVendorRef.operationName;
console.log(name);
```

### Variables
The `ListProductsByVendor` query requires an argument of type `ListProductsByVendorVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ListProductsByVendorVariables {
  vendorId: UUIDString;
}
```
### Return Type
Recall that executing the `ListProductsByVendor` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListProductsByVendorData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListProductsByVendorData {
  products: ({
    id: UUIDString;
    name: string;
    description?: string | null;
    price: number;
  } & Product_Key)[];
}
```
### Using `ListProductsByVendor`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listProductsByVendor, ListProductsByVendorVariables } from '@dataconnect/generated';

// The `ListProductsByVendor` query requires an argument of type `ListProductsByVendorVariables`:
const listProductsByVendorVars: ListProductsByVendorVariables = {
  vendorId: ..., 
};

// Call the `listProductsByVendor()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listProductsByVendor(listProductsByVendorVars);
// Variables can be defined inline as well.
const { data } = await listProductsByVendor({ vendorId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listProductsByVendor(dataConnect, listProductsByVendorVars);

console.log(data.products);

// Or, you can use the `Promise` API.
listProductsByVendor(listProductsByVendorVars).then((response) => {
  const data = response.data;
  console.log(data.products);
});
```

### Using `ListProductsByVendor`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listProductsByVendorRef, ListProductsByVendorVariables } from '@dataconnect/generated';

// The `ListProductsByVendor` query requires an argument of type `ListProductsByVendorVariables`:
const listProductsByVendorVars: ListProductsByVendorVariables = {
  vendorId: ..., 
};

// Call the `listProductsByVendorRef()` function to get a reference to the query.
const ref = listProductsByVendorRef(listProductsByVendorVars);
// Variables can be defined inline as well.
const ref = listProductsByVendorRef({ vendorId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listProductsByVendorRef(dataConnect, listProductsByVendorVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.products);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.products);
});
```

## ListOrdersByCustomerName
You can execute the `ListOrdersByCustomerName` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listOrdersByCustomerName(vars: ListOrdersByCustomerNameVariables): QueryPromise<ListOrdersByCustomerNameData, ListOrdersByCustomerNameVariables>;

interface ListOrdersByCustomerNameRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListOrdersByCustomerNameVariables): QueryRef<ListOrdersByCustomerNameData, ListOrdersByCustomerNameVariables>;
}
export const listOrdersByCustomerNameRef: ListOrdersByCustomerNameRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listOrdersByCustomerName(dc: DataConnect, vars: ListOrdersByCustomerNameVariables): QueryPromise<ListOrdersByCustomerNameData, ListOrdersByCustomerNameVariables>;

interface ListOrdersByCustomerNameRef {
  ...
  (dc: DataConnect, vars: ListOrdersByCustomerNameVariables): QueryRef<ListOrdersByCustomerNameData, ListOrdersByCustomerNameVariables>;
}
export const listOrdersByCustomerNameRef: ListOrdersByCustomerNameRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listOrdersByCustomerNameRef:
```typescript
const name = listOrdersByCustomerNameRef.operationName;
console.log(name);
```

### Variables
The `ListOrdersByCustomerName` query requires an argument of type `ListOrdersByCustomerNameVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ListOrdersByCustomerNameVariables {
  customerName: string;
}
```
### Return Type
Recall that executing the `ListOrdersByCustomerName` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListOrdersByCustomerNameData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListOrdersByCustomerNameData {
  orders: ({
    id: UUIDString;
    customerName?: string | null;
    customerLocation?: string | null;
    orderDate: DateString;
    status: string;
  } & Order_Key)[];
}
```
### Using `ListOrdersByCustomerName`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listOrdersByCustomerName, ListOrdersByCustomerNameVariables } from '@dataconnect/generated';

// The `ListOrdersByCustomerName` query requires an argument of type `ListOrdersByCustomerNameVariables`:
const listOrdersByCustomerNameVars: ListOrdersByCustomerNameVariables = {
  customerName: ..., 
};

// Call the `listOrdersByCustomerName()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listOrdersByCustomerName(listOrdersByCustomerNameVars);
// Variables can be defined inline as well.
const { data } = await listOrdersByCustomerName({ customerName: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listOrdersByCustomerName(dataConnect, listOrdersByCustomerNameVars);

console.log(data.orders);

// Or, you can use the `Promise` API.
listOrdersByCustomerName(listOrdersByCustomerNameVars).then((response) => {
  const data = response.data;
  console.log(data.orders);
});
```

### Using `ListOrdersByCustomerName`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listOrdersByCustomerNameRef, ListOrdersByCustomerNameVariables } from '@dataconnect/generated';

// The `ListOrdersByCustomerName` query requires an argument of type `ListOrdersByCustomerNameVariables`:
const listOrdersByCustomerNameVars: ListOrdersByCustomerNameVariables = {
  customerName: ..., 
};

// Call the `listOrdersByCustomerNameRef()` function to get a reference to the query.
const ref = listOrdersByCustomerNameRef(listOrdersByCustomerNameVars);
// Variables can be defined inline as well.
const ref = listOrdersByCustomerNameRef({ customerName: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listOrdersByCustomerNameRef(dataConnect, listOrdersByCustomerNameVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.orders);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.orders);
});
```

# Mutations

There are two ways to execute a Data Connect Mutation using the generated Web SDK:
- Using a Mutation Reference function, which returns a `MutationRef`
  - The `MutationRef` can be used as an argument to `executeMutation()`, which will execute the Mutation and return a `MutationPromise`
- Using an action shortcut function, which returns a `MutationPromise`
  - Calling the action shortcut function will execute the Mutation and return a `MutationPromise`

The following is true for both the action shortcut function and the `MutationRef` function:
- The `MutationPromise` returned will resolve to the result of the Mutation once it has finished executing
- If the Mutation accepts arguments, both the action shortcut function and the `MutationRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Mutation
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each mutation. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-mutations).

## CreateVendor
You can execute the `CreateVendor` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
createVendor(vars: CreateVendorVariables): MutationPromise<CreateVendorData, CreateVendorVariables>;

interface CreateVendorRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateVendorVariables): MutationRef<CreateVendorData, CreateVendorVariables>;
}
export const createVendorRef: CreateVendorRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createVendor(dc: DataConnect, vars: CreateVendorVariables): MutationPromise<CreateVendorData, CreateVendorVariables>;

interface CreateVendorRef {
  ...
  (dc: DataConnect, vars: CreateVendorVariables): MutationRef<CreateVendorData, CreateVendorVariables>;
}
export const createVendorRef: CreateVendorRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createVendorRef:
```typescript
const name = createVendorRef.operationName;
console.log(name);
```

### Variables
The `CreateVendor` mutation requires an argument of type `CreateVendorVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateVendorVariables {
  name: string;
  email?: string | null;
  phone?: string | null;
}
```
### Return Type
Recall that executing the `CreateVendor` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateVendorData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateVendorData {
  vendor_insert: Vendor_Key;
}
```
### Using `CreateVendor`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createVendor, CreateVendorVariables } from '@dataconnect/generated';

// The `CreateVendor` mutation requires an argument of type `CreateVendorVariables`:
const createVendorVars: CreateVendorVariables = {
  name: ..., 
  email: ..., // optional
  phone: ..., // optional
};

// Call the `createVendor()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createVendor(createVendorVars);
// Variables can be defined inline as well.
const { data } = await createVendor({ name: ..., email: ..., phone: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createVendor(dataConnect, createVendorVars);

console.log(data.vendor_insert);

// Or, you can use the `Promise` API.
createVendor(createVendorVars).then((response) => {
  const data = response.data;
  console.log(data.vendor_insert);
});
```

### Using `CreateVendor`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createVendorRef, CreateVendorVariables } from '@dataconnect/generated';

// The `CreateVendor` mutation requires an argument of type `CreateVendorVariables`:
const createVendorVars: CreateVendorVariables = {
  name: ..., 
  email: ..., // optional
  phone: ..., // optional
};

// Call the `createVendorRef()` function to get a reference to the mutation.
const ref = createVendorRef(createVendorVars);
// Variables can be defined inline as well.
const ref = createVendorRef({ name: ..., email: ..., phone: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createVendorRef(dataConnect, createVendorVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.vendor_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.vendor_insert);
});
```

## UpdateProductStock
You can execute the `UpdateProductStock` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
updateProductStock(vars: UpdateProductStockVariables): MutationPromise<UpdateProductStockData, UpdateProductStockVariables>;

interface UpdateProductStockRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateProductStockVariables): MutationRef<UpdateProductStockData, UpdateProductStockVariables>;
}
export const updateProductStockRef: UpdateProductStockRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
updateProductStock(dc: DataConnect, vars: UpdateProductStockVariables): MutationPromise<UpdateProductStockData, UpdateProductStockVariables>;

interface UpdateProductStockRef {
  ...
  (dc: DataConnect, vars: UpdateProductStockVariables): MutationRef<UpdateProductStockData, UpdateProductStockVariables>;
}
export const updateProductStockRef: UpdateProductStockRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the updateProductStockRef:
```typescript
const name = updateProductStockRef.operationName;
console.log(name);
```

### Variables
The `UpdateProductStock` mutation requires an argument of type `UpdateProductStockVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpdateProductStockVariables {
  id: UUIDString;
  stock: number;
}
```
### Return Type
Recall that executing the `UpdateProductStock` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpdateProductStockData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpdateProductStockData {
  product_update?: Product_Key | null;
}
```
### Using `UpdateProductStock`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, updateProductStock, UpdateProductStockVariables } from '@dataconnect/generated';

// The `UpdateProductStock` mutation requires an argument of type `UpdateProductStockVariables`:
const updateProductStockVars: UpdateProductStockVariables = {
  id: ..., 
  stock: ..., 
};

// Call the `updateProductStock()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await updateProductStock(updateProductStockVars);
// Variables can be defined inline as well.
const { data } = await updateProductStock({ id: ..., stock: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await updateProductStock(dataConnect, updateProductStockVars);

console.log(data.product_update);

// Or, you can use the `Promise` API.
updateProductStock(updateProductStockVars).then((response) => {
  const data = response.data;
  console.log(data.product_update);
});
```

### Using `UpdateProductStock`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, updateProductStockRef, UpdateProductStockVariables } from '@dataconnect/generated';

// The `UpdateProductStock` mutation requires an argument of type `UpdateProductStockVariables`:
const updateProductStockVars: UpdateProductStockVariables = {
  id: ..., 
  stock: ..., 
};

// Call the `updateProductStockRef()` function to get a reference to the mutation.
const ref = updateProductStockRef(updateProductStockVars);
// Variables can be defined inline as well.
const ref = updateProductStockRef({ id: ..., stock: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = updateProductStockRef(dataConnect, updateProductStockVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.product_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.product_update);
});
```

