function legacyCopy(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const textarea = document.createElement(`textarea`)
      textarea.value = text
      textarea.setAttribute(`readonly`, `true`)
      textarea.style.position = `fixed`
      textarea.style.opacity = `0`
      document.body.appendChild(textarea)

      textarea.select()
      const ok = document.execCommand(`copy`)
      document.body.removeChild(textarea)

      ok ? resolve() : reject(new Error(`execCommand failed`))
    }
    catch (err) {
      reject(err)
    }
  })
}

export async function copyPlain(text: string): Promise<void> {
  if (window.isSecureContext && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return
    }
    catch {
    }
  }
  await legacyCopy(text)
}

export async function copyHtml(html: string, plainText?: string): Promise<void> {
  // 如果没有提供纯文本，则从HTML中提取
  const plain = plainText ?? html.replace(/<[^>]+>/g, ``)
  if (window.isSecureContext && navigator.clipboard?.write) {
    try {
      const item = new ClipboardItem({
        'text/html': new Blob([html], { type: `text/html` }),
        'text/plain': new Blob([plain], { type: `text/plain` }),
      })
      await navigator.clipboard.write([item])
      return
    }
    catch (error) {
      console.error("Error using Clipboard API:", error)
    }
  }
  await copyPlain(plain)
}
