import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Initialize Admin SDK
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

/**
 * Triggers when a 'pedido' is created, updated, or deleted.
 * Maintains daily statistics in 'stats/daily_YYYY-MM-DD'.
 */
export const onOrderUpdate = functions.firestore
    .document("pedidos/{pedidoId}")
    .onWrite(async (change, context) => {
        const after = change.after.exists ? change.after.data() : null;
        const before = change.before.exists ? change.before.data() : null;

        // 1. Get the relevant date for statistics (YYYY-MM-DD)
        // Use the new data date, or old data date if deleted
        const dataPedido = after?.dataPedido || before?.dataPedido;
        
        let dateKey = new Date().toISOString().split('T')[0]; // Default to today
        
        if (dataPedido) {
            // Check if it's a Timestamp or ISO string
            const dateObj = dataPedido.toDate ? dataPedido.toDate() : new Date(dataPedido);
            dateKey = dateObj.toISOString().split('T')[0];
        }

        const statsRef = db.collection("stats").doc(`daily_${dateKey}`);

        // 2. Calculate the delta (change) in values
        let deltaCount = 0;
        let deltaTotal = 0;

        // Helper to check if order counts as a "Sale"
        const isSold = (data) => data && data.status === "concluido";

        const wasSold = isSold(before);
        const isNowSold = isSold(after);

        if (!wasSold && isNowSold) {
            // New Sale (e.g. status changed from 'preparando' to 'concluido')
            deltaCount = 1;
            deltaTotal = parseFloat(after?.total || 0);
        } else if (wasSold && !isNowSold) {
            // Revoked Sale (e.g. status changed from 'concluido' to 'cancelado' or deleted)
            deltaCount = -1;
            deltaTotal = -parseFloat(before?.total || 0);
        } else if (wasSold && isNowSold) {
            // Update to an existing sale (e.g. value correction)
            const oldTotal = parseFloat(before?.total || 0);
            const newTotal = parseFloat(after?.total || 0);
            deltaTotal = newTotal - oldTotal;
            // deltaCount remains 0
        }

        // 3. If nothing relevant changed, exit
        if (deltaCount === 0 && deltaTotal === 0) {
            return null;
        }

        // 4. Update the stats document atomically
        return db.runTransaction(async (transaction) => {
            const statsDoc = await transaction.get(statsRef);

            if (!statsDoc.exists) {
                transaction.set(statsRef, {
                    date: dateKey,
                    totalPedidos: deltaCount > 0 ? deltaCount : 0,
                    totalVendas: deltaTotal > 0 ? deltaTotal : 0,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            } else {
                transaction.update(statsRef, {
                    totalPedidos: admin.firestore.FieldValue.increment(deltaCount),
                    totalVendas: admin.firestore.FieldValue.increment(deltaTotal),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }
        });
    });
