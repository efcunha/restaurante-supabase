// Trecho corrigido do OrderContext.firestore.js
// Substitua a seção do listener (linhas ~40-80) por esta versão corrigida:

useEffect(() => {
  if (!user) {
    console.log('OrderProvider: Aguardando usuário para iniciar listener Firestore');
    return;
  }
  
  console.log('OrderProvider: Iniciando listener Firestore para usuário:', user?.email);
  
  let unsubscribe = null;
  
  try {
    unsubscribe = OrderFirestoreService.listenToActiveOrders(({ orders: firestoreOrders, docMap }) => {
      console.log('🔄 Dados recebidos do Firestore:', firestoreOrders.length, 'pedidos');
      
      // ✅ CORREÇÃO: Atualizar o mapeamento orderId -> firestoreDocId
      setFirestoreDocMap(prevMap => {
        const newMap = { ...prevMap, ...docMap };
        console.log('🗺️ Mapa atualizado:', newMap);
        return newMap;
      });
      
      // ✅ CORREÇÃO: Melhorar lógica de merge
      setOrders(prevOrders => {
        console.log('📊 Estado anterior:', prevOrders.length, 'pedidos');
        console.log('📊 Dados Firestore:', firestoreOrders.length, 'pedidos');
        
        // Se não há pedidos locais, usar dados do Firestore diretamente
        if (prevOrders.length === 0) {
          console.log('✅ Usando dados do Firestore (sem estado local)');
          return firestoreOrders;
        }
        
        // Merge inteligente: preservar mudanças locais mais recentes
        const mergedOrders = firestoreOrders.map(firestoreOrder => {
          const localOrder = prevOrders.find(o => o.id === firestoreOrder.id);
          
          if (!localOrder) {
            // Pedido novo do Firestore
            return firestoreOrder;
          }
          
          // ✅ CORREÇÃO: Comparar timestamps de atualização
          const firestoreUpdated = firestoreOrder.atualizado || firestoreOrder.timestamp;
          const localUpdated = localOrder.atualizado || localOrder.timestamp;
          
          // Se dados do Firestore são mais recentes, usar eles
          if (new Date(firestoreUpdated) > new Date(localUpdated)) {
            console.log(`🔄 Usando dados do Firestore para pedido ${firestoreOrder.id} (mais recente)`);
            return firestoreOrder;
          }
          
          // ✅ CORREÇÃO: Merge de itemsWithStatus item por item
          if (localOrder.itemsWithStatus && firestoreOrder.itemsWithStatus) {
            const mergedItems = firestoreOrder.itemsWithStatus.map(firestoreItem => {
              const localItem = localOrder.itemsWithStatus.find(li => li.id === firestoreItem.id);
              
              if (!localItem) {
                return firestoreItem;
              }
              
              // Comparar timestamps dos itens
              const firestoreItemTime = new Date(firestoreItem.timestamp || '1970-01-01');
              const localItemTime = new Date(localItem.timestamp || '1970-01-01');
              
              if (firestoreItemTime > localItemTime) {
                console.log(`🔄 Item ${firestoreItem.id}: usando dados do Firestore`);
                return firestoreItem;
              } else {
                console.log(`📱 Item ${localItem.id}: mantendo dados locais`);
                return localItem;
              }
            });
            
            return { 
              ...firestoreOrder, 
              itemsWithStatus: mergedItems,
              // Preservar outros campos locais se mais recentes
              timeInMontagem: localOrder.timeInMontagem || firestoreOrder.timeInMontagem,
              timeInProntos: localOrder.timeInProntos || firestoreOrder.timeInProntos,
              deliveredAt: localOrder.deliveredAt || firestoreOrder.deliveredAt
            };
          }
          
          // Fallback: usar dados locais
          console.log(`📱 Mantendo dados locais para pedido ${localOrder.id}`);
          return localOrder;
        });
        
        console.log('✅ Merge concluído:', mergedOrders.length, 'pedidos');
        return mergedOrders;
      });

      setIsOnline(true);
    });
  } catch (error) {
    console.error('OrderProvider: Erro ao iniciar listener Firestore:', error);
    setIsOnline(false);
  }
  
  // ... resto do código permanece igual
}, [user]);
