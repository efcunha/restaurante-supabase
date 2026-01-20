import { CreateVendorData, CreateVendorVariables, ListProductsByVendorData, ListProductsByVendorVariables, UpdateProductStockData, UpdateProductStockVariables, ListOrdersByCustomerNameData, ListOrdersByCustomerNameVariables } from '../';
import { UseDataConnectQueryResult, useDataConnectQueryOptions, UseDataConnectMutationResult, useDataConnectMutationOptions} from '@tanstack-query-firebase/react/data-connect';
import { UseQueryResult, UseMutationResult} from '@tanstack/react-query';
import { DataConnect } from 'firebase/data-connect';
import { FirebaseError } from 'firebase/app';


export function useCreateVendor(options?: useDataConnectMutationOptions<CreateVendorData, FirebaseError, CreateVendorVariables>): UseDataConnectMutationResult<CreateVendorData, CreateVendorVariables>;
export function useCreateVendor(dc: DataConnect, options?: useDataConnectMutationOptions<CreateVendorData, FirebaseError, CreateVendorVariables>): UseDataConnectMutationResult<CreateVendorData, CreateVendorVariables>;

export function useListProductsByVendor(vars: ListProductsByVendorVariables, options?: useDataConnectQueryOptions<ListProductsByVendorData>): UseDataConnectQueryResult<ListProductsByVendorData, ListProductsByVendorVariables>;
export function useListProductsByVendor(dc: DataConnect, vars: ListProductsByVendorVariables, options?: useDataConnectQueryOptions<ListProductsByVendorData>): UseDataConnectQueryResult<ListProductsByVendorData, ListProductsByVendorVariables>;

export function useUpdateProductStock(options?: useDataConnectMutationOptions<UpdateProductStockData, FirebaseError, UpdateProductStockVariables>): UseDataConnectMutationResult<UpdateProductStockData, UpdateProductStockVariables>;
export function useUpdateProductStock(dc: DataConnect, options?: useDataConnectMutationOptions<UpdateProductStockData, FirebaseError, UpdateProductStockVariables>): UseDataConnectMutationResult<UpdateProductStockData, UpdateProductStockVariables>;

export function useListOrdersByCustomerName(vars: ListOrdersByCustomerNameVariables, options?: useDataConnectQueryOptions<ListOrdersByCustomerNameData>): UseDataConnectQueryResult<ListOrdersByCustomerNameData, ListOrdersByCustomerNameVariables>;
export function useListOrdersByCustomerName(dc: DataConnect, vars: ListOrdersByCustomerNameVariables, options?: useDataConnectQueryOptions<ListOrdersByCustomerNameData>): UseDataConnectQueryResult<ListOrdersByCustomerNameData, ListOrdersByCustomerNameVariables>;
