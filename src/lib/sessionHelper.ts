export function getCachedSession(): { userId: string; email: string } | null {
  try {
    const raw = localStorage.getItem('tradeumdiary-auth');
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const session = parsed?.currentSession || parsed?.session || parsed;

    if (session?.user?.id) {
      return { userId: session.user.id, email: session.user.email };
    }

    if (session?.access_token) {
      const payload = session.access_token.split('.')[1];
      const decoded = JSON.parse(atob(payload));
      return { userId: decoded.sub, email: decoded.email };
    }

    return null;
  } catch {
    return null;
  }
}
