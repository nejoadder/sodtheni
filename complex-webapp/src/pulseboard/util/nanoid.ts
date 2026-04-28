export function nanoid(size = 12) {
  const alphabet = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const bytes = new Uint8Array(size)
  crypto.getRandomValues(bytes)
  let id = ''
  for (let i = 0; i < size; i++) id += alphabet[bytes[i] % alphabet.length]
  return id
}

