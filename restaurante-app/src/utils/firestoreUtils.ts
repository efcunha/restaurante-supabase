import { collection, doc, CollectionReference, DocumentReference, DocumentData } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

/**
 * Returns a reference to a company-scoped collection.
 * 
 * @param companyId - The ID of the company
 * @param collectionName - The name of the sub-collection (e.g., 'cardapio', 'comandas')
 * @returns Firestore collection reference
 */
export const getCompanyCollection = (companyId: string, collectionName: string): CollectionReference<DocumentData> => {
  if (!companyId) {
    throw new Error('Company ID is required for scoped data access');
  }
  return collection(db, 'companies', companyId, collectionName);
};

/**
 * Returns a reference to a document within a company-scoped collection.
 * 
 * @param companyId - The ID of the company
 * @param collectionName - The name of the sub-collection
 * @param docId - The ID of the document (optional, if creating new doc with auto-ID, don't pass this)
 * @returns Firestore document reference
 */
export const getCompanyDoc = (companyId: string, collectionName: string, docId?: string): DocumentReference<DocumentData> => {
  if (!companyId) {
     throw new Error('Company ID is required for scoped data access');
  }
  if (!docId) {
      // If no docId, we typically rely on addDoc to generate it on the collection ref
      // But if we need a doc ref with auto ID, we use doc(collectionFromAbove)
      return doc(collection(db, 'companies', companyId, collectionName));
  }
  return doc(db, 'companies', companyId, collectionName, docId);
};
