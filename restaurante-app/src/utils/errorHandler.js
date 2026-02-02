/**
 * Converte erros técnicos (Firebase, API) em mensagens amigáveis para o usuário.
 * @param {Error|string} error - O objeto de erro ou string de erro.
 * @returns {string} Mensagem amigável.
 */
export const getFriendlyErrorMessage = (error) => {
    if (!error) return 'Ocorreu um erro desconhecido.';

    const message = typeof error === 'string' ? error : (error.message || error.toString());
    const code = error.code;

    // Firebase / Network Errors
    if (code === 'auth/network-request-failed' || message.includes('network-request-failed')) {
        return 'Sem conexão com a internet. Verifique sua rede.';
    }

    if (code === 'unavailable' || message.includes('unavailable')) {
        return 'Serviço temporariamente indisponível (Offline).';
    }

    // Auth Errors
    if (code === 'auth/user-not-found' || message.includes('user-not-found')) {
        return 'Usuário não encontrado.';
    }
    if (code === 'auth/wrong-password' || message.includes('wrong-password')) {
        return 'Senha incorreta.';
    }
    if (code === 'auth/too-many-requests' || message.includes('too-many-requests')) {
        return 'Muitas tentativas. Tente novamente mais tarde.';
    }
    if (code === 'auth/email-already-in-use') {
        return 'Este e-mail já está sendo usado por outro usuário.';
    }

    // Firestore / Permissions
    if (code === 'permission-denied' || message.includes('permission-denied')) {
        return 'Você não tem permissão para realizar esta ação.';
    }

    // Validation / Custom Errors
    if (message.includes('Caixa não está aberto')) {
        return 'O caixa precisa estar aberto para realizar esta operação.';
    }

    // Return original if no match, but cleaner
    return message.replace('Firebase: ', '').replace('Error: ', '');
};
