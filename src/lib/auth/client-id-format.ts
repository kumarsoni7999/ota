const CLIENT_ID_HEX_RE = /^[a-f0-9]{24}$/i;

export function isValidSessionClientId(value: string): boolean {
  return CLIENT_ID_HEX_RE.test(value);
}
