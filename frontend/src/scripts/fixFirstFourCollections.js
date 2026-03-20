// src/scripts/fixFirstFourCollections.js
// Импортируем напрямую из firebase
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { collection, getDocs, updateDoc, doc, Timestamp } from "firebase/firestore";

// Твои реальные значения из .env
const firebaseConfig = {
  apiKey: "AIzaSyCVYcnG6HDwJleglo24JgLfuLvwYOPXsZw",
  authDomain: "uni2-go.firebaseapp.com",
  projectId: "uni2-go",
  storageBucket: "uni2-go.firebasestorage.app",
  messagingSenderId: "113497798210",
  appId: "1:113497798210:web:1629b40cacf3c2eb645fdb"
};

// Инициализируем Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

console.log('========================================');
console.log('🔧 ИСПРАВЛЕНИЕ ПЕРВЫХ ЧЕТЫРЕХ КОЛЛЕКЦИЙ');
console.log('========================================');
console.log('📁 Проект:', firebaseConfig.projectId);
console.log('');

async function fixFirstFourCollections() {
  const results = {
    users: 0,
    events: 0,
    chats: 0,
    messages: 0
  };

  try {
    // ============================================
    // 1. ИСПРАВЛЕНИЕ КОЛЛЕКЦИИ users
    // ============================================
    console.log('📁 Исправление коллекции: users');
    const usersSnapshot = await getDocs(collection(db, 'users'));
    
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const userRef = doc(db, 'users', userDoc.id);
      
      const updates = {};
      
      // Добавляем isActive, если нет
      if (userData.isActive === undefined) {
        updates.isActive = true;
      }
      
      // Добавляем updatedAt, если нет
      if (userData.updatedAt === undefined) {
        updates.updatedAt = Timestamp.now();
      }
      
      // Добавляем avatarUrl, если нет
      if (userData.avatarUrl === undefined) {
        updates.avatarUrl = '';
      }
      
      // Добавляем bio, если нет
      if (userData.bio === undefined) {
        updates.bio = '';
      }
      
      // Добавляем friend_code, если нет
      if (userData.friend_code === undefined) {
        // Генерируем код на основе имени или email
        const namePart = userData.name ? userData.name.substring(0, 3) : 'usr';
        const numPart = Math.floor(10000 + Math.random() * 90000);
        updates.friend_code = `${namePart}${numPart}`;
      }
      
      if (Object.keys(updates).length > 0) {
        await updateDoc(userRef, updates);
        results.users++;
        console.log(`   ✅ Обновлен пользователь: ${userDoc.id} (${Object.keys(updates).join(', ')})`);
      }
    }
    console.log(`   ✅ Всего обновлено пользователей: ${results.users}`);

    // ============================================
    // 2. ИСПРАВЛЕНИЕ КОЛЛЕКЦИИ events (САМОЕ ВАЖНОЕ)
    // ============================================
    console.log('\n📁 Исправление коллекции: events');
    const eventsSnapshot = await getDocs(collection(db, 'events'));
    
    for (const eventDoc of eventsSnapshot.docs) {
      const eventData = eventDoc.data();
      const eventRef = doc(db, 'events', eventDoc.id);
      
      const updates = {};
      
      // 2.1 Преобразуем people/groups в attendees
      if (!eventData.attendees && eventData.userId) {
        updates.attendees = [
          {
            userId: eventData.userId,
            status: 'confirmed',
            role: 'organizer',
            invitedAt: eventData.createdAt || Timestamp.now()
          }
        ];
        
        // Если есть people, добавляем их как гостей
        if (eventData.people && typeof eventData.people === 'string' && eventData.people.trim()) {
          // Здесь можно добавить логику парсинга people
          console.log(`   📝 В событии ${eventDoc.id} есть поле people, но требуется ручная обработка`);
        }
      }
      
      // 2.2 Добавляем updatedAt
      if (eventData.updatedAt === undefined) {
        updates.updatedAt = Timestamp.now();
      }
      
      // 2.3 Добавляем location
      if (eventData.location === undefined) {
        updates.location = '';
      }
      
      // 2.4 Добавляем eventType
      if (eventData.eventType === undefined) {
        // Пытаемся определить тип из title
        const title = (eventData.title || '').toLowerCase();
        if (title.includes('день рождения') || title.includes('cumple')) {
          updates.eventType = 'birthday';
        } else if (title.includes('встреча') || title.includes('reunión')) {
          updates.eventType = 'meeting';
        } else {
          updates.eventType = 'other';
        }
      }
      
      // 2.5 Добавляем status
      if (eventData.status === undefined) {
        updates.status = 'scheduled';
      }
      
      // 2.6 Добавляем isVirtual
      if (eventData.isVirtual === undefined) {
        updates.isVirtual = false;
      }
      
      if (Object.keys(updates).length > 0) {
        await updateDoc(eventRef, updates);
        results.events++;
        console.log(`   ✅ Обновлено событие: ${eventDoc.id} (${Object.keys(updates).join(', ')})`);
      }
    }
    console.log(`   ✅ Всего обновлено событий: ${results.events}`);

    // ============================================
    // 3. ИСПРАВЛЕНИЕ КОЛЛЕКЦИИ chats
    // ============================================
    console.log('\n📁 Исправление коллекции: chats');
    const chatsSnapshot = await getDocs(collection(db, 'chats'));
    
    for (const chatDoc of chatsSnapshot.docs) {
      const chatData = chatDoc.data();
      const chatRef = doc(db, 'chats', chatDoc.id);
      
      const updates = {};
      
      // 3.1 Преобразуем lastMessage из строки в объект
      if (typeof chatData.lastMessage === 'string') {
        updates.lastMessage = {
          text: chatData.lastMessage || '',
          senderId: chatData.lastMessageSenderId || null,
          timestamp: chatData.lastMessageTimestamp || null,
          readBy: chatData.lastMessageReadBy || []
        };
        console.log(`   📝 Преобразован lastMessage для чата: ${chatDoc.id}`);
      } else if (chatData.lastMessage === undefined) {
        updates.lastMessage = {
          text: '',
          senderId: null,
          timestamp: null,
          readBy: []
        };
      }
      
      // 3.2 Добавляем updatedAt
      if (chatData.updatedAt === undefined) {
        updates.updatedAt = chatData.createdAt || Timestamp.now();
      }
      
      // 3.3 Добавляем messageCount
      if (chatData.messageCount === undefined) {
        updates.messageCount = 0;
      }
      
      // 3.4 Добавляем unreadCount
      if (chatData.unreadCount === undefined && chatData.participants) {
        const unreadCount = {};
        chatData.participants.forEach(pid => {
          unreadCount[pid] = 0;
        });
        updates.unreadCount = unreadCount;
      }
      
      if (Object.keys(updates).length > 0) {
        await updateDoc(chatRef, updates);
        results.chats++;
        console.log(`   ✅ Обновлен чат: ${chatDoc.id} (${Object.keys(updates).join(', ')})`);
      }
    }
    console.log(`   ✅ Всего обновлено чатов: ${results.chats}`);

    // ============================================
    // 4. ИСПРАВЛЕНИЕ ПОДКОЛЛЕКЦИИ messages
    // ============================================
    console.log('\n📁 Исправление подколлекции: messages');
    
    // Получаем все чаты
    const allChats = await getDocs(collection(db, 'chats'));
    
    for (const chatDoc of allChats.docs) {
      const messagesRef = collection(db, 'chats', chatDoc.id, 'messages');
      const messagesSnapshot = await getDocs(messagesRef);
      
      for (const msgDoc of messagesSnapshot.docs) {
        const msgData = msgDoc.data();
        const msgRef = doc(db, 'chats', chatDoc.id, 'messages', msgDoc.id);
        
        const updates = {};
        
        // 4.1 Добавляем messageText (копия text)
        if (msgData.messageText === undefined && msgData.text) {
          updates.messageText = msgData.text;
        }
        
        // 4.2 Добавляем messageType
        if (msgData.messageType === undefined) {
          updates.messageType = 'text';
        }
        
        // 4.3 Добавляем isDelivered
        if (msgData.isDelivered === undefined) {
          updates.isDelivered = true;
        }
        
        // 4.4 Добавляем isRead
        if (msgData.isRead === undefined) {
          updates.isRead = false;
        }
        
        // 4.5 Добавляем deliveredAt
        if (msgData.deliveredAt === undefined && msgData.timestamp) {
          updates.deliveredAt = msgData.timestamp;
        }
        
        // 4.6 Добавляем readBy
        if (msgData.readBy === undefined && msgData.senderId) {
          updates.readBy = [msgData.senderId];
        }
        
        // 4.7 Добавляем reactions
        if (msgData.reactions === undefined) {
          updates.reactions = {};
        }
        
        // 4.8 Добавляем sentAt
        if (msgData.sentAt === undefined && msgData.timestamp) {
          updates.sentAt = msgData.timestamp;
        }
        
        if (Object.keys(updates).length > 0) {
          await updateDoc(msgRef, updates);
          results.messages++;
        }
      }
    }
    console.log(`   ✅ Всего обновлено сообщений: ${results.messages}`);

    // ============================================
    // ИТОГИ
    // ============================================
    console.log('\n========================================');
    console.log('✅ ИСПРАВЛЕНИЕ ЗАВЕРШЕНО');
    console.log('========================================');
    console.log('\n📊 РЕЗУЛЬТАТЫ:');
    console.log('   Обновлено пользователей:', results.users);
    console.log('   Обновлено событий:', results.events);
    console.log('   Обновлено чатов:', results.chats);
    console.log('   Обновлено сообщений:', results.messages);
    console.log('\n📁 ЧТО БЫЛО ИСПРАВЛЕНО:');
    console.log('   users: добавлены поля isActive, updatedAt, avatarUrl, bio, friend_code');
    console.log('   events: созданы attendees из userId, добавлены новые поля');
    console.log('   chats: lastMessage преобразован в объект, добавлены messageCount, unreadCount');
    console.log('   messages: добавлены messageText, messageType, isRead, readBy, реакции');
    console.log('\n✨ ГОТОВО! Теперь структура соответствует диаграмме.');

  } catch (error) {
    console.error('\n❌ ОШИБКА:');
    console.error('Código:', error.code);
    console.error('Mensaje:', error.message);
  }
}

// Запуск
fixFirstFourCollections();