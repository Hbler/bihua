export function clipKeyFromFileName(name: string): string | null {
  if (!name.startsWith('cmn-') || !name.endsWith('.mp3')) {
    return null
  }
  let body = name.slice(4, -4)
  if (body.startsWith('_')) {
    body = body.slice(1)
  }
  if (!/^[a-z]+[1-5]$/.test(body)) {
    return null
  }
  if (body.endsWith('5')) {
    return null
  }
  return body.replace(/([jqxy])v/g, '$1u')
}
