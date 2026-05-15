import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { gruposService } from '../services/gruposService.js';
import { friendsService } from '../services/friendsService.js';
import { chatService } from '../services/chatService.js';
import { listenGroupEvents, addEvent } from '../services/calendarService.js';
import Layout from '../components/Layout.jsx';
import GifPicker from '../components/chat/GifPicker.jsx';
import '../components/grupos/grupos.css';

const CARD_COLORS = [
  { light: '#fce4e4', dark: '#4e2222' },
  { light: '#dce8f8', dark: '#163a5e' },
  { light: '#d8f0d8', dark: '#1f4429' },
  { light: '#fddcb0', dark: '#4a2e00' },
  { light: '#f8d8f0', dark: '#3a1850' },
  { light: '#e8e0f8', dark: '#272055' },
  { light: '#fef3cc', dark: '#403800' },
  { light: '#d8f0f0', dark: '#00383f' },
];
const MEMBER_COLORS = ['#f42c04','#0284c7','#059669','#d97706','#7c3aed','#db2777','#0891b2','#e2856e'];
const EMOJIS = ['👥','🏠','🎓','🏀','🍕','✈️','🎮','💡','🎉','💼','❤️','🌟','🔥','📚','🎨','🎬','🎸','🌈','🐶','🐱','🍎','🍺','⚽','🚗','📱','💻','🔒','🛠️','🌍','🚀'];

function hashColor(arr, str, dark = false) {
  const item = arr[!str ? 0 : Math.abs(
    Array.from(str).reduce((h, c) => ((h << 5) - h) + c.charCodeAt(0), 0)
  ) % arr.length];
  return typeof item === 'object' ? (dark ? item.dark : item.light) : item;
}

function useDarkMode() {
  const [dark, setDark] = useState(() =>
    document.documentElement.getAttribute('data-dark') === 'true'
  );
  useEffect(() => {
    const observer = new MutationObserver(() =>
      setDark(document.documentElement.getAttribute('data-dark') === 'true')
    );
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-dark'] });
    return () => observer.disconnect();
  }, []);
  return dark;
}

function initials(name, surname) {
  const n = (name || '').trim();
  const s = (surname || '').trim();
  if (n && s) return (n[0] + s[0]).toUpperCase();
  if (n) return n.substring(0, 2).toUpperCase();
  return '?';
}

function useItemsPerPage(containerRef, cardWidth = 280, cardHeight = 180, gap = 20, hPad = 64, vPad = 32, reservedSlots = 1) {
  const [itemsPerPage, setItemsPerPage] = useState(11);

  useEffect(() => {
    const calculate = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.offsetWidth - hPad;
      const h = containerRef.current.offsetHeight - vPad;
      const cols = Math.max(1, Math.floor((w + gap) / (cardWidth + gap)));
      const rows = Math.max(1, Math.floor((h + gap) / (cardHeight + gap)));
      setItemsPerPage(Math.max(cols, cols * rows - reservedSlots));
    };

    calculate();

    const ro = new ResizeObserver(calculate);
    if (containerRef.current) ro.observe(containerRef.current);

    return () => ro.disconnect();
  }, [containerRef, cardWidth, cardHeight, gap, hPad, vPad, reservedSlots]);

  return itemsPerPage;
}

export default function GruposPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState(null); // group detail modal
  const [groupMembers, setGroupMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [toast, setToast] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [favorites, setFavorites] = useState([]);
  const gridRef = useRef(null);
  const itemsPerPage = useItemsPerPage(gridRef);

  useEffect(() => {
    if (!user) return;
    const unsub = gruposService.listenMyGroups(user.uid, setGroups);
    return () => unsub && unsub();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    gruposService.getFavorites(user.uid).then(setFavorites).catch(() => {});
  }, [user]);

  const toggleFavorite = async (groupId) => {
    const isFav = favorites.includes(groupId);
    setFavorites(prev => isFav ? prev.filter(id => id !== groupId) : [...prev, groupId]);
    try {
      if (isFav) {
        await gruposService.removeFavorite(user.uid, groupId);
      } else {
        await gruposService.addFavorite(user.uid, groupId);
      }
    } catch {
      // rollback on error
      setFavorites(prev => isFav ? [...prev, groupId] : prev.filter(id => id !== groupId));
    }
  };

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const openGroupDetail = async (group) => {
    setSelectedGroup(group);
    setShowEditForm(false);
    setLoadingMembers(true);
    try {
      const memberDocs = await gruposService.getGroupMembers(group.id);
      const userDetails = await gruposService.getMemberDetails(memberDocs.map(m => m.id));
      const members = memberDocs.map(md => ({
        ...userDetails.find(u => u.id === md.id) || { id: md.id },
        role: md.role,
      }));
      setGroupMembers(members);
    } catch {
      setGroupMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleDelete = async (group) => {
    if (!confirm(`¿Eliminar "${group.name}"? Esta acción no se puede deshacer.`)) return;
    try {
      await gruposService.deleteGroup(group.id, user.uid);
      showToast('Grupo eliminado', 'success');
    } catch (e) {
      showToast(e.message || 'Error al eliminar el grupo', 'error');
    }
  };

  const filtered = groups
    .filter(g => g.name.toLowerCase().includes(search.toLowerCase()))
    .filter(g => statusFilter === 'all' || favorites.includes(g.id));
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const page = Math.min(currentPage, Math.max(totalPages, 1));
  const pageItems = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <Layout contentClass="groups-wrapper">
      <div className="universal-page-header">
        <div className="header-left-zone">
          <select
            className="filters-select"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
          >
            <option value="all">Todos</option>
            <option value="favorites">Favoritos</option>
          </select>
        </div>
        <div className="header-center-zone">
          <div className="header-search-container">
            <i className="bx bx-search" />
            <input
              id="groupSearch"
              className="header-search-input"
              type="text"
              placeholder="Buscar grupos..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            />
          </div>
        </div>
        <div className="header-right-zone" />
      </div>

      <div className="grupos-page">
        <div className="groups-container" ref={gridRef}>
        <div className="groups-grid" id="groupsGrid">
          {/* Add card — only on first page */}
          {page === 1 && (
            <div className="group-card add-card" onClick={() => setShowCreateModal(true)}>
              <div className="add-card-placeholder"><i className="bx bx-plus" /></div>
              <span className="add-card-label">Nuevo grupo</span>
            </div>
          )}

          {filtered.length === 0 && (search || statusFilter !== 'all') && (
            <div className="empty-state"><i className="bx bx-search-alt" /><p>No se encontraron grupos</p></div>
          )}
          {filtered.length === 0 && !search && statusFilter === 'all' && (
            <div className="empty-state"><i className="bx bx-group" /><p>¡Aún no tienes grupos. Crea el primero!</p></div>
          )}

          {pageItems.map(group => (
            <GroupCard
              key={group.id}
              group={group}
              currentUserId={user?.uid}
              isFavorite={favorites.includes(group.id)}
              onOpen={openGroupDetail}
              onDelete={handleDelete}
              onToggleFavorite={toggleFavorite}
            />
          ))}
        </div>
        </div>

        {totalPages > 1 && (
          <div className="pagination-wrapper">
            <ul className="pagination-list">
              <i
                className={`bx bx-chevron-left pagination-item${page === 1 ? ' disabled' : ''}`}
                onClick={() => page > 1 && setCurrentPage(p => p - 1)}
              />
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                <span
                  key={n}
                  className={`pagination-item${n === page ? ' active' : ''}`}
                  onClick={() => setCurrentPage(n)}
                >
                  {n}
                </span>
              ))}
              <i
                className={`bx bx-chevron-right pagination-item${page === totalPages ? ' disabled' : ''}`}
                onClick={() => page < totalPages && setCurrentPage(p => p + 1)}
              />
            </ul>
          </div>
        )}

        {/* Group Detail Modal */}
        {selectedGroup && (
          <GroupDetailModal
            group={selectedGroup}
            members={groupMembers}
            loading={loadingMembers}
            currentUserId={user?.uid}
            showEditForm={showEditForm}
            onSetEditForm={setShowEditForm}
            onClose={() => setSelectedGroup(null)}
            onRefresh={() => openGroupDetail(selectedGroup)}
            onToast={showToast}
          />
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <CreateGroupModal
            currentUserId={user?.uid}
            onClose={() => setShowCreateModal(false)}
            onToast={showToast}
          />
        )}

        {/* Toast */}
        {toast && (
          <div className="toast-container">
            <div className={`toast ${toast.type}`}>{toast.msg}</div>
          </div>
        )}
      </div>
    </Layout>
  );
}

function GroupCard({ group, currentUserId, isFavorite, onOpen, onDelete, onToggleFavorite }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [memberAvatars, setMemberAvatars] = useState([]);
  const containerRef = useRef(null);
  const dark = useDarkMode();
  const color = hashColor(CARD_COLORS, group.name, dark);
  const displayName = group.name ? group.name.charAt(0).toUpperCase() + group.name.slice(1) : group.name;
  const isCreator = group.created_by_user_id === currentUserId;

  useEffect(() => {
    const ids = (group.member_ids || []).slice(0, 4);
    if (!ids.length) return;
    gruposService.getMemberDetails(ids).then(members => {
      setMemberAvatars(members.map(m => ({
        inits: initials(m.name, m.surname),
        color: hashColor(MEMBER_COLORS, m.name || m.id),
      })));
    }).catch(() => {});
  }, [group]);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  return (
    <div
      className="group-card"
      style={{ backgroundColor: color, zIndex: menuOpen ? 100 : 'auto' }}
      onClick={() => onOpen(group)}
    >
      <div className="card-emoji-container">{group.emoji || '👥'}</div>
      <span className="card-group-name" title={displayName}>{displayName}</span>

      <div ref={containerRef} className={`card-menu-container${menuOpen ? ' open' : ''}`} onClick={(e) => e.stopPropagation()}>
        <button
          className="group-card-menu-btn"
          onClick={() => setMenuOpen(v => !v)}
          title="Opciones"
        >
          <i className="bx bx-dots-vertical-rounded" />
        </button>
        {menuOpen && (
          <div className="group-card-submenu active">
            <button
              className="submenu-item icon-only"
              title={isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
              onClick={() => { setMenuOpen(false); onToggleFavorite(group.id); }}
            >
              <i className={`bx ${isFavorite ? 'bxs-star' : 'bx-star'}`} />
            </button>
            {isCreator && (
              <button
                className="submenu-item icon-only delete"
                title="Eliminar grupo"
                onClick={() => { setMenuOpen(false); onDelete(group); }}
              >
                <i className="bx bx-trash" />
              </button>
            )}
          </div>
        )}
      </div>

      {isFavorite && (
        <div className="card-favorite-star">
          <i className="bx bxs-star" />
        </div>
      )}

      <div className="card-members-strip">
        {memberAvatars.map((a, i) => (
          <div key={i} className="card-member-avatar" style={{ backgroundColor: a.color }}>{a.inits}</div>
        ))}
      </div>
    </div>
  );
}

function GroupDetailModal({ group, members, loading, currentUserId, showEditForm, onSetEditForm, onClose, onRefresh, onToast }) {
  const [activeTab, setActiveTab] = useState('info'); // 'info', 'chat', 'events'
  const isAdmin = members.some(m => m.id === currentUserId && m.role === 'admin');
  const isCreator = group.created_by_user_id === currentUserId;
  const dark = useDarkMode();
  const color = hashColor(CARD_COLORS, group.name, dark);
  const [addingMember, setAddingMember] = useState(false);
  const [friends, setFriends] = useState([]);
  const [selectedFriendId, setSelectedFriendId] = useState('');
  const [editData, setEditData] = useState({ name: group.name, description: group.description || '', emoji: group.emoji || '👥' });

  const loadFriends = async () => {
    try {
      const allFriends = await friendsService.getFriends(currentUserId);
      const memberIds = members.map(m => m.id);
      setFriends(allFriends.filter(f => !memberIds.includes(f.uid)));
    } catch {}
  };

  const handleAddMember = async () => {
    if (!selectedFriendId) return;
    try {
      await gruposService.addMemberByUid(group.id, selectedFriendId, currentUserId);
      onToast('Miembro añadido', 'success');
      setAddingMember(false);
      onRefresh();
    } catch (e) {
      onToast(e.message || 'Error al añadir miembro', 'error');
    }
  };

  const handleRemoveMember = async (uid) => {
    if (!confirm('¿Eliminar a este miembro?')) return;
    try {
      await gruposService.removeMember(group.id, uid, currentUserId);
      onToast('Miembro eliminado', 'success');
      onRefresh();
    } catch {
      onToast('Error al eliminar miembro', 'error');
    }
  };

  const handleLeaveGroup = async () => {
    if (!confirm(`¿Salir del grupo "${group.name}"?`)) return;
    try {
      await gruposService.leaveGroup(group.id, currentUserId);
      onToast('Has salido del grupo', 'success');
      onClose();
    } catch (e) {
      onToast(e.message || 'Error al salir del grupo', 'error');
    }
  };

  const handleSaveEdit = async () => {
    if (!editData.name.trim()) { onToast('El nombre no puede estar vacío', 'error'); return; }
    try {
      await gruposService.updateGroup(group.id, { name: editData.name.trim(), description: editData.description, emoji: editData.emoji });
      onToast('Grupo actualizado', 'success');
      onSetEditForm(false);
      onRefresh();
    } catch {
      onToast('Error al actualizar el grupo', 'error');
    }
  };

  return (
    <div className="modal-overlay active" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content">
        <div className="modal-header">
          <span className="modal-title">{group.name}</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            {isAdmin && activeTab === 'info' && !showEditForm && (
              <button className="modal-edit-btn" onClick={() => onSetEditForm(true)} title="Editar grupo">
                <i className="bx bx-pencil" />
              </button>
            )}
            <button className="modal-close-btn" onClick={onClose}><i className="bx bx-x" /></button>
          </div>
        </div>

        <div className="modal-tabs">
          <div className={`modal-tab${activeTab === 'info' ? ' active' : ''}`} onClick={() => setActiveTab('info')}>Info</div>
          <div className={`modal-tab${activeTab === 'chat' ? ' active' : ''}`} onClick={() => setActiveTab('chat')}>Chat</div>
          <div className={`modal-tab${activeTab === 'events' ? ' active' : ''}`} onClick={() => setActiveTab('events')}>Eventos</div>
        </div>

        <div className="modal-body" style={{ paddingTop: 0 }}>
          {activeTab === 'info' && (
            showEditForm ? (
              <div className="edit-group-form">
                <div className="form-group emoji-selection-group">
                  <label>Icono del grupo</label>
                  <div className="emoji-picker">
                    {EMOJIS.map(e => (
                      <span
                        key={e}
                        className={`emoji-option${editData.emoji === e ? ' active' : ''}`}
                        onClick={() => setEditData(d => ({ ...d, emoji: e }))}
                      >{e}</span>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label>Nombre</label>
                  <input className="edit-group-input" value={editData.name} onChange={(e) => setEditData(d => ({ ...d, name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Descripción</label>
                  <textarea className="edit-group-textarea" value={editData.description} onChange={(e) => setEditData(d => ({ ...d, description: e.target.value }))} />
                </div>
                <div className="edit-form-actions">
                  <button className="btn-cancel" onClick={() => onSetEditForm(false)}>Cancelar</button>
                  <button className="btn-save" onClick={handleSaveEdit}>Guardar</button>
                </div>
              </div>
            ) : loading ? (
              <div className="modal-loading"><div className="loading-spinner" /><p>Cargando miembros...</p></div>
            ) : (
              <div>
                <div className="modal-group-header">
                  <div className="modal-group-avatar" style={{ backgroundColor: color }}>{group.emoji || group.name?.substring(0, 2).toUpperCase()}</div>
                  <div className="modal-group-title-area">
                    <h2 className="modal-group-name">{group.name}</h2>
                    <p className="modal-group-desc">{group.description || 'Sin descripción'}</p>
                  </div>
                </div>

                <div className="modal-members-section">
                  <div className="modal-members-header">
                    <h3>Miembros ({members.length})</h3>
                    {isAdmin && (
                      <button className="modal-add-member-btn" onClick={() => { setAddingMember(v => !v); if (!addingMember) loadFriends(); }}>
                        <i className="bx bx-user-plus" /> Añadir
                      </button>
                    )}
                  </div>

                  {isAdmin && addingMember && (
                    <div className="add-member-form" style={{ display: 'flex' }}>
                      <select className="member-code-input" value={selectedFriendId} onChange={(e) => setSelectedFriendId(e.target.value)}>
                        <option value="">Selecciona un amigo</option>
                        {friends.map(f => (
                          <option key={f.uid} value={f.uid}>{f.name} {f.surname} @{f.username}</option>
                        ))}
                      </select>
                      <button className="add-member-submit-btn" onClick={handleAddMember}><i className="bx bx-check" /></button>
                      <button className="add-member-cancel-btn" onClick={() => setAddingMember(false)}><i className="bx bx-x" /></button>
                    </div>
                  )}

                  <ul className="modal-members-list">
                    {members.map(m => {
                      const displayName = m.name ? `${m.name} ${m.surname || ''}`.trim() : m.id;
                      const isMe = m.id === currentUserId;
                      const canRemove = isAdmin && !isMe && m.role !== 'admin';
                      return (
                        <li key={m.id} className="modal-member-item">
                          <div className="member-avatar" style={{ backgroundColor: hashColor(CARD_COLORS, m.name || m.id, dark) }}>{initials(m.name, m.surname)}</div>
                          <div className="member-info">
                            <span className="member-name">{displayName}</span>
                            <span className="member-code">{m.username ? `@${m.username}` : ''}</span>
                          </div>
                          {isMe ? <span className="member-you-badge">Tú</span> : m.role === 'admin' ? <span className="member-role-badge">Admin</span> : null}
                          {canRemove && (
                            <button className="member-remove-btn" onClick={() => handleRemoveMember(m.id)} title="Eliminar del grupo">
                              <i className="bx bx-user-minus" />
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>

                  {!isCreator && (
                    <button className="btn-leave-group" onClick={handleLeaveGroup}>
                      <i className="bx bx-log-out" /> Salir del grupo
                    </button>
                  )}
                </div>
              </div>
            )
          )}

          {activeTab === 'chat' && (
            <GroupChatTab group={group} currentUserId={currentUserId} members={members} onToast={onToast} />
          )}

          {activeTab === 'events' && (
            <GroupEventsTab group={group} currentUserId={currentUserId} onToast={onToast} />
          )}
        </div>
      </div>
    </div>
  );
}

function GroupChatTab({ group, currentUserId, members, onToast }) {
  const [chatId, setChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const scrollRef = useRef(null);
  const { user } = useAuth();

  const EMOJI_LIST = [
    '😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚','😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🤩','🥳','😏','😒','😞','😔','😟','😕','🙁','☹️','😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🤗','🤔','🤭','🤫','🤥','😶','😐','😑','😬','🙄','😯','😦','😧','😮','😲','🥱','😴','🤤','😪','😵','🤐','🥴','🤢','🤮','🤧','😷','🤒','🤕','🤑','🤠','😈','👿','👹','👺','🤡','💩','👻','💀','☠️','👽','👾','🤖','🎃','😺','😸','😹','😻','😼','😽','🙀','😿','😾',
    '👋','🤚','🖐','✋','🖖','👌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦾','🦵','🦿','🦶','👣','👂','🦻','👃','🧠','🦷','🦴','👀','👁','👅','👄'
  ];

  useEffect(() => {
    let active = true;
    const initChat = async () => {
      try {
        const id = await chatService.getOrCreateGroupChat(
          group.id,
          group.name,
          group.member_ids || [],
          user
        );
        if (active) setChatId(id);
      } catch (e) {
        console.error("Error init chat:", e);
        if (active) onToast('Error al conectar con el chat', 'error');
      } finally {
        if (active) setLoading(false);
      }
    };
    initChat();
    return () => { active = false; };
  }, [group.id, group.name, group.member_ids, user, onToast]);

  useEffect(() => {
    if (!chatId) return;
    const unsub = chatService.listenMessages(chatId, (msgs) => {
      setMessages(msgs);
      setTimeout(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }, 100);
    });
    return () => unsub && unsub();
  }, [chatId]);

  const handleSend = async () => {
    if (!inputText.trim()) return;
    if (!chatId) {
      onToast('El chat no está listo', 'error');
      return;
    }
    const text = inputText.trim();
    setInputText('');
    setShowEmojiPicker(false);
    setShowGifPicker(false);
    try {
      const senderName = user.displayName || `${user.name || ''} ${user.surname || ''}`.trim() || 'Usuario';
      const participants = group.member_ids || [];
      await chatService.sendMessage(chatId, text, currentUserId, participants, senderName);
    } catch (e) {
      console.error("Error sending message:", e);
      onToast('Error al enviar mensaje', 'error');
      setInputText(text);
    }
  };

  const handleSendGif = async (gifUrl) => {
    setShowGifPicker(false);
    if (!chatId) {
      onToast('El chat no está listo', 'error');
      return;
    }
    try {
      const senderName = user.displayName || `${user.name || ''} ${user.surname || ''}`.trim() || 'Usuario';
      const participants = group.member_ids || [];
      await chatService.sendGif(chatId, gifUrl, currentUserId, participants, senderName);
    } catch (e) {
      console.error("Error sending GIF:", e);
      onToast('Error al enviar GIF', 'error');
    }
  };

  if (loading) return <div className="modal-loading"><div className="loading-spinner" /></div>;

  return (
    <div className="group-chat-container">
      <div className="group-chat-messages" ref={scrollRef}>
        {messages.map(m => {
          const isMe = m.senderId === currentUserId;
          const sender = members.find(mem => mem.id === m.senderId);
          const senderName = sender ? `${sender.name} ${sender.surname || ''}`.trim() : 'Usuario';
          
          let time = '';
          try {
            if (m.timestamp?.toDate) time = m.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            else if (m.timestamp) time = new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          } catch (e) {}

          return (
            <div key={m.id} className={`chat-msg-row ${isMe ? 'sent' : 'received'}`}>
              {!isMe && <span className="chat-msg-sender">{senderName}</span>}
              <div className={`chat-msg-bubble ${m.messageType === 'gif' ? 'gif-bubble' : ''}`}>
                {m.messageType === 'gif' ? (
                  <img src={m.gifUrl} alt="GIF" className="chat-gif-msg" />
                ) : (
                  m.text
                )}
              </div>
              <span className="chat-msg-time">{time}</span>
            </div>
          );
        })}
        {messages.length === 0 && <p className="empty-state">No hay mensajes aún. ¡Di hola!</p>}
      </div>
      <div className="group-chat-input-area" style={{ position: 'relative' }}>
        
        {showGifPicker && (
          <div style={{ position: 'absolute', bottom: '100%', left: '0', zIndex: 1000, paddingBottom: '10px' }}>
            <GifPicker onSelect={handleSendGif} onClose={() => setShowGifPicker(false)} />
          </div>
        )}
        
        {showEmojiPicker && (
          <div className="emoji-picker-popover" style={{ position: 'absolute', bottom: '100%', left: '10px', background: 'var(--color-bg)', border: '1px solid var(--color-border)', padding: '12px', borderRadius: '12px', zIndex: 1000, display: 'flex', flexWrap: 'wrap', gap: '8px', width: '280px', maxHeight: '200px', overflowY: 'auto', boxShadow: '0 8px 25px rgba(0,0,0,0.15)', marginBottom: '10px' }}>
            {EMOJI_LIST.map((em, idx) => (
              <span key={`${em}-${idx}`} style={{ cursor: 'pointer', fontSize: '22px', transition: 'transform 0.1s', padding: '4px' }} onClick={() => setInputText(prev => prev + em)} className="hover:scale-110">{em}</span>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: '4px' }}>
          <button className="chat-control-btn" type="button" onClick={() => { setShowGifPicker(!showGifPicker); setShowEmojiPicker(false); }} title="GIF">
            <i className="bx bx-image" style={{ fontSize: '22px' }} />
          </button>
          <button className="chat-control-btn" type="button" onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowGifPicker(false); }} title="Emoji">
            <i className="bx bx-smile" style={{ fontSize: '22px' }} />
          </button>
        </div>

        <input
          className="group-chat-input"
          placeholder="Escribe un mensaje..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <button className="group-chat-send-btn" onClick={handleSend} title="Enviar"><i className="bx bxs-send" /></button>
      </div>
    </div>
  );
}

function GroupEventsTab({ group, currentUserId, onToast }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', start: '', end: '' });
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = listenGroupEvents(group.id, currentUserId, (evs) => {
      setEvents(evs);
      setLoading(false);
    });
    return () => unsub && unsub();
  }, [group.id, currentUserId]);

  const handleAddEvent = async () => {
    if (!newEvent.title || !newEvent.start || !newEvent.end) {
      onToast('Completa todos los campos', 'error');
      return;
    }
    try {
      await addEvent({
        ...newEvent,
        groupIds: [group.id],
        eventType: 'group_event'
      });
      onToast('Evento añadido', 'success');
      setShowAddForm(false);
      setNewEvent({ title: '', start: '', end: '' });
    } catch (e) {
      console.error("Error adding event:", e);
      onToast('Error al añadir evento', 'error');
    }
  };

  const goToCalendar = () => {
    if (confirm('¿Quieres ir al calendario completo para gestionar eventos?')) {
      window.location.href = '/calendar';
    }
  };

  if (loading) return <div className="modal-loading"><div className="loading-spinner" /></div>;

  return (
    <div className="group-events-container">
      {events.length === 0 && !showAddForm ? (
        <div className="empty-state" style={{ padding: '20px 10px' }}>
          <i className="bx bx-calendar-x" style={{ fontSize: '48px' }} />
          <p>No hay eventos para este grupo.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', marginTop: '10px' }}>
            <button className="btn-save" onClick={() => setShowAddForm(true)}>
              Crear el primer evento
            </button>
            <button className="btn-cancel" onClick={goToCalendar} style={{ background: 'transparent', border: '1px solid var(--color-border)' }}>
              Ir al Calendario
            </button>
          </div>
        </div>
      ) : !showAddForm ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button className="btn-add-event" onClick={() => setShowAddForm(true)}>
            <i className="bx bx-plus" /> Añadir evento rápido
          </button>
          <button className="btn-add-event" onClick={goToCalendar} style={{ borderStyle: 'solid', background: 'var(--color-surface)' }}>
            <i className="bx bx-calendar" /> Abrir Calendario completo
          </button>
        </div>
      ) : (
        <div className="edit-group-form" style={{ marginBottom: '20px', padding: '15px', background: 'var(--color-surface)', borderRadius: '12px' }}>
          <div className="form-group">
            <label>Título del evento</label>
            <input className="form-input" value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} placeholder="Reunión, Fiesta..." />
          </div>
          <div className="form-group">
            <label>Inicio</label>
            <input type="datetime-local" className="form-input" value={newEvent.start} onChange={e => setNewEvent({...newEvent, start: e.target.value})} />
          </div>
          <div className="form-group">
            <label>Fin</label>
            <input type="datetime-local" className="form-input" value={newEvent.end} onChange={e => setNewEvent({...newEvent, end: e.target.value})} />
          </div>
          <div className="edit-form-actions">
            <button className="btn-cancel" onClick={() => setShowAddForm(false)}>Cancelar</button>
            <button className="btn-save" onClick={handleAddEvent}>Confirmar</button>
          </div>
        </div>
      )}

      <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {events.map(ev => {
          let startDate = null;
          try {
            if (ev.start?.toDate) startDate = ev.start.toDate();
            else if (ev.start) startDate = new Date(ev.start);
          } catch (e) {}

          if (!startDate || isNaN(startDate.getTime())) return null;

          const day = startDate.getDate();
          const month = startDate.toLocaleString('es-ES', { month: 'short' });
          const time = startDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

          return (
            <div 
              key={ev.id} 
              className="group-event-item clickable" 
              onClick={() => navigate(`/calendar?eventId=${ev.id}`)}
              style={{ cursor: 'pointer' }}
              title="Click para ver en el calendario"
            >
              <div className="event-date-box">
                <span className="event-day">{day}</span>
                <span className="event-month">{month}</span>
              </div>
              <div className="event-info">
                <div className="event-title">{ev.title}</div>
                <div className="event-time">{time}</div>
              </div>
              <i className="bx bx-calendar-edit" style={{ fontSize: '20px', color: 'var(--color-accent)' }} />
            </div>
          );
        })}
      </div>
    </div>
  );
}



function CreateGroupModal({ currentUserId, onClose, onToast }) {
  const [selectedEmoji, setSelectedEmoji] = useState('👥');
  const [name, setName] = useState('');
  const [friends, setFriends] = useState([]);
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    friendsService.getFriends(currentUserId).then(setFriends).catch(() => {});
  }, [currentUserId]);

  const removeFriend = (uid) => setSelectedFriends(sf => sf.filter(f => f.uid !== uid));

  const handleCreate = async () => {
    if (!name.trim()) { onToast('El nombre es obligatorio', 'error'); return; }
    setLoading(true);
    try {
      await gruposService.createGroup(name.trim(), '', currentUserId, selectedEmoji, selectedFriends.map(f => f.uid));
      onToast('Grupo creado', 'success');
      onClose();
    } catch {
      onToast('Error al crear el grupo', 'error');
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay active" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content create-modal">
        <div className="modal-header">
          <span className="modal-title">Nuevo grupo</span>
          <button className="modal-close-btn" onClick={onClose}><i className="bx bx-x" /></button>
        </div>
        <div className="create-modal-body">

          <div className="create-top-row">
            <div className="create-emoji-preview">{selectedEmoji}</div>
            <input
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre del grupo *"
            />
          </div>

          <div className="create-emoji-grid">
            {EMOJIS.map(e => (
              <span
                key={e}
                className={`emoji-option${selectedEmoji === e ? ' active' : ''}`}
                onClick={() => setSelectedEmoji(e)}
              >{e}</span>
            ))}
          </div>

          <select
            className="form-input"
            value=""
            onChange={(e) => {
              const uid = e.target.value;
              if (!uid) return;
              if (selectedFriends.some(f => f.uid === uid)) { onToast('Ya está añadido', 'error'); return; }
              const f = friends.find(f => f.uid === uid);
              if (f) setSelectedFriends(sf => [...sf, f]);
            }}
          >
            <option value="" disabled hidden>Añadir amigo...</option>
            {friends.filter(f => !selectedFriends.some(sf => sf.uid === f.uid)).map(f => (
              <option key={f.uid} value={f.uid}>{f.name} {f.surname}</option>
            ))}
          </select>

          {selectedFriends.length > 0 && (
            <div className="selected-friends-list">
              {selectedFriends.map(f => (
                <div key={f.uid} className="selected-friend-tag">
                  <span>{f.name} {f.surname}</span>
                  <i className="bx bx-x remove-friend" onClick={() => removeFriend(f.uid)} />
                </div>
              ))}
            </div>
          )}

          <div className="create-modal-actions">
            <button className="btn-cancel" onClick={onClose}>Cancelar</button>
            <button className="btn-save create-btn-full" onClick={handleCreate} disabled={loading}>
              {loading ? 'Creando...' : 'Crear grupo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
