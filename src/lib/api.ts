const API_URL = "/api";

export const api = {
  async login(credentials: any) {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    });
    if (!res.ok) throw new Error("Login failed");
    return res.json();
  },
  async register(data: any) {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Registration failed");
    return res.json();
  },
  async getProfile(token: string) {
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Failed to fetch profile: ${res.status}`);
    return res.json();
  },
  async getReports(token: string) {
    const res = await fetch(`${API_URL}/reports`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to fetch reports");
    return res.json();
  },
  async getPublicReports() {
    const res = await fetch(`${API_URL}/reports/public`);
    if (!res.ok) throw new Error("Failed to fetch public reports");
    return res.json();
  },
  async createReport(token: string, formData: FormData) {
    const res = await fetch(`${API_URL}/reports`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!res.ok) throw new Error("Failed to create report");
    return res.json();
  },
  async updateReportStatus(token: string, id: number, status: string) {
    const res = await fetch(`${API_URL}/reports/${id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error("Failed to update report status");
    return res.json();
  },
  async getTeams(token: string) {
    const res = await fetch(`${API_URL}/teams`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to fetch teams");
    return res.json();
  },
  async assignTeam(token: string, report_id: number, team_id: number) {
    const res = await fetch(`${API_URL}/assignments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ report_id, team_id }),
    });
    if (!res.ok) throw new Error("Failed to assign team");
    return res.json();
  },
  async getLeaderboard() {
    const res = await fetch(`${API_URL}/leaderboard`);
    if (!res.ok) throw new Error("Failed to fetch leaderboard");
    return res.json();
  },
  async voteReport(token: string, id: number) {
    const res = await fetch(`${API_URL}/reports/${id}/vote`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to vote");
    return res.json();
  },
  async getComments(id: number) {
    const res = await fetch(`${API_URL}/reports/${id}/comments`);
    if (!res.ok) throw new Error("Failed to fetch comments");
    return res.json();
  },
  async addComment(token: string, id: number, content: string) {
    const res = await fetch(`${API_URL}/reports/${id}/comments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) throw new Error("Failed to add comment");
    return res.json();
  },
  async getRewards() {
    const res = await fetch(`${API_URL}/rewards`);
    if (!res.ok) throw new Error("Failed to fetch rewards");
    return res.json();
  },
  async claimReward(token: string, id: number) {
    const res = await fetch(`${API_URL}/rewards/${id}/claim`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to claim reward");
    return res.json();
  },
  async getAnalytics() {
    const res = await fetch(`${API_URL}/analytics`);
    if (!res.ok) throw new Error("Failed to fetch analytics");
    return res.json();
  },
};
