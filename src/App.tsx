import React, { useState, useEffect, useRef } from "react";
import { 
  MapPin, 
  Camera, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  LogOut, 
  Plus, 
  Shield, 
  User, 
  Menu, 
  X,
  ChevronRight,
  Map as MapIcon,
  LayoutDashboard,
  Users,
  Trophy,
  Image as ImageIcon,
  BarChart3,
  Gift,
  ThumbsUp,
  MessageSquare,
  TrendingUp,
  Award,
  ArrowRight,
  Send
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line
} from "recharts";
import { motion, AnimatePresence } from "motion/react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { api } from "./lib/api";
import { GoogleGenAI, Type } from "@google/genai";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// --- Utils ---
const API_URL = "/api";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Fix Leaflet icon issue
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

// --- Components ---

const Button = ({ 
  children, 
  className, 
  variant = "primary", 
  size = "md",
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "outline" | "ghost"; size?: "sm" | "md" | "lg" }) => {
  const variants = {
    primary: "bg-zinc-900 text-white hover:bg-zinc-800",
    secondary: "bg-emerald-600 text-white hover:bg-emerald-700",
    outline: "border border-zinc-200 text-zinc-700 hover:bg-zinc-50",
    ghost: "text-zinc-600 hover:bg-zinc-100",
  };
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };
  return (
    <button 
      className={cn(
        "rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

const Input = ({ label, error, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }) => (
  <div className="space-y-1 w-full">
    {label && <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{label}</label>}
    <input 
      className={cn(
        "w-full px-4 py-2 bg-white border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all",
        error && "border-red-500 focus:ring-red-500/5 focus:border-red-500"
      )}
      {...props}
    />
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
);

const Badge = ({ children, status }: { children: React.ReactNode; status: string }) => {
  const colors = {
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    "in-progress": "bg-blue-50 text-blue-700 border-blue-200",
    resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border", colors[status as keyof typeof colors])}>
      {children}
    </span>
  );
};

const StatCard = ({ label, value, icon, color = "zinc" }: { label: string; value: number; icon: React.ReactNode; color?: string }) => {
  const colors = {
    zinc: "border-zinc-200 bg-white",
    amber: "border-amber-100 bg-amber-50/30",
    blue: "border-blue-100 bg-blue-50/30",
    emerald: "border-emerald-100 bg-emerald-50/30",
  };
  return (
    <div className={cn("p-5 rounded-2xl border shadow-sm flex items-center justify-between", colors[color as keyof typeof colors])}>
      <div>
        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-3xl font-bold tracking-tight">{value}</p>
      </div>
      <div className="w-10 h-10 rounded-xl bg-white border border-zinc-100 flex items-center justify-center shadow-sm">
        {icon}
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
  const [view, setView] = useState<"landing" | "login" | "register" | "dashboard" | "report" | "admin" | "leaderboard" | "analytics" | "rewards" | "map">("landing");
  const [reports, setReports] = useState<any[]>([]);
  const [publicReports, setPublicReports] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [rewards, setRewards] = useState<any[]>([]);

  useEffect(() => {
    if (token) {
      const savedUser = localStorage.getItem("user");
      if (savedUser) {
        const u = JSON.parse(savedUser);
        setUser(u);
      }
      fetchUserProfile();
    }
  }, [token]);

  useEffect(() => {
    fetchPublicReports();
    fetchLeaderboard();
  }, []);

  useEffect(() => {
    if (token && (view === "dashboard" || view === "admin")) {
      fetchReports();
      fetchUserProfile();
    }
    if (view === "leaderboard") {
      fetchLeaderboard();
    }
    if (view === "analytics") {
      fetchAnalytics();
    }
    if (view === "rewards") {
      fetchRewards();
    }
    if (view === "gallery" || view === "map" || view === "landing") {
      fetchPublicReports();
    }
  }, [token, view]);

  const fetchAnalytics = async () => {
    try {
      const data = await api.getAnalytics();
      setAnalytics(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRewards = async () => {
    try {
      const data = await api.getRewards();
      setRewards(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUserProfile = async () => {
    if (!token) return;
    try {
      const data = await api.getProfile(token);
      setUser(data);
      localStorage.setItem("user", JSON.stringify(data));
    } catch (err) {
      console.error("Profile fetch error:", err);
      // If profile fetch fails (404 or 401), the token/user is invalid
      setToken(null);
      setUser(null);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setView("landing");
    }
  };

  const fetchPublicReports = async () => {
    try {
      const data = await api.getPublicReports();
      setPublicReports(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const data = await api.getLeaderboard();
      setLeaderboard(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchReports = async () => {
    if (!token) return;
    try {
      const data = await api.getReports(token);
      setReports(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
    setView("landing");
  };

  const handleReportClick = () => {
    if (!token) {
      setView("login");
    } else {
      setView("report");
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col font-sans text-zinc-900">
      {/* Header */}
      <header className="h-16 bg-white border-b border-zinc-200 px-6 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView("landing")}>
          <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">CivicFix</h1>
        </div>

        <div className="flex items-center gap-4">
          {token ? (
            <>
              <div className="flex items-center gap-3 mr-4 bg-zinc-50 px-3 py-1.5 rounded-full border border-zinc-200">
                <Trophy className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-bold text-zinc-700">{user?.points || 0} pts</span>
              </div>
              <div className="flex flex-col items-end mr-2">
                <span className="text-sm font-semibold">{user?.name}</span>
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">{user?.role}</span>
              </div>
              <Button variant="ghost" className="p-2" onClick={handleLogout}>
                <LogOut className="w-5 h-5" />
              </Button>
            </>
          ) : (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setView("login")}>Login</Button>
              <Button size="sm" onClick={() => setView("register")}>Register</Button>
            </div>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-zinc-200 hidden md:flex flex-col p-4 gap-2">
          <SidebarItem 
            icon={<LayoutDashboard className="w-4 h-4" />} 
            label="Dashboard" 
            active={view === "dashboard"} 
            onClick={() => setView(user?.role === "admin" ? "admin" : "dashboard")} 
          />
          <SidebarItem 
            icon={<MapIcon className="w-4 h-4" />} 
            label="Map Explorer" 
            active={view === "landing" || view === "map"} 
            onClick={() => setView("map")} 
          />
          <SidebarItem 
            icon={<ImageIcon className="w-4 h-4" />} 
            label="Before & After" 
            active={view === "gallery"} 
            onClick={() => setView("gallery")} 
          />
          <SidebarItem 
            icon={<Trophy className="w-4 h-4" />} 
            label="Leaderboard" 
            active={view === "leaderboard"} 
            onClick={() => setView("leaderboard")} 
          />
          <SidebarItem 
            icon={<BarChart3 className="w-4 h-4" />} 
            label="Analytics" 
            active={view === "analytics"} 
            onClick={() => setView("analytics")} 
          />
          <SidebarItem 
            icon={<Gift className="w-4 h-4" />} 
            label="Rewards" 
            active={view === "rewards"} 
            onClick={() => setView("rewards")} 
          />
          <div className="my-2 border-t border-zinc-100" />
          <SidebarItem 
            icon={<Plus className="w-4 h-4" />} 
            label="Report Issue" 
            active={view === "report"} 
            onClick={handleReportClick} 
          />
          {user?.role === "admin" && (
            <SidebarItem 
              icon={<Shield className="w-4 h-4" />} 
              label="Admin Console" 
              active={view === "admin"} 
              onClick={() => setView("admin")} 
            />
          )}
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto relative">
          <AnimatePresence mode="wait">
            {view === "landing" && (
              <LandingPage 
                key="landing" 
                reports={publicReports} 
                onReport={handleReportClick} 
                user={user}
                onGoToAdmin={() => setView("admin")}
                token={token || undefined}
                onUpdate={fetchPublicReports}
              />
            )}
            {view === "map" && (
              <div className="h-full w-full">
                <MapPage reports={publicReports} />
              </div>
            )}
            {view === "gallery" && (
              <div className="p-6 md:p-10">
                <GalleryPage reports={publicReports.filter(r => r.status === "resolved" && r.resolution_image_url)} />
              </div>
            )}
            {view === "leaderboard" && (
              <div className="p-6 md:p-10">
                <LeaderboardPage key="leaderboard" leaderboard={leaderboard} onRefresh={fetchLeaderboard} />
              </div>
            )}
            {view === "analytics" && (
              <div className="p-6 md:p-10">
                <AnalyticsPage analytics={analytics} />
              </div>
            )}
            {view === "rewards" && (
              <div className="p-6 md:p-10">
                <RewardsPage rewards={rewards} userPoints={user?.points || 0} onClaim={async (id) => {
                  if (!token) return;
                  await api.claimReward(token, id);
                  fetchUserProfile();
                  fetchRewards();
                }} />
              </div>
            )}
            {view === "login" && (
              <div className="p-6 md:p-10 flex items-center justify-center min-h-full">
                <LoginPage onLogin={(t, u) => { setToken(t); setUser(u); setView(u.role === "admin" ? "admin" : "dashboard"); }} onGoToRegister={() => setView("register")} />
              </div>
            )}
            {view === "register" && (
              <div className="p-6 md:p-10 flex items-center justify-center min-h-full">
                <RegisterPage onRegister={() => setView("login")} onGoToLogin={() => setView("login")} />
              </div>
            )}
            {view === "dashboard" && (
              <div className="p-6 md:p-10">
                <UserDashboard key="user-dash" reports={reports} onNewReport={() => setView("report")} />
              </div>
            )}
            {view === "report" && (
              <div className="p-6 md:p-10">
                <ReportForm 
                  key="report-form" 
                  token={token!} 
                  onCancel={() => setView("dashboard")} 
                  onSuccess={() => { 
                    setView("dashboard"); 
                    fetchReports(); 
                    fetchPublicReports();
                    fetchLeaderboard();
                    fetchUserProfile();
                  }} 
                />
              </div>
            )}
            {view === "admin" && (
              <div className="p-6 md:p-10 h-full">
                <AdminDashboard key="admin-dash" reports={reports} token={token!} onRefresh={() => { fetchReports(); fetchPublicReports(); fetchLeaderboard(); }} />
              </div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

// --- Sub-Pages ---

const MapPage = ({ reports }: { reports: any[] }) => {
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([20, 0]);
  const [mapZoom, setMapZoom] = useState(3);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setMapCenter([pos.coords.latitude, pos.coords.longitude]);
        setMapZoom(13);
      });
    }
  }, []);

  return (
    <div className="h-full w-full relative">
      <MapContainer center={mapCenter} zoom={mapZoom} className="h-full w-full">
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapController center={mapCenter} zoom={mapZoom} />
        {reports.map(r => (
          <Marker key={r.id} position={[r.latitude, r.longitude]} eventHandlers={{ click: () => setSelectedReport(r) }}>
            <Popup>
              <div className="p-1 max-w-[200px]">
                <h4 className="font-bold text-sm mb-1">{r.title}</h4>
                <p className="text-[10px] text-emerald-600 font-bold uppercase mb-1">{r.category}</p>
                <Badge status={r.status}>{r.status}</Badge>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <AnimatePresence>
        {selectedReport && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-10 left-10 right-10 md:left-auto md:w-96 bg-white shadow-2xl rounded-3xl border border-zinc-200 z-[1000] overflow-hidden flex flex-col max-h-[70vh]"
          >
            <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
              <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-500">Quick View</h3>
              <button onClick={() => setSelectedReport(null)} className="p-1 hover:bg-zinc-200 rounded-full transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <ReportDetails report={selectedReport} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const AnalyticsPage = ({ analytics }: { analytics: any }) => {
  if (!analytics) return <div className="flex items-center justify-center p-20"><Clock className="w-8 h-8 animate-spin text-zinc-300" /></div>;

  const pieData = analytics.category_stats.map((s: any) => ({ name: s.category, value: s.count }));
  const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-4xl font-bold tracking-tight">City Analytics</h2>
        <p className="text-zinc-500">Real-time insights into our community's progress.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white border border-zinc-200 rounded-2xl shadow-sm">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Total Reports</p>
          <p className="text-4xl font-bold text-zinc-900">{analytics.total_reports.count}</p>
        </div>
        <div className="p-6 bg-white border border-zinc-200 rounded-2xl shadow-sm">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Resolved Issues</p>
          <p className="text-4xl font-bold text-emerald-600">{analytics.resolved_reports.count}</p>
        </div>
        <div className="p-6 bg-white border border-zinc-200 rounded-2xl shadow-sm">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Resolution Rate</p>
          <p className="text-4xl font-bold text-blue-600">
            {analytics.total_reports.count > 0 
              ? Math.round((analytics.resolved_reports.count / analytics.total_reports.count) * 100) 
              : 0}%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="p-8 bg-white border border-zinc-200 rounded-3xl shadow-sm">
          <h3 className="text-lg font-bold mb-6">Issues by Category</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            {pieData.map((s: any, i: number) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="text-xs font-medium text-zinc-600">{s.name} ({s.value})</span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-8 bg-white border border-zinc-200 rounded-3xl shadow-sm">
          <h3 className="text-lg font-bold mb-6">Recent Activity</h3>
          <div className="space-y-4">
            {analytics.recent_activity.slice(0, 8).map((a: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    a.status === "resolved" ? "bg-emerald-500" : a.status === "in-progress" ? "bg-blue-500" : "bg-amber-500"
                  )} />
                  <span className="text-sm font-medium text-zinc-900">Issue {a.status}</span>
                </div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  {new Date(a.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const RewardsPage = ({ rewards, userPoints, onClaim }: { rewards: any[]; userPoints: number; onClaim: (id: number) => void }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
    <div className="text-center space-y-2">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-50 rounded-2xl border border-emerald-100 mb-4">
        <Gift className="w-8 h-8 text-emerald-600" />
      </div>
      <h2 className="text-4xl font-bold tracking-tight">Citizen Rewards</h2>
      <p className="text-zinc-500">Redeem your hard-earned points for exclusive perks.</p>
    </div>

    <div className="bg-zinc-900 text-white p-8 rounded-3xl flex items-center justify-between shadow-xl shadow-zinc-200">
      <div>
        <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-1">Your Balance</p>
        <p className="text-4xl font-bold">{userPoints} <span className="text-xl text-zinc-500">pts</span></p>
      </div>
      <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md">
        <Award className="w-8 h-8 text-amber-400" />
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {rewards.map((reward) => (
        <div key={reward.id} className="bg-white border border-zinc-200 rounded-2xl overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow">
          <div className="aspect-square bg-zinc-100 flex items-center justify-center relative">
            <Gift className="w-12 h-12 text-zinc-300" />
            <div className="absolute top-3 right-3 px-2 py-1 bg-zinc-900 text-white text-[10px] font-bold rounded-lg">
              {reward.cost} PTS
            </div>
          </div>
          <div className="p-5 flex-1 flex flex-col">
            <h4 className="font-bold text-zinc-900 mb-1">{reward.title}</h4>
            <p className="text-xs text-zinc-500 mb-4 flex-1">{reward.description}</p>
            <Button 
              className="w-full" 
              variant={userPoints >= reward.cost ? "primary" : "outline"}
              disabled={userPoints < reward.cost}
              onClick={() => onClaim(reward.id)}
            >
              {userPoints >= reward.cost ? "Claim Reward" : "Not Enough Points"}
            </Button>
          </div>
        </div>
      ))}
    </div>
  </motion.div>
);

const ReportDetails = ({ report, token, onUpdate }: { report: any; token?: string; onUpdate?: () => void }) => {
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (report) {
      api.getComments(report.id).then(setComments);
    }
  }, [report]);

  const handleVote = async () => {
    if (!token) return alert("Please sign in to upvote");
    try {
      await api.voteReport(token, report.id);
      onUpdate?.();
    } catch (err) {
      alert("Already voted!");
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return alert("Please sign in to comment");
    if (!comment.trim()) return;
    setLoading(true);
    try {
      await api.addComment(token, report.id, comment);
      setComment("");
      const updated = await api.getComments(report.id);
      setComments(updated);
    } catch (err) {
      alert("Failed to add comment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="aspect-video bg-zinc-100 relative group">
        {report.image_url ? (
          <img src={report.image_url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-300">
            <ImageIcon className="w-10 h-10" />
          </div>
        )}
        <div className="absolute top-4 right-4 flex gap-2">
          <Badge status={report.status}>{report.status}</Badge>
          {report.priority && (
            <span className={cn(
              "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
              report.priority === "high" ? "bg-red-50 text-red-700 border-red-200" : 
              report.priority === "medium" ? "bg-amber-50 text-amber-700 border-amber-200" : 
              "bg-zinc-50 text-zinc-700 border-zinc-200"
            )}>
              {report.priority}
            </span>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6 overflow-y-auto flex-1">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">{report.category || "General"}</span>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{new Date(report.created_at).toLocaleDateString()}</span>
          </div>
          <h4 className="text-2xl font-bold mb-2">{report.title}</h4>
          <p className="text-zinc-600 text-sm leading-relaxed">{report.description}</p>
        </div>

        <div className="flex items-center gap-4 py-4 border-y border-zinc-100">
          <button 
            onClick={handleVote}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-50 hover:bg-zinc-100 rounded-xl transition-colors border border-zinc-200"
          >
            <ThumbsUp className="w-4 h-4 text-zinc-900" />
            <span className="text-sm font-bold">{report.upvotes || 0}</span>
          </button>
          <div className="flex items-center gap-2 text-zinc-500">
            <MessageSquare className="w-4 h-4" />
            <span className="text-sm font-bold">{comments.length}</span>
          </div>
        </div>

        {report.status === "resolved" && report.resolution_image_url && (
          <div className="space-y-3 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
            <h5 className="text-xs font-bold uppercase tracking-widest text-emerald-600">Resolution Proof</h5>
            <img src={report.resolution_image_url} className="w-full rounded-xl shadow-sm" referrerPolicy="no-referrer" />
          </div>
        )}

        <div className="space-y-4">
          <h5 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Comments</h5>
          <div className="space-y-4">
            {comments.map((c, i) => (
              <div key={i} className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-zinc-900">{c.user_name}</span>
                  <span className="text-[10px] text-zinc-400">{new Date(c.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-sm text-zinc-600">{c.content}</p>
              </div>
            ))}
            {comments.length === 0 && <p className="text-xs text-zinc-400 italic">No comments yet.</p>}
          </div>

          <form onSubmit={handleAddComment} className="flex gap-2 pt-4">
            <input 
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Add an update or comment..."
              className="flex-1 bg-white border border-zinc-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900"
            />
            <button 
              type="submit" 
              disabled={loading || !token}
              className="w-10 h-10 bg-zinc-900 text-white rounded-xl flex items-center justify-center disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

        <div className="space-y-3 pt-6 border-t border-zinc-100">
          <div className="flex items-center gap-3 text-zinc-500">
            <User className="w-4 h-4" />
            <span className="text-xs font-medium">Reported by {report.reporter_name}</span>
          </div>
          <div className="flex items-center gap-3 text-zinc-500">
            <MapPin className="w-4 h-4" />
            <span className="text-xs font-medium">{report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const LandingPage = ({ reports, onReport, user, onGoToAdmin, token, onUpdate }: { reports: any[]; onReport: () => void; user: any; onGoToAdmin: () => void; token?: string; onUpdate: () => void; key?: string }) => {
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([20, 0]);
  const [mapZoom, setMapZoom] = useState(3);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setMapCenter([pos.coords.latitude, pos.coords.longitude]);
        setMapZoom(13);
      });
    }
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full w-full relative">
      <div className="absolute inset-0 z-0">
        <MapContainer center={mapCenter} zoom={mapZoom} className="h-full w-full">
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapController center={mapCenter} zoom={mapZoom} />
          {reports.map(r => (
            <Marker key={r.id} position={[r.latitude, r.longitude]} eventHandlers={{ click: () => setSelectedReport(r) }}>
              <Popup>
                <div className="p-1 max-w-[200px]">
                  <h4 className="font-bold text-sm mb-1">{r.title}</h4>
                  <p className="text-[10px] text-emerald-600 font-bold uppercase mb-1">{r.category}</p>
                  <Badge status={r.status}>{r.status}</Badge>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Overlay UI */}
      <div className="absolute top-6 left-6 z-[1000] pointer-events-none">
        <div className="bg-white/90 backdrop-blur-md p-6 rounded-2xl shadow-xl border border-zinc-200 max-w-sm pointer-events-auto">
          <h2 className="text-2xl font-bold mb-2">Neighborhood Issues</h2>
          <p className="text-zinc-600 text-sm mb-6">Explore reported issues in your community or report a new one to get it fixed.</p>
          <div className="flex flex-col gap-3">
            <Button className="w-full" onClick={onReport}>
              <Plus className="w-4 h-4" />
              Report an Issue
            </Button>
            {user?.role === "admin" && (
              <Button variant="outline" className="w-full" onClick={onGoToAdmin}>
                <Shield className="w-4 h-4" />
                Admin Console
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Selected Report Preview */}
      <AnimatePresence>
        {selectedReport && (
          <motion.div 
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="absolute top-6 right-6 bottom-6 w-96 bg-white shadow-2xl rounded-2xl border border-zinc-200 z-[1000] overflow-hidden flex flex-col"
          >
            <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
              <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-500">Issue Details</h3>
              <button onClick={() => setSelectedReport(null)} className="p-1 hover:bg-zinc-200 rounded-full transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <ReportDetails report={selectedReport} token={token} onUpdate={() => {
                onUpdate();
                // Refresh selected report data
                api.getPublicReports().then(reps => {
                  const updated = reps.find((r: any) => r.id === selectedReport.id);
                  if (updated) setSelectedReport(updated);
                });
              }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const LeaderboardPage = ({ leaderboard, onRefresh }: { leaderboard: any[]; onRefresh: () => void; key?: string }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto space-y-8">
    <div className="text-center space-y-2 relative">
      <div className="absolute top-0 right-0">
        <Button variant="outline" size="sm" onClick={onRefresh}>
          <Clock className="w-4 h-4" />
          Refresh
        </Button>
      </div>
      <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-50 rounded-2xl border border-amber-100 mb-4">
        <Trophy className="w-8 h-8 text-amber-500" />
      </div>
      <h2 className="text-4xl font-bold tracking-tight">Community Heroes</h2>
      <p className="text-zinc-500">Top contributors making our city a better place to live.</p>
    </div>

    <div className="bg-white border border-zinc-200 rounded-3xl overflow-hidden shadow-xl shadow-zinc-200/50">
      <div className="grid grid-cols-12 p-6 border-b border-zinc-100 bg-zinc-50/50 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
        <div className="col-span-1">Rank</div>
        <div className="col-span-6">Citizen</div>
        <div className="col-span-3 text-center">Resolved Issues</div>
        <div className="col-span-2 text-right">Points</div>
      </div>
      <div className="divide-y divide-zinc-100">
        {leaderboard.length === 0 ? (
          <div className="p-20 text-center">
            <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-zinc-300" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-900">No contributors yet</h3>
            <p className="text-zinc-500 text-sm max-w-xs mx-auto">Be the first to report an issue and climb the leaderboard!</p>
          </div>
        ) : (
          leaderboard.map((entry, index) => (
            <div key={index} className="grid grid-cols-12 p-6 items-center hover:bg-zinc-50 transition-colors">
              <div className="col-span-1">
                {index === 0 ? (
                  <div className="w-8 h-8 bg-amber-400 rounded-full flex items-center justify-center text-white font-bold shadow-lg shadow-amber-200">1</div>
                ) : index === 1 ? (
                  <div className="w-8 h-8 bg-zinc-400 rounded-full flex items-center justify-center text-white font-bold shadow-lg shadow-zinc-200">2</div>
                ) : index === 2 ? (
                  <div className="w-8 h-8 bg-orange-400 rounded-full flex items-center justify-center text-white font-bold shadow-lg shadow-orange-200">3</div>
                ) : (
                  <span className="text-zinc-400 font-bold ml-3">{index + 1}</span>
                )}
              </div>
              <div className="col-span-6 flex items-center gap-4">
                <div className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-zinc-400" />
                </div>
                <div>
                  <p className="font-bold text-zinc-900">{entry.name}</p>
                  <p className="text-xs text-zinc-500">Active Contributor</p>
                </div>
              </div>
              <div className="col-span-3 text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100 text-xs font-bold">
                  <CheckCircle2 className="w-3 h-3" />
                  {entry.resolved_count}
                </div>
              </div>
              <div className="col-span-2 text-right">
                <span className="text-lg font-bold text-zinc-900">{entry.points}</span>
                <span className="text-[10px] font-bold text-zinc-400 uppercase ml-1">pts</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="p-6 bg-white border border-zinc-200 rounded-2xl">
        <h4 className="font-bold text-sm mb-2">How to earn points?</h4>
        <ul className="text-xs text-zinc-500 space-y-2">
          <li className="flex items-center gap-2">
            <Plus className="w-3 h-3 text-zinc-900" />
            Report an issue: 10 points
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            Issue gets resolved: 50 points
          </li>
        </ul>
      </div>
      <div className="p-6 bg-zinc-900 text-white rounded-2xl md:col-span-2 flex items-center justify-between">
        <div>
          <h4 className="font-bold text-lg mb-1">Coming Soon: Rewards</h4>
          <p className="text-zinc-400 text-xs">Redeem your points for local business coupons and city service discounts.</p>
        </div>
        <Button variant="secondary" size="sm">Notify Me</Button>
      </div>
    </div>
  </motion.div>
);

// --- Sub-Pages ---

const SidebarItem = ({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={cn(
      "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all w-full text-left",
      active ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
    )}
  >
    {icon}
    {label}
  </button>
);

const LoginPage = ({ onLogin, onGoToRegister }: { onLogin: (t: string, u: any) => void; onGoToRegister: () => void }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await api.login({ email, password });
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      onLogin(data.token, data.user);
    } catch (err) {
      setError("Invalid email or password");
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-xl shadow-zinc-200/50 border border-zinc-200 p-8"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-zinc-900 rounded-xl flex items-center justify-center mb-4">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-2xl font-bold">Welcome Back</h2>
          <p className="text-zinc-500 text-sm">Sign in to report and track issues</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Email Address" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          <Input label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <Button type="submit" className="w-full h-11">Sign In</Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-zinc-500">
            Don't have an account?{" "}
            <button onClick={onGoToRegister} className="text-zinc-900 font-bold hover:underline">Register</button>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

const RegisterPage = ({ onRegister, onGoToLogin }: { onRegister: () => void; onGoToLogin: () => void }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("user");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.register({ email, password, name, role });
      onRegister();
    } catch (err) {
      setError("Registration failed. Email might be taken.");
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-xl shadow-zinc-200/50 border border-zinc-200 p-8"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-zinc-900 rounded-xl flex items-center justify-center mb-4">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-2xl font-bold">Create Account</h2>
          <p className="text-zinc-500 text-sm">Join your community to fix issues</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Full Name" value={name} onChange={e => setName(e.target.value)} required />
          <Input label="Email Address" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          <Input label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Account Type</label>
            <div className="flex gap-2">
              <button 
                type="button"
                onClick={() => setRole("user")}
                className={cn("flex-1 py-2 rounded-lg border text-sm font-medium transition-all", role === "user" ? "bg-zinc-900 text-white border-zinc-900" : "bg-white text-zinc-600 border-zinc-200")}
              >
                Citizen
              </button>
              <button 
                type="button"
                onClick={() => setRole("admin")}
                className={cn("flex-1 py-2 rounded-lg border text-sm font-medium transition-all", role === "admin" ? "bg-zinc-900 text-white border-zinc-900" : "bg-white text-zinc-600 border-zinc-200")}
              >
                Admin
              </button>
            </div>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
          <Button type="submit" className="w-full h-11">Register</Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-zinc-500">
            Already have an account?{" "}
            <button onClick={onGoToLogin} className="text-zinc-900 font-bold hover:underline">Sign In</button>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

const GalleryPage = ({ reports }: { reports: any[] }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
    <div className="text-center space-y-2">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-50 rounded-2xl border border-emerald-100 mb-4">
        <ImageIcon className="w-8 h-8 text-emerald-600" />
      </div>
      <h2 className="text-4xl font-bold tracking-tight">Before & After</h2>
      <p className="text-zinc-500">Witness the transformation of our neighborhoods.</p>
    </div>

    {reports.length === 0 ? (
      <div className="p-20 text-center bg-white border border-dashed border-zinc-200 rounded-3xl">
        <p className="text-zinc-400">No resolved issues with photos yet. Check back soon!</p>
      </div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {reports.map((report) => (
          <div key={report.id} className="bg-white border border-zinc-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <div className="grid grid-cols-2 gap-1 bg-zinc-100">
              <div className="relative">
                <img src={report.image_url} className="aspect-square object-cover w-full" referrerPolicy="no-referrer" />
                <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 backdrop-blur-sm text-white text-[10px] font-bold rounded uppercase">Before</div>
              </div>
              <div className="relative">
                <img src={report.resolution_image_url} className="aspect-square object-cover w-full" referrerPolicy="no-referrer" />
                <div className="absolute top-2 left-2 px-2 py-1 bg-emerald-600 text-white text-[10px] font-bold rounded uppercase">After</div>
              </div>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">{report.category}</span>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Fixed on {new Date(report.created_at).toLocaleDateString()}</span>
              </div>
              <h4 className="text-xl font-bold text-zinc-900 mb-2">{report.title}</h4>
              <p className="text-sm text-zinc-500 line-clamp-2">{report.description}</p>
            </div>
          </div>
        ))}
      </div>
    )}
  </motion.div>
);

const UserDashboard = ({ reports, onNewReport }: { reports: any[]; onNewReport: () => void; key?: string }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">My Reports</h2>
        <p className="text-zinc-500">Track the status of issues you've reported</p>
      </div>
      <Button onClick={onNewReport}>
        <Plus className="w-4 h-4" />
        New Report
      </Button>
    </div>

    {reports.length === 0 ? (
      <div className="bg-white border border-dashed border-zinc-300 rounded-2xl p-20 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-zinc-300" />
        </div>
        <h3 className="text-lg font-semibold">No reports yet</h3>
        <p className="text-zinc-500 max-w-xs mb-6">Start by reporting an issue in your neighborhood like a pothole or broken light.</p>
        <Button variant="outline" onClick={onNewReport}>Report your first issue</Button>
      </div>
    ) : (
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {reports.map(report => (
          <ReportCard key={report.id} report={report} />
        ))}
      </div>
    )}
  </motion.div>
);

const ReportCard = ({ report }: { report: any; key?: string }) => (
  <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden hover:shadow-lg hover:shadow-zinc-200/50 transition-all duration-300 group">
    <div className="aspect-video bg-zinc-100 relative overflow-hidden">
      {report.image_url ? (
        <img src={report.image_url} alt={report.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-zinc-400">
          <ImageIcon className="w-10 h-10" />
        </div>
      )}
      <div className="absolute top-3 right-3">
        <Badge status={report.status}>{report.status}</Badge>
      </div>
    </div>
    <div className="p-5">
      <h3 className="font-bold text-lg mb-1 truncate">{report.title}</h3>
      <p className="text-zinc-500 text-sm line-clamp-2 mb-4 h-10">{report.description}</p>
      
      <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
        <div className="flex items-center gap-2 text-zinc-400">
          <Clock className="w-3.5 h-3.5" />
          <span className="text-[10px] font-bold uppercase tracking-wider">{new Date(report.created_at).toLocaleDateString()}</span>
        </div>
        <div className="flex items-center gap-1 text-zinc-900">
          <MapPin className="w-3.5 h-3.5" />
          <span className="text-[10px] font-bold uppercase tracking-wider">View on Map</span>
        </div>
      </div>
    </div>
  </div>
);

const ReportForm = ({ token, onCancel, onSuccess }: { token: string; onCancel: () => void; onSuccess: () => void; key?: string }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [category, setCategory] = useState("General");
  const [priority, setPriority] = useState("medium");
  const [loading, setLoading] = useState(false);
  const [classifying, setClassifying] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
      setAiError(null);
      setCategory("General");
      
      // Try to get location from browser
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
          setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        }, (err) => {
          console.warn("Geolocation failed", err);
        });
      }

      // AI Classification (on frontend per skill guidelines)
      setClassifying(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64Data = (reader.result as string).split(",")[1];
          const apiKey = process.env.GEMINI_API_KEY;
          
          if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY_HERE") {
            setAiError("Gemini API key is missing. Please add it in the Settings/Secrets menu.");
            setClassifying(false);
            return;
          }

          const ai = new GoogleGenAI({ apiKey });
          const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: {
              parts: [
                { inlineData: { data: base64Data, mimeType: file.type } },
                { text: "Analyze this civic issue image. Identify the category (e.g., Pothole, Graffiti, Street Light, Waste, Park) and the priority (low, medium, high)." }
              ]
            },
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  category: { type: Type.STRING },
                  priority: { type: Type.STRING }
                },
                required: ["category", "priority"]
              }
            }
          });

          const result = JSON.parse(response.text || "{}");
          if (result.category) setCategory(result.category);
          if (result.priority) setPriority(result.priority);
        } catch (err: any) {
          console.error("AI Classification failed:", err);
          if (err.message?.includes("429") || err.message?.includes("quota")) {
            setAiError("API Quota exceeded. Using manual classification.");
          } else {
            setAiError("AI could not analyze this image. You can still submit manually.");
          }
        } finally {
          setClassifying(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!image || !location) return alert("Please provide an image and location");
    
    setLoading(true);
    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    formData.append("image", image);
    formData.append("category", category);
    formData.append("priority", priority);
    formData.append("latitude", location.lat.toString());
    formData.append("longitude", location.lng.toString());

    try {
      await api.createReport(token, formData);
      onSuccess();
    } catch (err) {
      alert("Failed to create report");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="max-w-2xl mx-auto">
      <div className="mb-8">
        <button onClick={onCancel} className="text-zinc-500 hover:text-zinc-900 flex items-center gap-2 text-sm font-medium mb-4">
          <ChevronRight className="w-4 h-4 rotate-180" />
          Back to Dashboard
        </button>
        <h2 className="text-3xl font-bold tracking-tight">Report an Issue</h2>
        <p className="text-zinc-500">Provide details and an image to help us fix the problem</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div 
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "aspect-video rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-all",
            preview ? "border-zinc-900" : "border-zinc-200 hover:border-zinc-400 bg-white"
          )}
        >
          {preview ? (
            <img src={preview} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <>
              <div className="w-12 h-12 bg-zinc-50 rounded-full flex items-center justify-center mb-3">
                <Camera className="w-6 h-6 text-zinc-400" />
              </div>
              <p className="font-semibold">Click to upload image</p>
              <p className="text-xs text-zinc-500">JPG, PNG up to 10MB</p>
            </>
          )}
          <input type="file" ref={fileInputRef} onChange={handleImageChange} className="hidden" accept="image/*" />
        </div>

        {classifying && (
          <div className="flex items-center gap-2 text-emerald-600 animate-pulse bg-emerald-50 p-3 rounded-xl border border-emerald-100">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-widest">AI is identifying your issue...</span>
          </div>
        )}

        {aiError && (
          <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-xl border border-amber-100 italic mb-4">
            <AlertCircle className="w-4 h-4" />
            <span className="text-xs font-medium">{aiError}</span>
          </div>
        )}

        {((category !== "General" && !classifying) || aiError) && (
          <div className="flex gap-4">
            <div className="flex-1 space-y-1">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Category</label>
              <select 
                value={category} 
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100 text-sm font-semibold capitalize outline-none focus:ring-2 focus:ring-emerald-200"
              >
                <option value="General">General</option>
                <option value="Pothole">Pothole</option>
                <option value="Graffiti">Graffiti</option>
                <option value="Street Light">Street Light</option>
                <option value="Waste">Waste</option>
                <option value="Park">Park</option>
              </select>
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Priority</label>
              <select 
                value={priority} 
                onChange={(e) => setPriority(e.target.value)}
                className={cn(
                  "w-full px-3 py-2 rounded-lg border text-sm font-semibold capitalize outline-none focus:ring-2",
                  priority === "high" ? "bg-red-50 text-red-700 border-red-100 focus:ring-red-200" : 
                  priority === "medium" ? "bg-amber-50 text-amber-700 border-amber-100 focus:ring-amber-200" :
                  "bg-emerald-50 text-emerald-700 border-emerald-100 focus:ring-emerald-200"
                )}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
        )}

        <Input label="Issue Title" placeholder="e.g., Large pothole on Main St" value={title} onChange={e => setTitle(e.target.value)} required />
        <div className="space-y-1">
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Description</label>
          <textarea 
            className="w-full px-4 py-2 bg-white border border-zinc-200 rounded-lg h-32 focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all"
            placeholder="Describe the issue in detail..."
            value={description}
            onChange={e => setDescription(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Location</label>
          <div className="h-64 rounded-2xl border border-zinc-200 overflow-hidden relative">
            <MapContainer center={[20, 0]} zoom={2} className="h-full w-full">
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <LocationMarker location={location} setLocation={setLocation} />
              <CenterToCurrentLocation />
            </MapContainer>
            {!location && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-[1000]">
                <p className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Click on map to set location
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="submit" className="flex-1 h-12" disabled={loading}>
            {loading ? "Submitting..." : "Submit Report"}
          </Button>
          <Button type="button" variant="outline" className="h-12 px-8" onClick={onCancel}>Cancel</Button>
        </div>
      </form>
    </motion.div>
  );
};

function CenterToCurrentLocation() {
  const map = useMap();
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        map.setView([pos.coords.latitude, pos.coords.longitude], 13);
      });
    }
  }, [map]);
  return null;
}

function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMapEvents({});
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

function LocationMarker({ location, setLocation }: { location: any; setLocation: any }) {
  const map = useMapEvents({
    click(e) {
      setLocation(e.latlng);
      map.flyTo(e.latlng, map.getZoom());
    },
  });

  useEffect(() => {
    if (location) {
      map.flyTo(location, 15);
    }
  }, [location]);

  return location === null ? null : (
    <Marker position={location}>
      <Popup>Issue Location</Popup>
    </Marker>
  );
}

const AdminDashboard = ({ reports, token, onRefresh }: { reports: any[]; token: string; onRefresh: () => void; key?: string }) => {
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    api.getTeams(token).then(setTeams);
  }, [token]);

  const stats = {
    total: reports.length,
    pending: reports.filter(r => r.status === "pending").length,
    inProgress: reports.filter(r => r.status === "in-progress").length,
    resolved: reports.filter(r => r.status === "resolved").length,
  };

  const filteredReports = filter === "all" 
    ? reports 
    : reports.filter(r => r.status === filter);

  const handleStatusUpdate = async (id: number, status: string, resolutionImage?: File) => {
    try {
      const formData = new FormData();
      formData.append("status", status);
      if (resolutionImage) formData.append("resolution_image", resolutionImage);
      
      await fetch(`${API_URL}/reports/${id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      
      onRefresh();
      setSelectedReport(null);
    } catch (err) {
      alert("Failed to update status");
    }
  };

  const handleAssignTeam = async (reportId: number, teamId: number) => {
    try {
      await api.assignTeam(token, reportId, teamId);
      onRefresh();
      setSelectedReport(null);
    } catch (err) {
      alert("Failed to assign team");
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Admin Console</h2>
          <p className="text-zinc-500">Manage community reports and dispatch teams</p>
        </div>
        <Button variant="outline" onClick={onRefresh}>
          <Clock className="w-4 h-4" />
          Refresh Data
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Reports" value={stats.total} icon={<AlertCircle className="w-5 h-5 text-zinc-500" />} />
        <StatCard label="Pending" value={stats.pending} icon={<Clock className="w-5 h-5 text-amber-500" />} color="amber" />
        <StatCard label="In Progress" value={stats.inProgress} icon={<Plus className="w-5 h-5 text-blue-500" />} color="blue" />
        <StatCard label="Resolved" value={stats.resolved} icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />} color="emerald" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 flex-1 min-h-0">
        {/* List */}
        <div className="xl:col-span-1 bg-white border border-zinc-200 rounded-2xl flex flex-col overflow-hidden">
          <div className="p-4 border-b border-zinc-100 bg-zinc-50/50 space-y-3">
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-500">Recent Reports</h3>
            <div className="flex flex-wrap gap-1">
              {["all", "pending", "in-progress", "resolved"].map(s => (
                <button 
                  key={s} 
                  onClick={() => setFilter(s)}
                  className={cn(
                    "px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border transition-all",
                    filter === s ? "bg-zinc-900 text-white border-zinc-900" : "bg-white text-zinc-500 border-zinc-200 hover:bg-zinc-50"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredReports.map(report => (
              <div 
                key={report.id} 
                onClick={() => setSelectedReport(report)}
                className={cn(
                  "p-4 border-b border-zinc-100 cursor-pointer transition-all hover:bg-zinc-50",
                  selectedReport?.id === report.id && "bg-zinc-50 border-l-4 border-l-zinc-900"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{new Date(report.created_at).toLocaleDateString()}</span>
                  <Badge status={report.status}>{report.status}</Badge>
                </div>
                <h4 className="font-bold text-sm truncate">{report.title}</h4>
                <p className="text-xs text-zinc-500 line-clamp-1">By {report.reporter_name}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Details / Map */}
        <div className="xl:col-span-2 space-y-6 flex flex-col min-h-0">
          <div className="h-80 bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
            <MapContainer center={[20, 0]} zoom={2} className="h-full w-full">
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {reports.map(r => (
                <Marker key={r.id} position={[r.latitude, r.longitude]} eventHandlers={{ click: () => setSelectedReport(r) }}>
                  <Popup>{r.title}</Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          {selectedReport ? (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm flex-1 overflow-y-auto"
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold mb-1">{selectedReport.title}</h3>
                  <p className="text-zinc-500 text-sm">Reported by <span className="font-bold text-zinc-900">{selectedReport.reporter_name}</span> on {new Date(selectedReport.created_at).toLocaleString()}</p>
                </div>
                <Badge status={selectedReport.status}>{selectedReport.status}</Badge>
              </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="flex flex-col h-full min-h-[600px] border border-zinc-100 rounded-2xl overflow-hidden">
                    <ReportDetails report={selectedReport} token={token} onUpdate={onRefresh} />
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">Admin Actions</h4>
                      <div className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleStatusUpdate(selectedReport.id, "pending")}>Set Pending</Button>
                          <Button variant="outline" size="sm" onClick={() => handleStatusUpdate(selectedReport.id, "in-progress")}>Set In Progress</Button>
                        </div>
                        
                        <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 space-y-3">
                          <p className="text-xs font-bold text-emerald-700 uppercase tracking-widest">Resolve Issue</p>
                          <input 
                            type="file" 
                            id="res-img"
                            className="hidden" 
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleStatusUpdate(selectedReport.id, "resolved", file);
                            }}
                          />
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            className="w-full"
                            onClick={() => document.getElementById("res-img")?.click()}
                          >
                            <Camera className="w-4 h-4" />
                            Upload Proof & Resolve
                          </Button>
                          <p className="text-[10px] text-emerald-600 text-center">Resolution image is required to mark as resolved.</p>
                        </div>
                      </div>
                    </div>

                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">Dispatch Team</h4>
                    <div className="space-y-2">
                      {teams.length === 0 ? (
                        <p className="text-xs text-zinc-500 italic">No teams available</p>
                      ) : (
                        teams.map(team => (
                          <div key={team.id} className="flex items-center justify-between p-3 border border-zinc-100 rounded-xl hover:bg-zinc-50 transition-all">
                            <div>
                              <p className="text-sm font-bold">{team.name}</p>
                              <p className="text-[10px] text-zinc-400 uppercase tracking-widest">{team.specialty}</p>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => handleAssignTeam(selectedReport.id, team.id)}>
                              Assign
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="bg-white border border-dashed border-zinc-200 rounded-2xl p-12 flex flex-col items-center justify-center text-center text-zinc-400 flex-1">
              <MapIcon className="w-10 h-10 mb-4 opacity-20" />
              <p className="text-sm font-medium">Select a report from the list or map to view details and take action</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
