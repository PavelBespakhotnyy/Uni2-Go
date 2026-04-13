# Componente de Calendario (JSX)

Este es un componente de calendario personalizado desarrollado con React, Tailwind CSS y Lucide-React. Ofrece una gestión fluida de eventos con persistencia local y una interfaz moderna.

## Características

- **Vistas Múltiples:** 
  - **Mes:** Vista clásica con indicadores "+N más" para días saturados.
  - **Semana:** Diseño en cascada que evita el solapamiento de títulos y mejora la visibilidad de eventos simultáneos.
  - **Día:** Timeline horizontal para una visualización clara del horario diario.
- **Gestión de Eventos:** Interfaz intuitiva para crear, editar y eliminar eventos.
- **Validación Inteligente:** Control de errores para evitar fechas de fin anteriores a las de inicio con alertas amigables.
- **Persistencia Local:** Los datos se guardan en el `localStorage` del navegador, permitiendo un uso rápido y sin dependencias externas de base de datos para los eventos.
- **Navegación por Teclado:** Uso de flechas izquierda/derecha para cambiar de periodo según la vista actual.
- **Interfaz Moderna:** Modales personalizados para confirmaciones y errores, eliminando el uso de `alert()` y `confirm()` nativos.

## Estructura de Archivos

- `calendar.jsx`: Lógica principal, gestión de estados y renderizado de las vistas (Mes, Semana, Día).
- `index.css`: Estilos estructurales para garantizar que el calendario ocupe todo el espacio disponible.
- `../../services/calendarService.js`: Servicio encargado de la lógica de persistencia en `localStorage` y notificación de cambios entre componentes.

## Estructura de Datos (localStorage)

Los eventos se almacenan bajo la clave `calendar_events` con el siguiente formato:
- `id`: String (generado automáticamente)
- `title`: String
- `start`: Date (ISO String en almacenamiento)
- `end`: Date (ISO String en almacenamiento)
- `allDay`: Boolean
- `people`: String
- `groups`: String
- `description`: String
- `createdAt`: ISO String
- `updatedAt`: ISO String (opcional)

## Dependencias

- `date-fns`: Manipulación y formateo de fechas.
- `lucide-react`: Iconografía moderna.
- `React`: Motor de la interfaz.
- `Tailwind CSS`: Estilizado rápido y adaptativo.
