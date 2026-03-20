// src/scripts/createAllCollections.js
import dotenv from 'dotenv';
dotenv.config();
import { db } from '../firebase/firebase.js';
import { 
  doc, 
  setDoc, 
  Timestamp,
  collection
} from 'firebase/firestore';

async function createAllCollections() {
  console.log('========================================');
  console.log('🚀 СОЗДАНИЕ ВСЕХ КОЛЛЕКЦИЙ FIRESTORE');
  console.log('========================================');
  console.log('📁 Проект:', db.app.options.projectId);
  console.log('');

  const testUserId = 'test-user-' + Date.now();
  const results = [];

  try {
    // ============================================
    // 5. КОЛЛЕКЦИЯ: user_profiles
    // ============================================
    console.log('📁 5. Создание коллекции: user_profiles');
    
    await setDoc(doc(db, 'user_profiles', testUserId), {
      user_id: testUserId,
      bio: 'Тестовый пользователь для разработки',
      location: 'Москва, Россия',
      website: 'https://uni2go.com',
      image_url: 'https://via.placeholder.com/150',
      thumbnail_url: 'https://via.placeholder.com/50',
      last_profile_update: Timestamp.now()
    });
    
    console.log('   ✅ user_profiles создан');
    results.push('user_profiles');
    
    // ============================================
    // 6. КОЛЛЕКЦИЯ: categories
    // ============================================
    console.log('\n📁 6. Создание коллекции: categories');
    
    const categories = [
      {
        name: 'Друзья',
        description: 'Близкие друзья',
        color_code: '#FF5733',
        icon_name: 'users',
        is_custom: false,
        created_by_user_id: null,
        created_at: Timestamp.now()
      },
      {
        name: 'Семья',
        description: 'Родственники',
        color_code: '#33FF57',
        icon_name: 'home',
        is_custom: false,
        created_by_user_id: null,
        created_at: Timestamp.now()
      },
      {
        name: 'Коллеги',
        description: 'Работа и учеба',
        color_code: '#3357FF',
        icon_name: 'briefcase',
        is_custom: false,
        created_by_user_id: null,
        created_at: Timestamp.now()
      }
    ];

    for (let i = 0; i < categories.length; i++) {
      await setDoc(doc(db, 'categories', `category-${i+1}`), categories[i]);
      console.log(`   ✅ categories: ${categories[i].name} создан`);
    }
    results.push('categories');

    // ============================================
    // 7. КОЛЛЕКЦИЯ: contacts
    // ============================================
    console.log('\n📁 7. Создание коллекции: contacts');
    
    const contactUserId = 'test-contact-user-' + Date.now();
    
    await setDoc(doc(db, 'contacts', 'contact-1'), {
      user_id: testUserId,
      contact_user_id: contactUserId,
      category_ids: ['category-1', 'category-2'],
      notes: 'Лучший друг',
      is_favorite: true,
      created_at: Timestamp.now(),
      updated_at: Timestamp.now()
    });
    
    console.log('   ✅ contacts создан');
    results.push('contacts');

    // ============================================
    // 8. КОЛЛЕКЦИЯ: interest_groups
    // ============================================
    console.log('\n📁 8. Создание коллекции: interest_groups');
    
    await setDoc(doc(db, 'interest_groups', 'group-1'), {
      name: 'Разработчики Uni2Go',
      description: 'Группа для разработки приложения',
      cover_image_url: 'https://via.placeholder.com/800x200',
      is_private: false,
      created_by_user_id: testUserId,
      created_at: Timestamp.now()
    });
    
    console.log('   ✅ interest_groups создан');
    results.push('interest_groups');

    // ============================================
    // 9. ПОДКОЛЛЕКЦИЯ: interest_groups/{id}/members
    // ============================================
    console.log('\n📁 9. Создание подколлекции: interest_groups/group-1/members');
    
    await setDoc(doc(db, 'interest_groups', 'group-1', 'members', testUserId), {
      user_id: testUserId,
      role: 'admin',
      joined_at: Timestamp.now()
    });
    
    await setDoc(doc(db, 'interest_groups', 'group-1', 'members', contactUserId), {
      user_id: contactUserId,
      role: 'member',
      joined_at: Timestamp.now()
    });
    
    console.log('   ✅ members (2 участника) созданы');
    results.push('interest_groups_members');

    // ============================================
    // 10. КОЛЛЕКЦИЯ: folders
    // ============================================
    console.log('\n📁 10. Создание коллекции: folders');
    
    await setDoc(doc(db, 'folders', 'folder-1'), {
      name: 'Учеба',
      description: 'События связанные с учебой',
      color: '#3498db',
      user_id: testUserId,
      parent_folder_id: null,
      created_at: Timestamp.now()
    });
    
    await setDoc(doc(db, 'folders', 'folder-2'), {
      name: 'Работа',
      description: 'Рабочие встречи',
      color: '#FF5733',
      user_id: testUserId,
      parent_folder_id: null,
      created_at: Timestamp.now()
    });
    
    console.log('   ✅ folders (2 папки) созданы');
    results.push('folders');

    // ============================================
    // 11. КОЛЛЕКЦИЯ: shopping_lists
    // ============================================
    console.log('\n📁 11. Создание коллекции: shopping_lists');
    
    await setDoc(doc(db, 'shopping_lists', 'list-1'), {
      name: 'Продукты для встречи',
      description: 'Что нужно купить',
      user_id: testUserId,
      is_shared: true,
      shared_with: [
        {
          user_id: contactUserId,
          permission: 'edit',
          shared_at: Timestamp.now()
        }
      ],
      color_tag: '#FF5733',
      created_at: Timestamp.now(),
      updated_at: Timestamp.now()
    });
    
    console.log('   ✅ shopping_lists создан');
    results.push('shopping_lists');

    // ============================================
    // 12. ПОДКОЛЛЕКЦИЯ: shopping_lists/{id}/items
    // ============================================
    console.log('\n📁 12. Создание подколлекции: shopping_lists/list-1/items');
    
    const items = [
      {
        name: 'Пицца',
        category: 'Еда',
        quantity: 2,
        unit: 'шт',
        last_price: 500,
        currency: 'RUB',
        is_purchased: false,
        sort_order: 1,
        notes: 'С пепперони',
        added_by: testUserId,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now()
      },
      {
        name: 'Кола',
        category: 'Напитки',
        quantity: 1.5,
        unit: 'л',
        last_price: 100,
        currency: 'RUB',
        is_purchased: false,
        sort_order: 2,
        notes: 'Без сахара',
        added_by: testUserId,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now()
      }
    ];

    for (let i = 0; i < items.length; i++) {
      await setDoc(doc(db, 'shopping_lists', 'list-1', 'items', `item-${i+1}`), items[i]);
      console.log(`   ✅ items: ${items[i].name} добавлен`);
    }
    results.push('shopping_lists_items');

    // ============================================
    // 13. КОЛЛЕКЦИЯ: notifications
    // ============================================
    console.log('\n📁 13. Создание коллекции: notifications');
    
    await setDoc(doc(db, 'notifications', 'notif-1'), {
      user_id: testUserId,
      type: 'event_reminder',
      related_event_id: 'test-event-1',
      title: 'Напоминание о событии',
      message: 'Событие "Встреча" начнется через 1 час',
      reminder_time: Timestamp.fromDate(new Date(Date.now() + 55 * 60 * 1000)),
      is_recurring_reminder: false,
      is_read: false,
      is_sent: false,
      send_method: 'in_app',
      created_at: Timestamp.now(),
      scheduled_for: Timestamp.fromDate(new Date(Date.now() + 55 * 60 * 1000)),
      priority: 'high'
    });
    
    console.log('   ✅ notifications создан');
    results.push('notifications');

    // ============================================
    // ИТОГИ
    // ============================================
    console.log('\n========================================');
    console.log('🎉 ВСЕ КОЛЛЕКЦИИ УСПЕШНО СОЗДАНЫ!');
    console.log('========================================');
    console.log('\n📊 СОЗДАННЫЕ КОЛЛЕКЦИИ:');
    
    const allCollections = [
      'users', 'events', 'chats', 'chats/*/messages',
      'user_profiles', 'categories', 'contacts',
      'interest_groups', 'interest_groups/*/members',
      'folders', 'shopping_lists', 'shopping_lists/*/items',
      'notifications'
    ];
    
    allCollections.forEach(col => {
      console.log(`   ✅ ${col}`);
    });
    
    console.log('\n📁 ПОЛНАЯ СТРУКТУРА:');
    console.log('   📂 users/');
    console.log('      └── 📄', testUserId);
    console.log('   📂 user_profiles/');
    console.log('      └── 📄', testUserId);
    console.log('   📂 events/');
    console.log('      └── 📄 test-event-1');
    console.log('   📂 categories/');
    console.log('      ├── 📄 category-1 (Друзья)');
    console.log('      ├── 📄 category-2 (Семья)');
    console.log('      └── 📄 category-3 (Коллеги)');
    console.log('   📂 contacts/');
    console.log('      └── 📄 contact-1');
    console.log('   📂 interest_groups/');
    console.log('      └── 📄 group-1');
    console.log('          └── 📂 members/');
    console.log('              ├── 📄', testUserId);
    console.log('              └── 📄', contactUserId);
    console.log('   📂 folders/');
    console.log('      ├── 📄 folder-1 (Учеба)');
    console.log('      └── 📄 folder-2 (Работа)');
    console.log('   📂 chats/');
    console.log('      └── 📄 test-chat-1');
    console.log('          └── 📂 messages/');
    console.log('              └── 📄 test-msg-1');
    console.log('   📂 shopping_lists/');
    console.log('      └── 📄 list-1');
    console.log('          └── 📂 items/');
    console.log('              ├── 📄 item-1 (Пицца)');
    console.log('              └── 📄 item-2 (Кола)');
    console.log('   📂 notifications/');
    console.log('      └── 📄 notif-1');
    
    console.log('\n🔑 ТЕСТОВЫЙ ПОЛЬЗОВАТЕЛЬ ID:', testUserId);
    console.log('🔑 КОНТАКТ USER ID:', contactUserId);
    console.log('\n✨ ГОТОВО! Теперь все коллекции созданы.');

  } catch (error) {
    console.error('\n❌ ОШИБКА:');
    console.error('Código:', error.code);
    console.error('Mensaje:', error.message);
  }
}

// Запуск
createAllCollections();
