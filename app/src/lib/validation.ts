// Validação dos formulários de autenticação (funções puras, sem React).

export const MIN_PASSWORD_LENGTH = 6; // mínimo exigido pelo Firebase Authentication

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Retorna a mensagem de erro do e-mail, ou null se estiver válido. */
export function validateEmail(email: string): string | null {
  const value = email.trim();
  if (value.length === 0) return 'Informe o e-mail.';
  if (!EMAIL_REGEX.test(value)) return 'Digite um e-mail válido, como nome@empresa.com.';
  return null;
}

/** Retorna a mensagem de erro da senha, ou null se estiver válida. */
export function validatePassword(password: string): string | null {
  if (password.length === 0) return 'Informe a senha.';
  if (password.length < MIN_PASSWORD_LENGTH) return `A senha tem pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  return null;
}

export type LoginErrors = { email?: string; password?: string };

/** Valida o formulário de login inteiro. Objeto vazio = pode enviar. */
export function validateLoginForm(email: string, password: string): LoginErrors {
  const errors: LoginErrors = {};
  const emailError = validateEmail(email);
  const passwordError = validatePassword(password);
  if (emailError) errors.email = emailError;
  if (passwordError) errors.password = passwordError;
  return errors;
}

export function hasErrors(errors: LoginErrors): boolean {
  return Object.keys(errors).length > 0;
}
