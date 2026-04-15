import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { gruposService } from '../services/gruposService.js';
import { friendsService } from '../services/friendsService.js';
import Layout from '../components/Layout.jsx';
import '../components/grupos/grupos.css';

const ITEMS_PER_PAGE = 11;
const CARD_COLORS = ['#fce4e4','#dce8f8','#d8f0d8','#fddcb0','#f8d8f0','#e8e0f8','#fef3cc','#d8f0f0'];
const MEMBER_COLORS = ['#4f46e5','#0284c7','#059669','#d97706','#7c3aed','#db2777','#0891b2','#0056FF'];
const EMOJIS = ['👥','🏠','🎓','🏀','🍕','✈️','🎮','💡','🎉','💼','❤️','🌟','🔥','📚','🎨','🎬','🎸','🌈','🐶','🐱','🍎','🍺','⚽','🚗','📱','💻','🔒','🛠️','🌍','🚀'];

function hashColor(arr, str) {
  if (!str) return arr[0];
  let h = 0;
  for (const c of str) h = ((h << 5) - h) + c.charCodeAt(0);
  return arr[Math.abs(h) % arr.length];
}

function initials(name, surname) {
  const n = (name || '').trim();
  const s = (surname || '').trim();
  if (n && s) return (n[0] + s[0]).toUpperCase();
  if (n) return n.substring(0, 2).toUpperCase();
  return '?';
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
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const page = Math.min(currentPage, Math.max(totalPages, 1));
  const pageItems = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  return (
    <Layout contentClass="groups-wrapper">
      <div className="universal-page-header">
        <div className="header-left-zone">
          <select
            className="filters-select"
            style={{ height: '40px', padding: '0 10px', borderRadius: '10px', border: '1px solid #ccc', outline: 'none', background: '#fff', fontSize: '14px', colorScheme: 'light' }}
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
        <div className="groups-container">
        <div className="groups-grid" id="groupsGrid">
          {/* Add card */}
          <div className="group-card add-card" onClick={() => setShowCreateModal(true)}>
            <div className="add-card-placeholder"><i className="bx bx-plus" /></div>
            <span className="add-card-label">Nuevo grupo</span>
          </div>

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
  const color = hashColor(CARD_COLORS, group.name);
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
  const isAdmin = members.some(m => m.id === currentUserId && m.role === 'admin');
  const isCreator = group.created_by_user_id === currentUserId;
  const color = hashColor(CARD_COLORS, group.name);
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
          <button className="modal-close-btn" onClick={onClose}><i className="bx bx-x" /></button>
        </div>
        <div className="modal-body">
          {showEditForm ? (
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
                {isAdmin && (
                  <button className="modal-edit-btn" onClick={() => onSetEditForm(true)} title="Editar grupo">
                    <i className="bx bx-pencil" />
                  </button>
                )}
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
                        <div className="member-avatar" style={{ backgroundColor: hashColor(CARD_COLORS, m.name || m.id) }}>{initials(m.name, m.surname)}</div>
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
          )}
        </div>
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
