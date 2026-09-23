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

export type ForgotPasswordResponse = {
  message: string;
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
