import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import * as map from 'lib0/map';

const docs = new Map<string, WSSharedDoc>();

const messageSync = 0;
const messageAwareness = 1;

interface WSSharedDoc {
  name: string;
  doc: Y.Doc;
  conns: Map<WebSocket, Set<number>>;
  awareness: awarenessProtocol.Awareness;
}

const getYDoc = (docname: string, gc: boolean = true): WSSharedDoc => {
  return map.setIfUndefined(docs, docname, () => {
    console.log(`📄 Creating new Y.Doc for: ${docname}`);
    const doc = new Y.Doc();
    doc.gc = gc;
    const awareness = new awarenessProtocol.Awareness(doc);
    
    awareness.setLocalState(null);

    const sharedDoc: WSSharedDoc = {
      name: docname,
      doc,
      conns: new Map(),
      awareness,
    };

    awareness.on('update', ({ added, updated, removed }: any, conn: WebSocket | null) => {
      const changedClients = added.concat(updated, removed);

      if (conn !== null) {
        const connControlledIDs = sharedDoc.conns.get(conn);
        if (connControlledIDs !== undefined) {
          added.forEach((clientID: number) => {
            connControlledIDs.add(clientID);
          });
          removed.forEach((clientID: number) => {
            connControlledIDs.delete(clientID);
          });
        }
      }

      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageAwareness);
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients)
      );
      const buff = encoding.toUint8Array(encoder);

      sharedDoc.conns.forEach((_, c) => {
        send(sharedDoc, c, buff);
      });
    });

    sharedDoc.doc.on('update', (update: Uint8Array, origin: any) => {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageSync);
      syncProtocol.writeUpdate(encoder, update);
      const message = encoding.toUint8Array(encoder);
      sharedDoc.conns.forEach((_, conn) => {
        send(sharedDoc, conn, message);
      });
    });

    return sharedDoc;
  });
};

const closeConn = (doc: WSSharedDoc, conn: WebSocket) => {
  if (doc.conns.has(conn)) {
    const controlledIds = doc.conns.get(conn);
    doc.conns.delete(conn);
    console.log(`Connection closed for ${doc.name}, remaining: ${doc.conns.size}`);
    
    awarenessProtocol.removeAwarenessStates(
      doc.awareness,
      Array.from(controlledIds || []),
      null
    );
  }
  if (conn.readyState !== 3) { // CLOSED
    conn.close();
  }
};

const send = (doc: WSSharedDoc, conn: WebSocket, m: Uint8Array) => {
  if (conn.readyState !== 1) { // OPEN
    closeConn(doc, conn);
    return;
  }
  try {
    conn.send(m, (err: any) => {
      if (err != null) {
        console.error('Error sending message:', err);
        closeConn(doc, conn);
      }
    });
  } catch (e) {
    console.error('Exception sending message:', e);
    closeConn(doc, conn);
  }
};

const messageListener = (conn: WebSocket, doc: WSSharedDoc, message: Uint8Array) => {
  try {
    const encoder = encoding.createEncoder();
    const decoder = decoding.createDecoder(message);
    const messageType = decoding.readVarUint(decoder);

    switch (messageType) {
      case messageSync:
        encoding.writeVarUint(encoder, messageSync);
        syncProtocol.readSyncMessage(decoder, encoder, doc.doc, conn);

        if (encoding.length(encoder) > 1) {
          send(doc, conn, encoding.toUint8Array(encoder));
        }
        break;
      case messageAwareness: {
        awarenessProtocol.applyAwarenessUpdate(
          doc.awareness,
          decoding.readVarUint8Array(decoder),
          conn
        );
        break;
      }
    }
  } catch (err) {
    console.error('Error processing message:', err);
  }
};

export function setupDocumentWebSocket(server: Server) {
  const wss = new WebSocketServer({ 
    noServer: true,
    // Add these options for production
    perMessageDeflate: false,
    clientTracking: true,
  });

  // Handle upgrade with better error handling
  server.on('upgrade', (request, socket, head) => {
    const url = request.url || '';
    console.log(` Upgrade request for: ${url}`);
    
    // Handle both /documents and /whiteboards paths
    if (url.startsWith('/documents') || url.startsWith('/whiteboards') || 
        url.includes('documents') || url.includes('whiteboards')) {
      
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      console.log(' Invalid WebSocket path');
      socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
      socket.destroy();
    }
  });

  wss.on('connection', (conn: WebSocket, req: any) => {
    conn.binaryType = 'arraybuffer';

    // Add ping/pong to keep connection alive
    const pingInterval = setInterval(() => {
      if (conn.readyState === 1) {
        conn.ping();
      }
    }, 30000); // Ping every 30 seconds

    conn.on('pong', () => {
      // Connection is alive
    });

    // Extract document/whiteboard name from URL
    const url = req.url || '';
    console.log(`New WebSocket connection, URL: ${url}`);
    
    let docName = 'default';
    
    if (url.includes('?')) {
      const urlParams = new URLSearchParams(url.split('?')[1]);
      docName = urlParams.get('room') || 'default';
    } else {
      const parts = url.split('/').filter(Boolean);
      if (parts.length >= 2) {
        docName = `${parts[0]}/${parts[1]}`;
      }
    }

    console.log(` WebSocket connected to room: ${docName}`);

    const doc = getYDoc(docName, true);
    doc.conns.set(conn, new Set());

    console.log(`Total connections for ${docName}: ${doc.conns.size}`);

    // Send sync step 1
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageSync);
    syncProtocol.writeSyncStep1(encoder, doc.doc);
    send(doc, conn, encoding.toUint8Array(encoder));

    // Send existing awareness states
    const awarenessStates = doc.awareness.getStates();
    if (awarenessStates.size > 0) {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageAwareness);
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(
          doc.awareness,
          Array.from(awarenessStates.keys())
        )
      );
      send(doc, conn, encoding.toUint8Array(encoder));
    }

    conn.on('message', (message: ArrayBuffer) => {
      messageListener(conn, doc, new Uint8Array(message));
    });

    conn.on('close', () => {
      clearInterval(pingInterval);
      closeConn(doc, conn);
    });

    conn.on('error', (error: Error) => {
      console.error('WebSocket error:', error);
      clearInterval(pingInterval);
      closeConn(doc, conn);
    });
  });

  console.log(' WebSocket server initialized for /documents and /whiteboards');
  return wss;
}
