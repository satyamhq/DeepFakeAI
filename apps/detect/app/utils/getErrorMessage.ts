// Return the string of any thrown error.
export default function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return String(error)
}
