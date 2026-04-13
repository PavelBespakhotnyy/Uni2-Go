import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { gruposService } from '../services/gruposService.js';
import { friendsService } from '../services/friendsService.js';
import Layout from '../components/Layout.jsx';
import '../components/grupos/grupos.css';

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

  useEffect(() => {
    if (!user) return;
    const unsub = gruposService.listenMyGroups(user.uid, setGroups);
    return () => unsub && unsub();
  }, [user]);

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
      await gruposService.deleteGroup(group.id);
      showToast('Grupo eliminado', 'success');
    } catch {
      showToast('Error al eliminar el grupo', 'error');
    }
  };

  const filtered = groups.filter(g => g.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <Layout contentClass="groups-wrapper">
      <div className="universal-page-header">
        <div className="header-left-zone" />
        <div className="header-center-zone">
          <div className="header-search-container">
            <i className="bx bx-search" />
            <input
              id="groupSearch"
              className="header-search-input"
              type="text"
              placeholder="Buscar grupos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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

          {filtered.length === 0 && search && (
            <div className="empty-state"><i className="bx bx-search-alt" /><p>No se encontraron grupos</p></div>
          )}
          {filtered.length === 0 && !search && (
            <div className="empty-state"><i className="bx bx-group" /><p>¡Aún no tienes grupos. Crea el primero!</p></div>
          )}

          {filtered.map(group => (
            <GroupCard
              key={group.id}
              group={group}
              currentUserId={user?.uid}
              onOpen={openGroupDetail}
              onDelete={handleDelete}
            />
          ))}
        </div>
        </div>

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

function GroupCard({ group, currentUserId, onOpen, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [memberAvatars, setMemberAvatars] = useState([]);
  const color = hashColor(CARD_COLORS, group.name);
  const displayName = group.name ? group.name.charAt(0).toUpperCase() + group.name.slice(1) : group.name;

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

  return (
    <div className="group-card" style={{ backgroundColor: color }} onClick={() => onOpen(group)}>
      <div className="card-emoji-container">{group.emoji || '👥'}</div>
      <span className="card-group-name" title={displayName}>{displayName}</span>
      <button
        className="group-card-menu-btn"
        onClick={(e) => { e.stopPropagation(); setMenuOpen(v => !v); }}
        title="Opciones"
      >
        <i className="bx bx-dots-vertical-rounded" />
      </button>
      <div className="card-members-strip">
        {memberAvatars.map((a, i) => (
          <div key={i} className="card-member-avatar" style={{ backgroundColor: a.color }}>{a.inits}</div>
        ))}
      </div>
      {menuOpen && (
        <div className="group-card-submenu active">
          <button
            className="submenu-item delete"
            onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete(group); }}
          >
            <i className="bx bx-trash" /> Eliminar grupo
          </button>
        </div>
      )}
    </div>
  );
}

function GroupDetailModal({ group, members, loading, currentUserId, showEditForm, onSetEditForm, onClose, onRefresh, onToast }) {
  const isAdmin = members.some(m => m.id === currentUserId && m.role === 'admin');
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
      await gruposService.removeMember(group.id, uid);
      onToast('Miembro eliminado', 'success');
      onRefresh();
    } catch {
      onToast('Error al eliminar miembro', 'error');
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
  const [desc, setDesc] = useState('');
  const [friends, setFriends] = useState([]);
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [friendSelectId, setFriendSelectId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    friendsService.getFriends(currentUserId).then(setFriends).catch(() => {});
  }, [currentUserId]);

  const addFriend = () => {
    if (!friendSelectId) return;
    if (selectedFriends.some(f => f.uid === friendSelectId)) { onToast('Ya está añadido', 'error'); return; }
    const f = friends.find(f => f.uid === friendSelectId);
    if (f) { setSelectedFriends(sf => [...sf, f]); setFriendSelectId(''); }
  };

  const removeFriend = (uid) => setSelectedFriends(sf => sf.filter(f => f.uid !== uid));

  const handleCreate = async () => {
    if (!name.trim()) { onToast('El nombre es obligatorio', 'error'); return; }
    setLoading(true);
    try {
      await gruposService.createGroup(name.trim(), desc.trim(), currentUserId, selectedEmoji, selectedFriends.map(f => f.uid));
      onToast('Grupo creado', 'success');
      onClose();
    } catch {
      onToast('Error al crear el grupo', 'error');
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay active" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content">
        <div className="modal-header">
          <span className="modal-title">Nuevo grupo</span>
          <button className="modal-close-btn" onClick={onClose}><i className="bx bx-x" /></button>
        </div>
        <div className="modal-body">
          <div className="create-group-form">
            <div className="form-group emoji-selection-group">
              <label>Icono del grupo</label>
              <div className="emoji-picker">
                {EMOJIS.map(e => (
                  <span key={e} className={`emoji-option${selectedEmoji === e ? ' active' : ''}`} onClick={() => setSelectedEmoji(e)}>{e}</span>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label>Nombre del grupo *</label>
              <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Compañeros de piso" />
            </div>
            <div className="form-group">
              <label>Descripción</label>
              <textarea className="form-textarea" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Descripción opcional..." />
            </div>
            <div className="form-group">
              <label>Añadir amigos</label>
              <div className="friend-selector-container">
                <select className="form-input" value={friendSelectId} onChange={(e) => setFriendSelectId(e.target.value)}>
                  <option value="">Selecciona un amigo</option>
                  {friends.map(f => <option key={f.uid} value={f.uid}>{f.name} {f.surname}</option>)}
                </select>
                <button type="button" className="btn-add-friend" onClick={addFriend}><i className="bx bx-plus" /></button>
              </div>
              <div className="selected-friends-list">
                {selectedFriends.map(f => (
                  <div key={f.uid} className="selected-friend-tag">
                    <span>{f.name} {f.surname}</span>
                    <i className="bx bx-x remove-friend" onClick={() => removeFriend(f.uid)} />
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={onClose}>Cancelar</button>
              <button className="btn-save" onClick={handleCreate} disabled={loading}>
                {loading ? 'Creando...' : 'Crear grupo'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
