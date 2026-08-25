export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  access_token: string;
  token_type: string;
};

export type ForgotPasswordRequest = {
  email: string;
};

export type PasswordResetEmailPayload = {
  to_email: string;
  to_name: string;
  reset_url: string;
  reset_token: string;
  expires_minutes: number;
};

export type ForgotPasswordResponse = {
  message: string;
  reset_email?: PasswordResetEmailPayload | null;
};

export type ResetPasswordRequest = {
  token: string;
  new_password: string;
};

export type ResetPasswordResponse = {
  message: string;
};

export type ChangePasswordRequest = {
  current_password: string;
  new_password: string;
};

export type ChangePasswordResponse = {
  message: string;
};
