const express = require('express')
const app = express()
const http = require('http')
const server = http.createServer(app)
const { Server } = require("socket.io")
const io = new Server(server)
const port = process.env.PORT || 3030

const msgs = []
let connectedUsers = []

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html')
})

app.get('/favicon.ico', (req, res) => res.status(204))

io.on('connection', (socket) => {
    console.log('a user connected')

    socket.on('setUserSocket', nickname => {
        socket.emit('addMsgs', msgs)
        socket.broadcast.emit('userJoin', nickname)
        connectedUsers.push(nickname)
        console.log(connectedUsers.length, 'users connected')
        socket.nickname = nickname
    })

    socket.on('disconnect', () => {
        connectedUsers = connectedUsers.filter(nickname => nickname !== socket.nickname)
        console.log('user disconnected', connectedUsers.length)
    })

    socket.on('sendMsg', async msg => {
        msgs.push(msg)

        if (msg.to) {
            const userSocket = await getUserSocket(msg.to)
            userSocket.emit('addMsg', msg)
        } else {
            io.to(msg.topic).emit('addMsg', msg)
            setTimeout(() => {
                socket.emit('addMsg', { by: 'System', txt: 'Thank you for sharing' })
            }, 1000)
        }

    })

    socket.on('setTopic', topic => {
        if (socket.myTopic) {
            socket.leave(socket.myTopic)
        }
        socket.join(topic)
        socket.myTopic = topic
        socket.emit('addMsgs', msgs.filter(msg => msg.topic === topic))
    })
})

server.listen(port, () => {
    console.log('Server listening at port %d', port)
})

async function getUserSocket(nickname) {
    const sockets = await _getAllSockets()
    const socket = sockets.find(s => s.nickname === nickname)
    return socket
}

async function _getAllSockets() {
    // return all Socket instances
    const sockets = await io.fetchSockets()
    return sockets
}