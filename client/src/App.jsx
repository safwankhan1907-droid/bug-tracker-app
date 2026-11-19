import React, { useEffect, useState } from 'react';
import API from './api';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  });

  // Auth states
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Projects Hub states
  const [projects, setProjects] = useState([]);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [activeProject, setActiveProject] = useState(null);
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [dbHealthy, setDbHealthy] = useState(true);

  // Join with Key modal states
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinKeyInput, setJoinKeyInput] = useState('');
  const [joinMessage, setJoinMessage] = useState('');

  // Invite Team Member modal states
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Developer');
  const [generatedInvite, setGeneratedInvite] = useState(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Tickets & filters states
  const [tickets, setTickets] = useState([]);
  const [users, setUsers] = useState([]);
  const [ticketTitle, setTicketTitle] = useState('');
  const [ticketDesc, setTicketDesc] = useState('');
  const [ticketPriority, setTicketPriority] = useState('Medium');
  const [ticketAssignee, setTicketAssignee] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('All');

  const fetchHealth = async () => {
    try {
      const res = await API.get('/health');
      setDbHealthy(Boolean(res.data?.dbConnected));
    } catch {
      setDbHealthy(false);
    }
  };

  const fetchProjects = async (archived = includeArchived) => {
    try {
      const res = await API.get(`/projects?includeArchived=${archived}`);
      setProjects(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await API.get('/auth/users');
      setUsers(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTickets = async (projectId) => {
    try {
      const query = projectId ? `?projectId=${projectId}` : '';
      const res = await API.get(`/tickets${query}`);
      setTickets(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchHealth();
      fetchProjects(includeArchived);
      fetchUsers();
    }
  }, [token, includeArchived]);

  useEffect(() => {
    if (token && activeProject) {
      fetchTickets(activeProject._id);
    }
  }, [token, activeProject]);

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (isRegister) {
        await API.post('/auth/register', { name, email, password });
        setIsRegister(false);
        setPassword('');
        setAuthError('Account created! Please sign in.');
      } else {
        const res = await API.post('/auth/login', { email, password });
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        setToken(res.data.token);
        setUser(res.data.user);
      }
    } catch (err) {
      setAuthError(err.response?.data?.message || 'Something went wrong');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken('');
    setUser(null);
    setActiveProject(null);
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProjectTitle.trim()) return;
    try {
      const res = await API.post('/projects', {
        title: newProjectTitle,
        description: newProjectDesc
      });
      setProjects([res.data, ...projects]);
      setNewProjectTitle('');
      setNewProjectDesc('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleArchive = async (projectId) => {
    try {
      await API.patch(`/${projectId}/archive`);
      await fetchProjects(includeArchived);
    } catch (err) {
      console.error(err);
    }
  };

  const handleJoinWithKey = async (e) => {
    e.preventDefault();
    setJoinMessage('');
    try {
      const res = await API.post('/projects/join', { inviteKey: joinKeyInput });
      setJoinMessage(res.data.message);
      setJoinKeyInput('');
      await fetchProjects(includeArchived);
      setTimeout(() => {
        setShowJoinModal(false);
        setJoinMessage('');
      }, 900);
    } catch (err) {
      setJoinMessage(err.response?.data?.message || 'Invalid key');
    }
  };

  const handleGenerateInvite = async (e) => {
    e.preventDefault();
    if (!activeProject) return;
    setCopiedKey(false);
    try {
      const res = await API.post(`/projects/${activeProject._id}/invites`, {
        email: inviteEmail,
        role: inviteRole
      });
      setGeneratedInvite(res.data.invitation);
      setActiveProject((prev) => ({ ...prev, invitations: res.data.invitations }));
      setInviteEmail('');
      await fetchProjects(includeArchived);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyInviteKey = (keyText) => {
    navigator.clipboard.writeText(keyText);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 1500);
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!ticketTitle.trim() || !activeProject) return;
    try {
      const res = await API.post('/tickets', {
        title: ticketTitle,
        description: ticketDesc,
        priority: ticketPriority,
        status: 'To Do',
        assignee: ticketAssignee || undefined,
        projectId: activeProject._id
      });
      setTickets([res.data, ...tickets]);
      setTicketTitle('');
      setTicketDesc('');
      setTicketAssignee('');
      await fetchProjects(includeArchived);
    } catch (err) {
      console.error(err);
    }
  };

  const handleStatusChange = async (ticketId, nextStatus) => {
    try {
      const res = await API.put(`/tickets/${ticketId}`, { status: nextStatus });
      setTickets(tickets.map((t) => (t._id === ticketId ? res.data : t)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTicket = async (ticketId) => {
    try {
      await API.delete(`/tickets/${ticketId}`);
      setTickets(tickets.filter((t) => t._id !== ticketId));
      await fetchProjects(includeArchived);
    } catch (err) {
      console.error(err);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-[#09090b] text-white flex items-center justify-center p-4">
        <form
          onSubmit={handleAuthSubmit}
          className="w-full max-w-md bg-[#111114] border border-zinc-800 rounded-2xl p-7 space-y-4"
        >
          <h1 className="text-2xl font-bold text-center">
            {isRegister ? 'Create Account' : 'Sign In'}
          </h1>
          <p className="text-sm text-zinc-400 text-center">Join DevFlow workspace</p>
          {authError && (
            <div className="p-3 rounded-lg bg-red-950/60 border border-red-800 text-red-300 text-sm">
              {authError}
            </div>
          )}
          {isRegister && (
            <div>
              <label className="block text-xs uppercase text-zinc-400 mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-900 border border-zinc-700 text-white"
                required
              />
            </div>
          )}
          <div>
            <label className="block text-xs uppercase text-zinc-400 mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-900 border border-zinc-700 text-white"
              required
            />
          </div>
          <div>
            <label className="block text-xs uppercase text-zinc-400 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-900 border border-zinc-700 text-white"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full py-2.5 rounded-lg bg-[#a3e635] text-black font-semibold hover:bg-lime-300 transition"
          >
            {isRegister ? 'Sign Up' : 'Sign In'}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setAuthError('');
            }}
            className="w-full text-xs text-zinc-400 hover:text-white pt-1"
          >
            {isRegister ? 'Already have an account? Sign In' : 'Need an account? Create Account'}
          </button>
        </form>
      </div>
    );
  }

  const adminCount = projects.filter((p) => p.currentUserRole === 'Admin').length;
  const filteredTickets = tickets.filter((t) => {
    const matchesSearch =
      t.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = priorityFilter === 'All' || t.priority === priorityFilter;
    return matchesSearch && matchesPriority;
  });

  return (
    <div className="min-h-screen bg-[#09090b] text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">DevFlow Workspace</h1>
            <p className="text-sm text-zinc-400">
              {activeProject
                ? `Projects / ${activeProject.title} (${activeProject.keyCode})`
                : `Welcome back, ${user?.name || 'Developer'}`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {activeProject && (
              <>
                <button
                  onClick={() => {
                    setGeneratedInvite(null);
                    setCopiedKey(false);
                    setShowInviteModal(true);
                  }}
                  className="px-4 py-2 rounded-lg bg-[#a3e635] text-black font-semibold text-sm hover:bg-lime-300"
                >
                  + Invite Member
                </button>
                <button
                  onClick={() => setActiveProject(null)}
                  className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm"
                >
                  ← Projects Hub
                </button>
              </>
            )}
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 text-sm"
            >
              Logout
            </button>
          </div>
        </div>

        {/* PROJECTS HUB VIEW */}
        {!activeProject ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold">Projects Hub</h2>
                <p className="text-sm text-zinc-400">
                  Select a workspace to manage issues, sprints, and team collaboration.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowJoinModal(true)}
                  className="px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-700 hover:border-[#a3e635] text-sm font-medium"
                >
                  Join with Token
                </button>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#111114] border border-zinc-800 rounded-xl p-4">
                <p className="text-xs uppercase text-zinc-400">Projects</p>
                <p className="text-2xl font-bold mt-1">{projects.length}</p>
                <p className="text-xs text-zinc-500 mt-1">Active workspaces</p>
              </div>
              <div className="bg-[#111114] border border-zinc-800 rounded-xl p-4">
                <p className="text-xs uppercase text-zinc-400">Lead / Admin Roles</p>
                <p className="text-2xl font-bold mt-1">{adminCount}</p>
                <p className="text-xs text-zinc-500 mt-1">Projects you administer</p>
              </div>
              <div className="bg-[#111114] border border-zinc-800 rounded-xl p-4">
                <p className="text-xs uppercase text-zinc-400">Tracked Issues</p>
                <p className="text-2xl font-bold mt-1">
                  {projects.reduce((acc, p) => acc + (p.ticketCount || 0), 0)}
                </p>
                <p className="text-xs text-zinc-500 mt-1">Across displayed projects</p>
              </div>
              <div className="bg-[#111114] border border-zinc-800 rounded-xl p-4">
                <p className="text-xs uppercase text-zinc-400">Backend Status</p>
                <p className="text-2xl font-bold mt-1 text-[#a3e635]">
                  {dbHealthy ? 'Healthy' : 'Reconnecting'}
                </p>
                <p className="text-xs text-emerald-400 mt-1">
                  {dbHealthy ? 'DB Connected · DevFlow API' : 'Checking MongoDB'}
                </p>
              </div>
            </div>

            {/* Create New Project Card */}
            <form
              onSubmit={handleCreateProject}
              className="bg-[#111114] border border-zinc-800 rounded-xl p-5 grid grid-cols-1 md:grid-cols-3 gap-3"
            >
              <input
                type="text"
                placeholder="New Project Title (e.g. Bug Tracker)"
                value={newProjectTitle}
                onChange={(e) => setNewProjectTitle(e.target.value)}
                className="px-3.5 py-2.5 rounded-lg bg-zinc-900 border border-zinc-700 text-sm"
                required
              />
              <input
                type="text"
                placeholder="Short description..."
                value={newProjectDesc}
                onChange={(e) => setNewProjectDesc(e.target.value)}
                className="px-3.5 py-2.5 rounded-lg bg-zinc-900 border border-zinc-700 text-sm"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-lg bg-[#a3e635] text-black font-semibold text-sm hover:bg-lime-300"
              >
                + New Project
              </button>
            </form>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIncludeArchived(false)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold ${
                  !includeArchived ? 'bg-[#a3e635] text-black' : 'bg-zinc-900 text-zinc-400'
                }`}
              >
                Active Projects
              </button>
              <button
                onClick={() => setIncludeArchived(true)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold ${
                  includeArchived ? 'bg-[#a3e635] text-black' : 'bg-zinc-900 text-zinc-400'
                }`}
              >
                Include Archived
              </button>
            </div>

            {/* Project Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => (
                <div
                  key={project._id}
                  className="bg-[#111114] border border-zinc-800 hover:border-zinc-600 rounded-xl p-5 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded bg-zinc-900 border border-zinc-700 text-xs font-bold text-[#a3e635]">
                        {project.keyCode}
                      </span>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-200">
                        {project.currentUserRole}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold">{project.title}</h3>
                    <p className="text-sm text-zinc-400 line-clamp-2">
                      {project.description || 'Workspace board for issues & sprints.'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-zinc-800/80 text-xs text-zinc-400">
                    <span>
                      Members: {project.members?.length || 1} · Issues: {project.ticketCount || 0}
                    </span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleToggleArchive(project._id)}
                        className="text-zinc-400 hover:text-white"
                      >
                        {project.isArchived ? 'Unarchive' : 'Archive'}
                      </button>
                      <button
                        onClick={() => setActiveProject(project)}
                        className="text-[#a3e635] font-semibold hover:underline"
                      >
                        Open →
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          /* ACTIVE PROJECT TICKETS & KANBAN BOARD */
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#111114] border border-zinc-800 rounded-xl p-4">
                <p className="text-xs text-zinc-400 uppercase">Total Tickets</p>
                <p className="text-2xl font-bold mt-1">{tickets.length}</p>
              </div>
              <div className="bg-[#111114] border border-zinc-800 rounded-xl p-4">
                <p className="text-xs text-amber-400 uppercase">To Do</p>
                <p className="text-2xl font-bold mt-1">
                  {tickets.filter((t) => t.status === 'To Do').length}
                </p>
              </div>
              <div className="bg-[#111114] border border-zinc-800 rounded-xl p-4">
                <p className="text-xs text-blue-400 uppercase">In Progress</p>
                <p className="text-2xl font-bold mt-1">
                  {tickets.filter((t) => t.status === 'In Progress').length}
                </p>
              </div>
              <div className="bg-[#111114] border border-zinc-800 rounded-xl p-4">
                <p className="text-xs text-[#a3e635] uppercase">Completed</p>
                <p className="text-2xl font-bold mt-1">
                  {tickets.filter((t) => t.status === 'Completed').length}
                </p>
              </div>
            </div>

            {/* Create Ticket */}
            <form
              onSubmit={handleCreateTicket}
              className="bg-[#111114] border border-zinc-800 rounded-xl p-5 space-y-3"
            >
              <p className="text-xs uppercase font-semibold text-zinc-400">Create New Ticket / Bug</p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <input
                  type="text"
                  placeholder="Ticket title..."
                  value={ticketTitle}
                  onChange={(e) => setTicketTitle(e.target.value)}
                  className="md:col-span-2 px-3.5 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm"
                  required
                />
                <select
                  value={ticketPriority}
                  onChange={(e) => setTicketPriority(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
                <select
                  value={ticketAssignee}
                  onChange={(e) => setTicketAssignee(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm"
                >
                  <option value="">Assignee</option>
                  {users.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Description..."
                  value={ticketDesc}
                  onChange={(e) => setTicketDesc(e.target.value)}
                  className="flex-1 px-3.5 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm"
                />
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#a3e635] text-black font-semibold text-sm hover:bg-lime-300"
                >
                  Add Ticket
                </button>
              </div>
            </form>

            {/* Search & Filter */}
            <div className="bg-[#111114] border border-zinc-800 rounded-xl p-4 flex flex-wrap gap-3">
              <input
                type="text"
                placeholder="Search tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 min-w-[200px] px-3.5 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm"
              />
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm"
              >
                <option value="All">All Priorities</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>

            {/* Kanban Columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['To Do', 'In Progress', 'Completed'].map((col) => {
                const colTickets = filteredTickets.filter((t) => t.status === col);
                return (
                  <div key={col} className="bg-[#111114] border border-zinc-800 rounded-xl p-4 space-y-3">
                    <h3 className="font-semibold text-sm border-b border-zinc-800 pb-2">
                      {col} ({colTickets.length})
                    </h3>
                    {colTickets.map((t) => (
                      <div key={t._id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-sm">{t.title}</span>
                          <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-[#a3e635]">
                            {t.priority}
                          </span>
                        </div>
                        {t.description && <p className="text-xs text-zinc-400">{t.description}</p>}
                        {t.assignee?.name && (
                          <p className="text-xs text-zinc-500">Assignee: {t.assignee.name}</p>
                        )}
                        <div className="flex items-center gap-2 pt-1">
                          <select
                            value={t.status}
                            onChange={(e) => handleStatusChange(t._id, e.target.value)}
                            className="flex-1 px-2 py-1 rounded bg-zinc-950 border border-zinc-700 text-xs"
                          >
                            <option value="To Do">To Do</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Completed">Completed</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => handleDeleteTicket(t._id)}
                            className="px-2 py-1 rounded bg-red-950/60 border border-red-900 text-red-300 text-xs hover:bg-red-900/60"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* JOIN WITH KEY MODAL */}
        {showJoinModal && (
          <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50">
            <form
              onSubmit={handleJoinWithKey}
              className="w-full max-w-md bg-[#111114] border border-zinc-700 rounded-2xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">Join Project with Token</h3>
                <button type="button" onClick={() => setShowJoinModal(false)} className="text-zinc-400">
                  ✕
                </button>
              </div>
              <input
                type="text"
                placeholder="Enter invite key (e.g. INV-9A4F2C10)"
                value={joinKeyInput}
                onChange={(e) => setJoinKeyInput(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-900 border border-zinc-700 text-sm uppercase"
                required
              />
              {joinMessage && <p className="text-sm text-[#a3e635]">{joinMessage}</p>}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="px-4 py-2 rounded-lg bg-zinc-800 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#a3e635] text-black font-semibold text-sm"
                >
                  Join Project
                </button>
              </div>
            </form>
          </div>
        )}

        {/* INVITE TEAM MEMBER MODAL */}
        {showInviteModal && activeProject && (
          <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50">
            <form
              onSubmit={handleGenerateInvite}
              className="w-full max-w-md bg-[#111114] border border-zinc-700 rounded-2xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold">Invite Team Member</h3>
                  <p className="text-xs text-zinc-400">
                    Invite a teammate by email or generate a role-specific invite key.
                  </p>
                </div>
                <button type="button" onClick={() => setShowInviteModal(false)} className="text-zinc-400">
                  ✕
                </button>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Teammate email (optional)</label>
                <input
                  type="email"
                  placeholder="teammate@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm"
                />
                <p className="text-[11px] text-zinc-500 mt-1">
                  Leave blank to create an open role invite key.
                </p>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Project role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm"
                >
                  <option value="Developer">Developer</option>
                  <option value="Admin">Admin</option>
                  <option value="Viewer">Viewer</option>
                </select>
              </div>

              {generatedInvite && (
                <div className="p-3 rounded-lg bg-zinc-900 border border-[#a3e635]/60 space-y-1">
                  <p className="text-xs text-zinc-400">Generated Invite Key ({generatedInvite.role}):</p>
                  <div className="flex items-center justify-between gap-2">
                    <code className="text-sm font-bold text-[#a3e635]">{generatedInvite.key}</code>
                    <button
                      type="button"
                      onClick={() => handleCopyInviteKey(generatedInvite.key)}
                      className="text-xs px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700"
                    >
                      {copiedKey ? 'Copied!' : 'Copy Key'}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 rounded-lg bg-zinc-800 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#a3e635] text-black font-semibold text-sm"
                >
                  Generate Invite
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
