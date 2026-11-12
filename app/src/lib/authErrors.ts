/**
 * Traduz os códigos de erro do Firebase Authentication para mensagens em português.
 * Por segurança, e-mail inexistente e senha errada recebem a mesma mensagem
 * (assim ninguém descobre quais e-mails têm conta).
 */
export function authErrorMessage(error: unknown): string {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-login-credentials':
      return 'E-mail ou senha incorretos.';
    case 'auth/invalid-email':
      return 'E-mail inválido.';
    case 'auth/user-disabled':
      return 'Esta conta foi desativada. Fale com o administrador.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.';
    case 'auth/network-request-failed':
      return 'Sem conexão com a internet. Verifique sua rede e tente de novo.';
    case 'auth/missing-email':
      return 'Informe o e-mail.';
    case 'auth/invalid-api-key':
    case 'auth/api-key-not-valid.-please-pass-a-valid-api-key.':
    case 'auth/configuration-not-found':
      return 'O app não está configurado corretamente (Firebase). Avise o administrador.';
    default:
      return 'Não foi possível concluir. Tente novamente.';
  }
}
