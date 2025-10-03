const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "/")));

const rooms = {}; // {room:{players,round,eliminations,penalty}}

function ensureRoom(room){ if(!rooms[room]) rooms[room]={players:[],round:0,eliminations:0,penalty:1}; }

io.on("connection",socket=>{
  socket.emit("connected",{id:socket.id});

  socket.on("joinRoom",({room,name})=>{
    ensureRoom(room);
    const r=rooms[room]; const isHost=r.players.length===0;
    const player={id:socket.id,name,score:0,lastPick:null,alive:true,isReady:false,isHost};
    r.players.push(player); socket.join(room);
    socket.emit("roomJoined",{room,players:r.players}); io.to(room).emit("roomUpdate",{players:r.players,...r});
    io.to(room).emit("message",`${name} joined.`);
  });

  socket.on("playerReady",({room})=>{
    const r=rooms[room]; const p=r.players.find(x=>x.id===socket.id); if(!p) return;
    p.isReady=true; io.to(room).emit("roomUpdate",{players:r.players,...r}); io.to(room).emit("message",`${p.name} ready.`);
  });

  socket.on("submitPick",({room,pick})=>{
    const r=rooms[room]; const p=r.players.find(x=>x.id===socket.id); if(p) p.lastPick=pick;
    io.to(room).emit("roomUpdate",{players:r.players,...r});
  });

  socket.on("leaveRoom",({room})=>{
    const r=rooms[room]; if(!r) return;
    const idx=r.players.findIndex(x=>x.id===socket.id);
    if(idx>=0){ const name=r.players[idx].name; r.players.splice(idx,1); io.to(room).emit("message",`${name} left.`); io.to(room).emit("roomUpdate",{players:r.players,...r}); }
    socket.leave(room);
  });

  socket.on("disconnect",()=>{
    for(const room in rooms){
      const r=rooms[room]; const idx=r.players.findIndex(x=>x.id===socket.id);
      if(idx>=0){ const name=r.players[idx].name; r.players.splice(idx,1); io.to(room).emit("message",`${name} disconnected.`); io.to(room).emit("roomUpdate",{players:r.players,...r}); }
    }
  });
});

server.listen(process.env.PORT||3000,()=>console.log("Server running on port 3000"));
