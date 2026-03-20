import { db } from '../firebase/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  Timestamp 
} from 'firebase/firestore';

// Función para esperar entre operaciones (evitar límites de Firebase)
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Función principal
export async function initializeFirebaseCollections() {
  console.log('🚀 Iniciando creación de colecciones en Firebase...');
  console.log('📁 Proyecto: uni2go-final');
  
  const results = {
    users: false,
    events: false,
    chats: false,
    messages: false
  };

  try {
    // ============================================
    // 1. CREAR COLECCIÓN USERS
    // ============================================
    console.log('\n📁 Creando colección: users');
    
    const testUserId = 'test-user-' + Date.now();
    
    await setDoc(doc(db, 'users', testUserId), {
      // Datos básicos
      name: 'Тест',
      surname: 'Пользователь',
      email: 'test@uni2go.com',
      phone: '+1234567890',
      dateOfBirth: '1990-01-01',
      friend_code: '12345678',
      
      // Timestamps
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      
      // Nuevos campos
      isActive: true,
      avatarUrl: '',
      bio: 'Пользователь для тестирования'
    });
    
    console.log('   ✅ users: документ creado con ID:', testUserId);
    results.users = true;
    await sleep(1000);

    // ============================================
    // 2. CREAR COLECCIÓN EVENTS
    // ============================================
    console.log('\n📁 Creando colección: events');
    
    const startTime = Timestamp.now();
    const endTime = Timestamp.fromDate(new Date(Date.now() + 2 * 60 * 60 * 1000));
    
    await setDoc(doc(db, 'events', 'test-event-1'), {
      // Campos existentes
      title: 'Тестовое событие',
      description: 'Описание тестового события',
      start: startTime,
      end: endTime,
      allDay: false,
      userId: testUserId,
      createdAt: Timestamp.now(),
      
      // Nuevo: attendees en lugar de people/groups
      attendees: [
        {
          userId: testUserId,
          status: 'confirmed',
          role: 'organizer'
        }
      ],
      
      // Nuevos campos
      updatedAt: Timestamp.now(),
      location: 'Онлайн',
      eventType: 'meeting'
    });
    
    console.log('   ✅ events: документ creado con ID: test-event-1');
    results.events = true;
    await sleep(1000);

    // ============================================
    // 3. CREAR COLECCIÓN CHATS
    // ============================================
    console.log('\n📁 Creando colección: chats');
    
    const secondUserId = 'test-user-2-' + Date.now();
    
    await setDoc(doc(db, 'chats', 'test-chat-1'), {
      // Campos existentes
      participants: [testUserId, secondUserId],
      participantNames: ['Тест', 'Друг'],
      createdAt: Timestamp.now(),
      
      // IMPORTANTE: lastMessage como объект (no string)
      lastMessage: {
        text: '',
        senderId: null,
        timestamp: null,
        readBy: []
      },
      
      // Nuevos campos
      updatedAt: Timestamp.now(),
      messageCount: 0,
      unreadCount: {
        [testUserId]: 0,
        [secondUserId]: 0
      }
    });
    
    console.log('   ✅ chats: документ creado con ID: test-chat-1');
    results.chats = true;
    await sleep(1000);

    // ============================================
    // 4. CREAR SUBCOLECCIÓN MESSAGES
    // ============================================
    console.log('\n📁 Creando subcolección: chats/test-chat-1/messages');
    
    await setDoc(
      doc(db, 'chats', 'test-chat-1', 'messages', 'test-msg-1'), 
      {
        // Campos existentes
        senderId: secondUserId,
        text: '¡Hola! Este es un mensaje de prueba',
        timestamp: Timestamp.now(),
        
        // Nuevos campos
        messageText: '¡Hola! Este es un mensaje de prueba',
        messageType: 'text',
        isDelivered: true,
        isRead: false,
        deliveredAt: Timestamp.now(),
        readBy: [secondUserId],
        reactions: {},
        sentAt: Timestamp.now()
      }
    );
    
    console.log('   ✅ messages: documento creado con ID: test-msg-1');
    results.messages = true;

    // ============================================
    // RESUMEN FINAL
    // ============================================
    console.log('\n========================================');
    console.log('✅ CREACIÓN COMPLETADA');
    console.log('========================================');
    console.log('\n📊 COLECCIONES CREADAS:');
    console.log('   users      :', results.users ? '✅' : '❌');
    console.log('   events     :', results.events ? '✅' : '❌');
    console.log('   chats      :', results.chats ? '✅' : '❌');
    console.log('   messages   :', results.messages ? '✅' : '❌');
    console.log('\n📁 ESTRUCTURA EN FIREBASE:');
    console.log('   📂 users/');
    console.log('      └── 📄', testUserId);
    console.log('   📂 events/');
    console.log('      └── 📄 test-event-1');
    console.log('   📂 chats/');
    console.log('      └── 📄 test-chat-1');
    console.log('          └── 📂 messages/');
    console.log('              └── 📄 test-msg-1');
    console.log('\n🔑 ID USUARIO DE PRUEBA:', testUserId);
    console.log('\n✨ LISTO! Ahora puedes empezar a usar estas colecciones.');

    return results;

  } catch (error) {
    console.error('\n❌ ERROR DURANTE LA CREACIÓN:');
    console.error(error);
    throw error;
  }
}
