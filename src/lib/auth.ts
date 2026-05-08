export function getUserId(): string | null {
  try {
    const raw = localStorage.getItem('tradeumdiary-auth');
    if (!raw) return null;
    const p = JSON.parse(raw);
    return (
      p?.user?.id || (p?.access_token ? JSON.parse(atob(p.access_token.split('.')[1])).sub : null)
    );
  } catch {
    return null;
  }
}
