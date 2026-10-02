/** Elimina digitos del texto; usado en buscadores de pacientes, que solo aceptan letras. */
export function stripDigits(value: string) {
  return value.replace(/\d+/g, "");
}
