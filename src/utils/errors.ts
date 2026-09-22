export function getErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "response" in error) {
    const response = (error as { response?: { data?: { detail?: string } } }).response;
    if (response?.data?.detail) {
      console.error("Error tecnico del backend:", response.data.detail);
    }
  }

  return fallback;
}
