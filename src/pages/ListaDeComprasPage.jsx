import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { shoppingService } from '../services/shoppingService.js';
import { Picker } from 'emoji-mart';
import Layout from '../components/Layout.jsx';
import '../components/lista_de_compras/lista_de_compras.css';

const ICON_MAP = {
  'leche': 'milk', 'pan': 'bread', 'huevo': 'eggs', 'queso': 'cheese',
  'jamon': 'ham', 'pera': 'pear', 'manzana': 'apple', 'platano': 'banana',
  'carne': 'steak', 'pollo': 'poultry-leg', 'pescado': 'fish', 'arroz': 'rice',
  'pasta': 'spaghetti', 'yogur': 'yogurt', 'aceite': 'olive-oil',
  'cervez': 'beer', 'vino': 'wine', 'cafe': 'coffee', 'tarta': 'pie',
};

function getProductIcon(name) {
  const lower = (name || '').toLowerCase();
  for (const [key, icon] of Object.entries(ICON_MAP)) {
    if (lower.includes(key)) return { url: `https://img.icons8.com/fluency/96/${icon}.png`, isFallback: false };
  }
  return { url: 'https://img.icons8.com/fluency/96/shopping-basket.png', isFallback: true };
}

export default function ListaDeComprasPage() {
  const { user } = useAuth();
  const [mode, setMode] = useState('lists'); // 'lists' | 'notes'
  const [data, setData] = useState({ lists: {}, notes: {} });
  const [selectedListId, setSelectedListId] = useState(null);
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [saveStatus, setSaveStatus] = useState(''); // '' | 'saving' | 'saved'
  const saveTimeoutRef = useRef(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerPos, setPickerPos] = useState({ top: 0, left: 0 });
  const [pickerTargetIdx, setPickerTargetIdx] = useState(null);
  const [search, setSearch] = useState('');
  const [editingListNameId, setEditingListNameId] = useState(null);
  const [editingNoteNameId, setEditingNoteNameId] = useState(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const lists = await shoppingService.getUserLists(user.uid);
      const notes = await shoppingService.getUserNotes(user.uid);
      let firstList = Object.keys(lists)[0] || null;
      let newData = { lists, notes };
      if (!firstList) {
        const tempId = 'list-new-' + Date.now();
        newData.lists[tempId] = {
          name: 'Lista de la compra',
          description: 'Qué hay que comprar',
          color_tag: '#f28c18',
          is_shared: false,
          shared_with: [],
          items: [
            { name: 'Tomate', quantity: 2, unit: 'uds.', is_purchased: false },
            { name: 'Leche', quantity: 1, unit: 'uds.', is_purchased: false },
          ],
        };
        firstList = tempId;
      }
      setData(newData);
      setSelectedListId(firstList);
      setSelectedNoteId(Object.keys(notes)[0] || null);
    })();
  }, [user]);

  const triggerAutoSave = useCallback((newData, listId, noteId, currentMode) => {
    if (!user) return;
    clearTimeout(saveTimeoutRef.current);
    setSaveStatus('saving');
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        if (currentMode === 'lists' && listId && newData.lists[listId]) {
          const savedId = await shoppingService.saveList(user.uid, listId, newData.lists[listId]);
          if (savedId !== listId) {
            setData(d => {
              const updated = { ...d.lists };
              updated[savedId] = updated[listId];
              delete updated[listId];
              return { ...d, lists: updated };
            });
            setSelectedListId(savedId);
          }
        } else if (currentMode === 'notes' && noteId && newData.notes[noteId]) {
          const savedId = await shoppingService.saveNote(user.uid, noteId, newData.notes[noteId]);
          if (savedId !== noteId) {
            setData(d => {
              const updated = { ...d.notes };
              updated[savedId] = updated[noteId];
              delete updated[noteId];
              return { ...d, notes: updated };
            });
            setSelectedNoteId(savedId);
          }
        }
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus(''), 2000);
      } catch {
        setSaveStatus('error');
      }
    }, 1500);
  }, [user]);

  const updateList = (id, updater) => {
    setData(d => {
      const newData = { ...d, lists: { ...d.lists, [id]: { ...d.lists[id], ...updater(d.lists[id]) } } };
      triggerAutoSave(newData, id, selectedNoteId, 'lists');
      return newData;
    });
  };

  const updateNote = (id, updater) => {
    setData(d => {
      const newData = { ...d, notes: { ...d.notes, [id]: { ...d.notes[id], ...updater(d.notes[id]) } } };
      triggerAutoSave(newData, selectedListId, id, 'notes');
      return newData;
    });
  };

  const handleEmojiSelect = useCallback((emojiData) => {
    if (pickerTargetIdx !== null && selectedListId) {
      setData(d => {
        const newItems = [...(d.lists[selectedListId]?.items || [])];
        if (newItems[pickerTargetIdx]) newItems[pickerTargetIdx] = { ...newItems[pickerTargetIdx], emoji: emojiData.native };
        const newData = { ...d, lists: { ...d.lists, [selectedListId]: { ...d.lists[selectedListId], items: newItems } } };
        triggerAutoSave(newData, selectedListId, selectedNoteId, 'lists');
        return newData;
      });
      setPickerOpen(false);
    }
  }, [pickerTargetIdx, selectedListId, selectedNoteId, triggerAutoSave]);

  const currentList = selectedListId ? data.lists[selectedListId] : null;
  const currentNote = selectedNoteId ? data.notes[selectedNoteId] : null;

  const term = search.toLowerCase().trim();
  const filteredListIds = Object.keys(data.lists).filter(id => 
    data.lists[id].name.toLowerCase().includes(term) || 
    (data.lists[id].description || '').toLowerCase().includes(term)
  );
  const filteredNoteIds = Object.keys(data.notes).filter(id => 
    data.notes[id].title.toLowerCase().includes(term)
  );

  return (
    <Layout>
      <div className="shopping-page-wrapper">
        <aside className="shopping-lists-sidebar">
          <div className="sidebar-tabs">
            <button className={`tab-btn${mode === 'lists' ? ' active' : ''}`} onClick={() => setMode('lists')}>Listas</button>
            <button className={`tab-btn${mode === 'notes' ? ' active' : ''}`} onClick={() => setMode('notes')}>Notas</button>
          </div>

          <div style={{ padding: '15px' }}>
            <div style={{ position: 'relative' }}>
              <i className="bx bx-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
              <input
                type="text"
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: '100%', padding: '10px 10px 10px 35px', borderRadius: '10px', border: '1px solid #ccc', outline: 'none', fontSize: '14px', boxSizing: 'border-box', backgroundColor: '#ffffff' }}
              />
            </div>
          </div>

          <div className="sidebar-scroll-container">
            {mode === 'lists' && (
              <>
                <div id="sidebar-lists-container">
                  {filteredListIds.map(id => (
                    <div
                      key={id}
                      className={`lists-header${id === selectedListId ? ' active-list' : ''}`}
                      onClick={() => setSelectedListId(id)}
                    >
                      <div className="list-color" style={{ background: data.lists[id].color_tag || '#f28c18' }} />
                      <div className="list-meta">
                        {editingListNameId === id ? (
                          <input
                            className="sidebar-name-input"
                            defaultValue={data.lists[id].name}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                            onBlur={(e) => {
                              const val = e.target.value.trim() || 'Nueva Lista';
                              updateList(id, l => ({ ...l, name: val }));
                              setEditingListNameId(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') e.target.blur();
                              if (e.key === 'Escape') { setEditingListNameId(null); }
                            }}
                          />
                        ) : (
                          <h2 onClick={(e) => { e.stopPropagation(); setSelectedListId(id); setEditingListNameId(id); }}>
                            {data.lists[id].name}
                          </h2>
                        )}
                        {data.lists[id].description && <small>{data.lists[id].description}</small>}
                      </div>
                      <div className="list-actions">
                        <i className="bx bx-trash" onClick={(e) => {
                          e.stopPropagation();
                          if (!confirm('¿Eliminar lista?')) return;
                          shoppingService.deleteList(id, user.uid);
                          setData(d => {
                            const lists = { ...d.lists };
                            delete lists[id];
                            return { ...d, lists };
                          });
                          if (selectedListId === id) setSelectedListId(Object.keys(data.lists).find(k => k !== id) || null);
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
                <button className="add-btn" onClick={() => {
                  const id = 'list-' + Date.now();
                  setData(d => ({ ...d, lists: { ...d.lists, [id]: { name: 'Nueva Lista', description: '', color_tag: '#f28c18', items: [], is_shared: false } } }));
                  setSelectedListId(id);
                }}>+ Nueva lista</button>
              </>
            )}

            {mode === 'notes' && (
              <>
                <div id="sidebar-notes-container">
                  {filteredNoteIds.map(id => (
                    <div
                      key={id}
                      className={`lists-header${id === selectedNoteId ? ' active-list' : ''}`}
                      onClick={() => setSelectedNoteId(id)}
                    >
                      {editingNoteNameId === id ? (
                        <input
                          className="sidebar-name-input"
                          defaultValue={data.notes[id].title || ''}
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                          onBlur={(e) => {
                            const val = e.target.value.trim() || 'Nueva Nota';
                            updateNote(id, n => ({ ...n, title: val }));
                            setEditingNoteNameId(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') e.target.blur();
                            if (e.key === 'Escape') { setEditingNoteNameId(null); }
                          }}
                        />
                      ) : (
                        <h2 onClick={(e) => { e.stopPropagation(); setSelectedNoteId(id); setEditingNoteNameId(id); }}>
                          {data.notes[id].title || 'Nota sin título'}
                        </h2>
                      )}
                      <i className="bx bx-trash" onClick={(e) => {
                        e.stopPropagation();
                        if (!confirm('¿Eliminar nota?')) return;
                        shoppingService.deleteNote(id, user.uid);
                        setData(d => {
                          const notes = { ...d.notes };
                          delete notes[id];
                          return { ...d, notes };
                        });
                        if (selectedNoteId === id) setSelectedNoteId(Object.keys(data.notes).find(k => k !== id) || null);
                      }} />
                    </div>
                  ))}
                </div>
                <button className="add-btn" onClick={() => {
                  const id = 'note-' + Date.now();
                  setData(d => ({ ...d, notes: { ...d.notes, [id]: { title: 'Nueva Nota', content: '', color_tag: '#f28c18' } } }));
                  setSelectedNoteId(id);
                }}>+ Nueva nota</button>
              </>
            )}
          </div>
        </aside>

        <main className="shopping-main-content">
          {saveStatus && (
            <div id="save-status" className="save-status visible">
              {saveStatus === 'saving' && <><div className="spinner" />  <span>Guardando...</span></>}
              {saveStatus === 'saved' && <span>Guardado</span>}
              {saveStatus === 'error' && <span>Error al guardar</span>}
            </div>
          )}

          {mode === 'lists' && currentList && (
            <div id="products-list" style={{ display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '600px' }}>
              {currentList.items.map((item, idx) => (
                <ProductCard
                  key={idx}
                  item={item}
                  index={idx}
                  onCheck={() => updateList(selectedListId, l => ({ ...l, items: l.items.map((it, i) => i === idx ? { ...it, is_purchased: !it.is_purchased } : it) }))}
                  onDelete={() => updateList(selectedListId, l => ({ ...l, items: l.items.filter((_, i) => i !== idx) }))}
                  onNameChange={(name) => updateList(selectedListId, l => ({ ...l, items: l.items.map((it, i) => i === idx ? { ...it, name } : it) }))}
                  onQtyChange={(quantity) => updateList(selectedListId, l => ({ ...l, items: l.items.map((it, i) => i === idx ? { ...it, quantity } : it) }))}
                  onOpenPicker={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    let top = rect.bottom + 5;
                    let left = rect.left;
                    if (left + 350 > window.innerWidth) left = window.innerWidth - 360;
                    if (top + 430 > window.innerHeight) top = rect.top - 440;
                    setPickerPos({ top, left });
                    setPickerTargetIdx(idx);
                    setPickerOpen(true);
                  }}
                />
              ))}
              <button className="add-product-btn" onClick={() => {
                updateList(selectedListId, l => ({ ...l, items: [...l.items, { name: '', quantity: 1, unit: 'uds.', is_purchased: false }] }));
              }}>+ Añadir producto</button>
            </div>
          )}

          {mode === 'notes' && (
            <div id="notes-list" style={{ display: currentNote ? 'block' : 'none', width: '100%', maxWidth: '700px' }}>
              {currentNote && (
                <div className="notes-container">
                  <div className="note-paper">
                    <div className="note-header">
                      <i className="bx bx-pencil pencil-icon" />
                      <input
                        className="note-title-field"
                        value={currentNote.title || ''}
                        onChange={(e) => updateNote(selectedNoteId, n => ({ ...n, title: e.target.value }))}
                        placeholder="Título de la nota"
                      />
                    </div>
                    <textarea
                      className="note-content-field"
                      value={currentNote.content || ''}
                      onChange={(e) => updateNote(selectedNoteId, n => ({ ...n, content: e.target.value }))}
                      placeholder="Escribe tu nota aquí..."
                    />
                    <div className="note-footer">Uni2Go Notes</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {pickerOpen && (
        <div
          id="emoji-picker-container"
          style={{ position: 'fixed', zIndex: 2000, top: pickerPos.top, left: pickerPos.left }}
          onClick={(e) => e.stopPropagation()}
        >
          <EmojiPickerWrapper onSelect={handleEmojiSelect} onClose={() => setPickerOpen(false)} />
        </div>
      )}
    </Layout>
  );
}

function EmojiPickerWrapper({ onSelect, onClose }) {
  const containerRef = useRef(null);
  useEffect(() => {
    if (!containerRef.current) return;
    const picker = new Picker({
      parent: containerRef.current,
      categories: ['foods', 'objects', 'symbols'],
      onEmojiSelect: onSelect,
      onClickOutside: onClose,
    });
    return () => { if (containerRef.current) containerRef.current.innerHTML = ''; };
  }, [onSelect, onClose]);
  return <div ref={containerRef} />;
}

function ProductCard({ item, index, onCheck, onDelete, onNameChange, onQtyChange, onOpenPicker }) {
  const [editingName, setEditingName] = useState(false);
  const [editingQty, setEditingQty] = useState(false);
  const [nameVal, setNameVal] = useState(item.name);
  const [qtyVal, setQtyVal] = useState(item.quantity);
  const iconData = getProductIcon(item.name);

  useEffect(() => { setNameVal(item.name); setQtyVal(item.quantity); }, [item]);

  return (
    <div className={`product-card${item.is_purchased ? ' purchased' : ''}`} data-index={index}>
      <div className="product-img-container" title="Cambiar icono/emoji" onDoubleClick={onOpenPicker}>
        {item.emoji
          ? <span className="product-emoji">{item.emoji}</span>
          : <img src={iconData.url} className="product-img" alt="Product" />}
      </div>
      <div className="product-info">
        {editingName ? (
          <input
            className="edit-product-input"
            value={nameVal}
            autoFocus
            onChange={(e) => setNameVal(e.target.value)}
            onBlur={() => { onNameChange(nameVal || 'Nuevo producto'); setEditingName(false); }}
            onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
          />
        ) : (
          <span className="product-name" onClick={() => { setNameVal(item.name); setEditingName(true); }}>
            {item.name || 'Nuevo producto'}
          </span>
        )}
      </div>
      <div className="product-qty-container">
        {editingQty ? (
          <input
            type="number"
            className="edit-qty-input"
            value={qtyVal}
            autoFocus
            onChange={(e) => setQtyVal(e.target.value)}
            onBlur={() => { onQtyChange(parseInt(qtyVal) || 1); setEditingQty(false); }}
            onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
          />
        ) : (
          <span className="product-qty" onClick={() => { setQtyVal(item.quantity); setEditingQty(true); }}>
            {item.quantity} {item.unit || ''}
          </span>
        )}
      </div>
      <div className="product-actions">
        <i className="bx bx-trash delete-btn" onClick={onDelete} />
        <i className={`bx ${item.is_purchased ? 'bx-check-circle' : 'bx-circle'} check-btn`} onClick={onCheck} />
      </div>
    </div>
  );
}
