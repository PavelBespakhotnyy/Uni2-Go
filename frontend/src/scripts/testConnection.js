import { db } from '../firebase/firebase';
import { collection, getDocs, limit, query } from 'firebase/firestore';

async function testConnection() {
  try {
    console.log('🔍 Проверка подключения к Firebase...');
    console.log('Project ID:', db.app.options.projectId);
    
    // Пробуем получить любую коллекцию (лимит 1 для скорости)
    const testRef = query(collection(db, 'users'), limit(1));
    const snapshot = await getDocs(testRef);
    
    console.log('✅ Подключение работает!');
    console.log('📊 Коллекция "users" доступна:', !snapshot.empty);
    
  } catch (error) {
    console.error('❌ Ошибка подключения:');
    if (error.code) console.error('Código:', error.code);
    console.error('Mensaje:', error.message);
  }
}

testConnection();
