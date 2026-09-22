export function getErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "response" in error) {
    const response = (error as { response?: { status?: number; data?: { detail?: string } } }).response;

    if (response?.status === 409 && typeof response.data?.detail === "string") {
      return response.data.detail;
    }

    if (response?.data?.detail) {
      console.error("Error tecnico del backend:", response.data.detail);
    }
  }

  return fallback;
}
