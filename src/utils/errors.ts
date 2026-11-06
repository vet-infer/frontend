export function getErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "response" in error) {
    const response = (error as { response?: { status?: number; data?: { detail?: string } } }).response;

    // 400/409/422 traen mensajes curados en español desde el backend (reglas de negocio y validaciones).
    const curatedStatuses = [400, 409, 422];
    if (
      response?.status !== undefined &&
      curatedStatuses.includes(response.status) &&
      typeof response.data?.detail === "string"
    ) {
      return response.data.detail;
    }

    if (response?.data?.detail) {
      console.error("Error tecnico del backend:", response.data.detail);
    }
  }

  return fallback;
}
