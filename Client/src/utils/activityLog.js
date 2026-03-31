const KEY = 'recentActivities';

export const addActivity = (activity) => {
  try {
    const now = Date.now();
    const entry = { ts: now, status: 'Done', ...activity };
    const raw = localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    list.unshift(entry);
    const trimmed = list.slice(0, 50);
    localStorage.setItem(KEY, JSON.stringify(trimmed));
  } catch {}
};

export const getRecentActivities = () => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    if (Array.isArray(list)) return list;
    return [];
  } catch {
    return [];
  }
};
