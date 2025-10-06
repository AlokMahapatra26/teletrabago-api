import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';

interface UserInfo {
  socketId: string;
  userId: string;
  userName: string;
  roomName: string;
}

const rooms = new Map<string, Map<string, UserInfo>>();

export function setupSignalingServer(server: HttpServer) {
  const io = new Server(server, {
    cors: {
      origin: 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    path: '/socket.io/',
  });

  io.on('connection', (socket: Socket) => {
    console.log('🔌 New socket connection:', socket.id);

    // Join room
    socket.on('join-room', ({ roomName, userId, userName }) => {
      console.log(`👤 ${userName} joining room: ${roomName}`);

      socket.join(roomName);

      // Add user to room
      if (!rooms.has(roomName)) {
        rooms.set(roomName, new Map());
      }

      const room = rooms.get(roomName)!;
      room.set(socket.id, { socketId: socket.id, userId, userName, roomName });

      // Get all other users in room
      const otherUsers = Array.from(room.values()).filter(
        (user) => user.socketId !== socket.id
      );

      // Send existing users to new user
      socket.emit('existing-users', otherUsers);

      // Notify others about new user
      socket.to(roomName).emit('user-joined', {
        socketId: socket.id,
        userId,
        userName,
      });

      console.log(`✅ Room ${roomName} now has ${room.size} users`);
    });

    // WebRTC signaling: offer
    socket.on('offer', ({ offer, to }) => {
      console.log(`📤 Sending offer from ${socket.id} to ${to}`);
      io.to(to).emit('offer', {
        offer,
        from: socket.id,
      });
    });

    // WebRTC signaling: answer
    socket.on('answer', ({ answer, to }) => {
      console.log(`📤 Sending answer from ${socket.id} to ${to}`);
      io.to(to).emit('answer', {
        answer,
        from: socket.id,
      });
    });

    // WebRTC signaling: ICE candidate
    socket.on('ice-candidate', ({ candidate, to }) => {
      io.to(to).emit('ice-candidate', {
        candidate,
        from: socket.id,
      });
    });

    // Toggle video
    socket.on('toggle-video', ({ roomName, enabled }) => {
      socket.to(roomName).emit('user-video-toggle', {
        socketId: socket.id,
        enabled,
      });
    });

    // Toggle audio
    socket.on('toggle-audio', ({ roomName, enabled }) => {
      socket.to(roomName).emit('user-audio-toggle', {
        socketId: socket.id,
        enabled,
      });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log('🔌 Socket disconnected:', socket.id);

      // Find and remove user from all rooms
      rooms.forEach((room, roomName) => {
        if (room.has(socket.id)) {
          const user = room.get(socket.id)!;
          room.delete(socket.id);

          // Notify others in room
          socket.to(roomName).emit('user-left', {
            socketId: socket.id,
          });

          console.log(`👋 ${user.userName} left room ${roomName}`);

          // Clean up empty rooms
          if (room.size === 0) {
            rooms.delete(roomName);
          }
        }
      });
    });

    // Leave room explicitly
    socket.on('leave-room', ({ roomName }) => {
      const room = rooms.get(roomName);
      if (room && room.has(socket.id)) {
        const user = room.get(socket.id)!;
        room.delete(socket.id);

        socket.to(roomName).emit('user-left', {
          socketId: socket.id,
        });

        socket.leave(roomName);
        console.log(`👋 ${user.userName} left room ${roomName}`);
      }
    });
  });

  console.log('✓ Socket.IO signaling server initialized');
  return io;
}
