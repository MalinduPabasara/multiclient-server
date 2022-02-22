const express = require('express')
const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server)

const mongo=require('mongodb').MongoClient;
const url='mongodb://127.0.0.1/realtimedb';
let mong;

app.set('views', './views')
app.set('view engine', 'ejs')
app.use(express.static('public'))
app.use(express.urlencoded({ extended: true }))

const rooms = { }



server.listen(3000)

mongo.connect(url,function (err,db){
  mong=db;
  if (err){
    throw err;
  }
  console.log("MongoDB Connected...");


  app.get('/', (req, res) => {
    res.render('index', { rooms: rooms })
  })

  app.post('/room', (req, res) => {
    if (rooms[req.body.room] != null) {
      return res.redirect('/')
    }
    rooms[req.body.room] = { users: {} }
    res.redirect(req.body.room)
    // Send message that new room was created
    io.emit('room-created', req.body.room)
  })

  app.get('/:room', (req, res) => {
    if (rooms[req.params.room] == null) {
      return res.redirect('/')
    }
    res.render('room', { roomName: req.params.room })
  })




  io.on('connection', socket => {

    let user=db.collection('db3');

    user.find().limit(100).sort({_id:1}).toArray(function (err,res){
      if (err){
        throw err
      }

    })

    socket.on('new-user', (room, name) => {
      socket.join(room)
      rooms[room].users[socket.id] = name
      socket.to(room).broadcast.emit('user-connected', name)
    })
    socket.on('send-chat-message', (room, message) => {
      socket.to(room).broadcast.emit('chat-message', { message: message, name: rooms[room].users[socket.id] })
    user.insert({message:message},function (){
      console.log("data send")

      })
    })
    socket.on('disconnect', () => {
      getUserRooms(socket).forEach(room => {
        socket.to(room).broadcast.emit('user-disconnected', rooms[room].users[socket.id])
        delete rooms[room].users[socket.id]
      })
    })
  });


})




function getUserRooms(socket) {
  return Object.entries(rooms).reduce((names, [name, room]) => {
    if (room.users[socket.id] != null) names.push(name)
    return names
  }, [])
}
