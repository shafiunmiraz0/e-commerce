const api = {
  async post(url, data = {}) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return await res.json();
    } catch (err) {
      console.error('API error:', err);
      return { success: false, message: 'Network error' };
    }
  },

  async get(url) {
    try {
      const res = await fetch(url);
      return await res.json();
    } catch (err) {
      console.error('API error:', err);
      return { success: false, message: 'Network error' };
    }
  }
};
