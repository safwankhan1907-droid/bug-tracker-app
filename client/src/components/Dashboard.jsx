import React, { useEffect, useState } from 'react';
import API from '../api';

export default function Dashboard({ onLogout }) {
  const [projects, setProjects] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [users, setUsers] = useState([]);
  const [selProj, setSelProj] = useState(null);
  
  const [newProj, setNewProj] = useState('');
  const [tTitle, setTTitle] = useState('');
  const [tDesc, setTDesc] = useState('');
  const [tPri, setTPri] = useState('Medium');
  const [tAssig, setTAssig] = useState('');

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState('All');
  const [filterAssignee, setFilterAssignee] = useState('All');

  const [activeTicket, setActiveTicket] = useState(null);
  const [commentText, setCommentText] = useState('');

  // Edit Ticket States
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPri, setEditPri] = useState('Medium');

  useEffect(() => {
    fetchProjects();
    fetchUsers();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await API.get('/projects');
      setProjects(res.data);
      if (res.data.length > 0 && !selProj) setSelProj(res.data[0]._id);
    } catch (err) { console.error(err); }
  };

  const fetchUsers = async () => {
    try {
      const res = await API.get('/auth/users');
      setUsers(res.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    if (selProj) fetchTickets(selProj);
  }, [selProj]);

  const fetchTickets = async (pId) => {
    try {
      const res = await API.get(`/tickets/project/${pId}`);
      setTickets(res.data);
    } catch (err) { console.error(err); }
  };

  const handleCreateProj = async (e) => {
    e.preventDefault();
    if (!newProj.trim()) return;
    try {
      const res = await API.post('/projects', { 
        title: newProj, 
        description: 'DevFlow Workspace Project' 
      });
      setNewProj('');
      fetchProjects();
      setSelProj(res.data._id);
    } catch (err) { 
      console.error(err.response?.data || err); 
      alert('Failed to create project.');
    }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!selProj) return;
    try {
      await API.post('/tickets', {
        title: tTitle,
        description: tDesc,
        priority: tPri,
        status: 'Open',
        projectId: selProj,
        assignedTo: tAssig || null
      });
      setTTitle(''); setTDesc(''); setTPri('Medium'); setTAssig('');
      fetchTickets(selProj);
    } catch (err) { console.error(err); }
  };

  const handleStatus = async (tId, newStatus) => {
    try {
      await API.put(`/tickets/${tId}`, { status: newStatus });
      fetchTickets(selProj);
      if (activeTicket && activeTicket._id === tId) {
        const updated = await API.get(`/tickets/project/${selProj}`);
        setActiveTicket(updated.data.find(t => t._id === tId));
      }
    } catch (err) { console.error(err); }
  };

  const handleDeleteTicket = async (tId) => {
    if (!window.confirm("Are you sure you want to delete this ticket?")) return;
    try {
      await API.delete(`/tickets/${tId}`);
      setActiveTicket(null);
      fetchTickets(selProj);
    } catch (err) { console.error(err); }
  };

  const handleUpdateTicket = async (e) => {
    e.preventDefault();
    if (!activeTicket) return;
    try {
      const res = await API.put(`/tickets/${activeTicket._id}`, {
        title: editTitle,
        description: editDesc,
        priority: editPri
      });
      setActiveTicket(res.data);
      setIsEditing(false);
      fetchTickets(selProj);
    } catch (err) { console.error(err); }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !activeTicket) return;
    try {
      const res = await API.post(`/tickets/${activeTicket._id}/comments`, { text: commentText });
      setActiveTicket(res.data);
      setCommentText('');
      fetchTickets(selProj);
    } catch (err) { console.error(err); }
  };

  // Filter logic
  const filteredTickets = tickets.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesPriority = filterPriority === 'All' || t.priority === filterPriority;
    const matchesAssignee = filterAssignee === 'All' || (t.assignedTo && t.assignedTo._id === filterAssignee);
    return matchesSearch && matchesPriority && matchesAssignee;
  });

  const todoList = filteredTickets.filter(t => !t.status || t.status === 'Open' || t.status === 'To Do');
  const inProgList = filteredTickets.filter(t => t.status === 'In Progress');
  const doneList = filteredTickets.filter(t => ['Resolved', 'Closed', 'Completed', 'Done'].includes(t.status));

  return (
    <div className="min-h-screen bg-[#0B0B0C] text-gray-300 p-6 md:p-8 w-full">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8 pb-4 border-b border-white/10">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">DevFlow Workspace</h1>
            <p className="text-sm text-gray-400 mt-1">Enterprise Bug Tracker & Task Workflow</p>
          </div>
          <button onClick={onLogout} className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl text-sm font-medium">
            Logout
          </button>
        </div>

        {/* Analytics Header */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="p-4 bg-white/[0.02] border border-white/10 rounded-2xl">
            <span className="text-xs text-gray-400 uppercase tracking-widest">Total Tickets</span>
            <h3 className="text-2xl font-bold text-white mt-1">{tickets.length}</h3>
          </div>
          <div className="p-4 bg-white/[0.02] border border-white/10 rounded-2xl">
            <span className="text-xs text-yellow-400 uppercase tracking-widest">To Do</span>
            <h3 className="text-2xl font-bold text-white mt-1">{tickets.filter(t => !t.status || t.status === 'Open' || t.status === 'To Do').length}</h3>
          </div>
          <div className="p-4 bg-white/[0.02] border border-white/10 rounded-2xl">
            <span className="text-xs text-blue-400 uppercase tracking-widest">In Progress</span>
            <h3 className="text-2xl font-bold text-white mt-1">{tickets.filter(t => t.status === 'In Progress').length}</h3>
          </div>
          <div className="p-4 bg-white/[0.02] border border-white/10 rounded-2xl">
            <span className="text-xs text-[#C6F432] uppercase tracking-widest">Completed</span>
            <h3 className="text-2xl font-bold text-white mt-1">{tickets.filter(t => ['Resolved', 'Closed', 'Completed', 'Done'].includes(t.status)).length}</h3>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="p-6 bg-white/[0.02] border border-white/10 rounded-2xl flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-[#C6F432] mb-4">Projects</h3>
              <div className="flex flex-wrap gap-2 mb-4">
                {projects.map((proj) => (
                  <button
                    key={proj._id}
                    onClick={() => setSelProj(proj._id)}
                    className={`px-3 py-2 rounded-xl border text-xs font-medium ${
                      selProj === proj._id ? 'bg-[#C6F432] text-[#0B0B0C] border-[#C6F432] font-semibold' : 'bg-black/40 border-white/10 text-gray-400 hover:text-white'
                    }`}
                  >
                    {proj.title}
                  </button>
                ))}
              </div>
            </div>
            <form onSubmit={handleCreateProj} className="space-y-3 pt-4 border-t border-white/10">
              <input 
                type="text" placeholder="New Project Title" value={newProj} onChange={(e) => setNewProj(e.target.value)} 
                className="w-full px-4 py-2 bg-black/60 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#C6F432]" required 
              />
              <button type="submit" className="w-full py-2 bg-[#C6F432] hover:bg-[#b0df22] text-[#0B0B0C] font-semibold text-sm rounded-xl">
                + Create Project
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 p-6 bg-white/[0.02] border border-white/10 rounded-2xl">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-[#C6F432] mb-4">Create New Ticket / Bug</h3>
            <form onSubmit={handleCreateTicket} className="space-y-3">
              <div className="flex gap-3">
                <input 
                  type="text" placeholder="Ticket title..." value={tTitle} onChange={(e) => setTTitle(e.target.value)} 
                  className="flex-1 px-4 py-2 bg-black/60 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#C6F432]" required 
                />
                <select value={tPri} onChange={(e) => setTPri(e.target.value)} className="px-4 py-2 bg-black/60 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#C6F432]">
                  <option value="Low" className="bg-[#0B0B0C]">Low</option>
                  <option value="Medium" className="bg-[#0B0B0C]">Medium</option>
                  <option value="High" className="bg-[#0B0B0C]">High</option>
                  <option value="Critical" className="bg-[#0B0B0C]">Critical</option>
                </select>
                <select value={tAssig} onChange={(e) => setTAssig(e.target.value)} className="px-4 py-2 bg-black/60 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#C6F432]">
                  <option value="" className="bg-[#0B0B0C]">Assignee</option>
                  {users.map(u => <option key={u._id} value={u._id} className="bg-[#0B0B0C]">{u.name}</option>)}
                </select>
              </div>
              <div className="flex gap-3">
                <input 
                  type="text" placeholder="Description..." value={tDesc} onChange={(e) => setTDesc(e.target.value)} 
                  className="flex-1 px-4 py-2 bg-black/60 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#C6F432]" 
                />
                <button type="submit" disabled={!selProj} className="px-6 py-2 bg-white text-[#0B0B0C] font-semibold text-sm rounded-xl disabled:opacity-50">
                  Add Ticket
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-4 bg-white/[0.02] border border-white/10 rounded-2xl mb-6 flex flex-wrap gap-4 items-center justify-between">
          <input 
            type="text" 
            placeholder="🔍 Search tickets..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            className="flex-1 min-w-[240px] px-4 py-2 bg-black/60 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#C6F432]"
          />
          <div className="flex gap-3">
            <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className="px-4 py-2 bg-black/60 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#C6F432]">
              <option value="All" className="bg-[#0B0B0C]">All Priorities</option>
              <option value="Low" className="bg-[#0B0B0C]">Low</option>
              <option value="Medium" className="bg-[#0B0B0C]">Medium</option>
              <option value="High" className="bg-[#0B0B0C]">High</option>
              <option value="Critical" className="bg-[#0B0B0C]">Critical</option>
            </select>
            <select value={filterAssignee} onChange={(e) => setFilterAssignee(e.target.value)} className="px-4 py-2 bg-black/60 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#C6F432]">
              <option value="All" className="bg-[#0B0B0C]">All Assignees</option>
              {users.map(u => <option key={u._id} value={u._id} className="bg-[#0B0B0C]">{u.name}</option>)}
            </select>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 bg-white/[0.01] border border-white/10 rounded-2xl flex flex-col h-[500px]">
            <h4 className="font-semibold text-white text-sm mb-4 pb-2 border-b border-white/10">To Do ({todoList.length})</h4>
            <div className="flex-1 overflow-y-auto space-y-3">
              {todoList.map(t => (
                <div key={t._id} onClick={() => setActiveTicket(t)} className="p-4 bg-black/50 border border-white/10 rounded-xl cursor-pointer hover:border-[#C6F432]">
                  <div className="flex justify-between items-start mb-1">
                    <h5 className="font-semibold text-white text-sm">{t.title}</h5>
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteTicket(t._id); }} className="text-gray-500 hover:text-red-400 text-xs">🗑️</button>
                  </div>
                  <p className="text-xs text-gray-400 mb-2 line-clamp-1">{t.description}</p>
                  <div className="flex justify-between items-center text-[11px] text-gray-400 pt-2 border-t border-white/5">
                    <span>👤 {t.assignedTo?.name || 'Unassigned'}</span>
                    <button onClick={() => handleStatus(t._id, 'In Progress')} className="px-2 py-1 bg-white/10 text-white rounded">Start →</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-5 bg-white/[0.01] border border-white/10 rounded-2xl flex flex-col h-[500px]">
            <h4 className="font-semibold text-white text-sm mb-4 pb-2 border-b border-white/10">In Progress ({inProgList.length})</h4>
            <div className="flex-1 overflow-y-auto space-y-3">
              {inProgList.map(t => (
                <div key={t._id} onClick={() => setActiveTicket(t)} className="p-4 bg-black/50 border border-white/10 rounded-xl cursor-pointer hover:border-[#C6F432]">
                  <div className="flex justify-between items-start mb-1">
                    <h5 className="font-semibold text-white text-sm">{t.title}</h5>
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteTicket(t._id); }} className="text-gray-500 hover:text-red-400 text-xs">🗑️</button>
                  </div>
                  <p className="text-xs text-gray-400 mb-2 line-clamp-1">{t.description}</p>
                  <div className="flex justify-between items-center text-[11px] text-gray-400 pt-2 border-t border-white/5">
                    <span>👤 {t.assignedTo?.name || 'Unassigned'}</span>
                    <button onClick={() => handleStatus(t._id, 'Resolved')} className="px-2 py-1 bg-white text-black font-semibold rounded">Resolve →</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-5 bg-white/[0.01] border border-white/10 rounded-2xl flex flex-col h-[500px]">
            <h4 className="font-semibold text-white text-sm mb-4 pb-2 border-b border-white/10">Completed ({doneList.length})</h4>
            <div className="flex-1 overflow-y-auto space-y-3">
              {doneList.map(t => (
                <div key={t._id} onClick={() => setActiveTicket(t)} className="p-4 bg-black/50 border border-white/10 rounded-xl cursor-pointer opacity-75">
                  <div className="flex justify-between items-start mb-1">
                    <h5 className="font-semibold text-white text-sm line-through">{t.title}</h5>
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteTicket(t._id); }} className="text-gray-500 hover:text-red-400 text-xs">🗑️</button>
                  </div>
                  <p className="text-xs text-gray-400 mb-2 line-clamp-1">{t.description}</p>
                  <div className="flex justify-between items-center text-[11px] text-gray-400 pt-2 border-t border-white/5">
                    <span>👤 {t.assignedTo?.name || 'Unassigned'}</span>
                    <button onClick={() => handleStatus(t._id, 'In Progress')} className="px-2 py-1 bg-white/5 text-gray-400 rounded">Reopen</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Ticket Detail Drawer with Edit Option */}
        {activeTicket && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex justify-end z-50">
            <div className="w-full max-w-xl bg-[#0B0B0C] border-l border-white/10 h-full p-6 flex flex-col overflow-y-auto">
              <div className="flex justify-between items-start pb-4 border-b border-white/10 mb-6">
                <div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-white font-semibold mb-2 inline-block">
                    {activeTicket.priority} • Assigned to: {activeTicket.assignedTo?.name || 'Unassigned'}
                  </span>
                  <h2 className="text-xl font-bold text-white">{activeTicket.title}</h2>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      setIsEditing(!isEditing);
                      setEditTitle(activeTicket.title);
                      setEditDesc(activeTicket.description || '');
                      setEditPri(activeTicket.priority);
                    }} 
                    className="px-3 py-2 text-white hover:bg-white/10 bg-white/5 rounded-xl text-xs font-medium"
                  >
                    {isEditing ? 'Cancel Edit' : 'Edit'}
                  </button>
                  <button onClick={() => handleDeleteTicket(activeTicket._id)} className="px-3 py-2 text-red-400 hover:bg-red-500/10 bg-white/5 rounded-xl text-xs font-medium">Delete</button>
                  <button onClick={() => { setActiveTicket(null); setIsEditing(false); }} className="p-2 text-gray-400 hover:text-white bg-white/5 rounded-xl">✕</button>
                </div>
              </div>

              {isEditing ? (
                <form onSubmit={handleUpdateTicket} className="space-y-4 mb-6 bg-black/40 p-4 rounded-xl border border-white/10">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[#C6F432]">Edit Ticket</h4>
                  <div>
                    <label className="text-[11px] text-gray-400 mb-1 block">Title</label>
                    <input 
                      type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} 
                      className="w-full px-3 py-2 bg-black/60 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#C6F432]" required 
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-400 mb-1 block">Description</label>
                    <textarea 
                      value={editDesc} onChange={(e) => setEditDesc(e.target.value)} 
                      className="w-full px-3 py-2 bg-black/60 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#C6F432]" rows="3" 
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-400 mb-1 block">Priority</label>
                    <select value={editPri} onChange={(e) => setEditPri(e.target.value)} className="w-full px-3 py-2 bg-black/60 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#C6F432]">
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                  <button type="submit" className="w-full py-2 bg-[#C6F432] text-[#0B0B0C] font-semibold text-sm rounded-xl">Save Changes</button>
                </form>
              ) : (
                <div className="mb-6">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Description</h4>
                  <p className="text-sm text-gray-300 bg-black/40 p-4 rounded-xl border border-white/5">{activeTicket.description || 'No description.'}</p>
                </div>
              )}

              <div className="flex-1 flex flex-col">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Activity Log & Comments</h4>
                <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                  {activeTicket.comments?.map((c, i) => (
                    <div key={i} className="p-3 bg-white/[0.02] border border-white/10 rounded-xl">
                      <p className="text-xs text-gray-300 mb-1">{c.text}</p>
                      <span className="text-[10px] text-gray-500">{new Date(c.createdAt).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
                <form onSubmit={handleComment} className="flex gap-2">
                  <input 
                    type="text" placeholder="Write a comment..." value={commentText} onChange={(e) => setCommentText(e.target.value)} 
                    className="flex-1 px-4 py-2 bg-black/60 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-white" 
                  />
                  <button type="submit" className="px-5 py-2 bg-white text-black font-semibold text-sm rounded-xl">Send</button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}