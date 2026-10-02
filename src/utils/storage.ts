const TOKEN_STORAGE_KEY = "access_token";

export const AUTH_EVENT = "vetclinic-auth-change";

function notifyAuthChange() {
  window.dispatchEvent(new Event(AUTH_EVENT));
}

export const storage = {
  getToken() {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  },
  setToken(token: string) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    notifyAuthChange();
  },
  clearToken() {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    notifyAuthChange();
  },
};
