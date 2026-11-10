/** «Copiar email»: portapapeles y mensaje en una región aria-live. */
export function initCopy(): () => void {
  const btns = document.querySelectorAll<HTMLButtonElement>('[data-copy-email]');
  const off: (() => void)[] = [];
  btns.forEach((b) => {
    const h = async () => {
      const email = b.dataset.copyEmail ?? '';
      const status = document.querySelector<HTMLElement>('[data-copy-status]');
      try {
        await navigator.clipboard.writeText(email);
        if (status) status.textContent = `${b.dataset.copied}: ${email}`;
      } catch {
        if (status) status.textContent = email;
      }
    };
    b.addEventListener('click', h);
    off.push(() => b.removeEventListener('click', h));
  });
  return () => off.forEach((f) => f());
}
