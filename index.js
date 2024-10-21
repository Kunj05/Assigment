const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const Message = require('./models/Message');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
app.use(express.static('public'));

// Connect to the database
connectDB();

// Track active chat sessions
const chatHistory = {
    groupChat: [],
    personalChats: {}
};

io.on('connection', (socket) => {
    console.log('New client connected');

    // Emit previous messages based on chat type
    socket.on('joinChat', (chatType, participantId) => {
        if (chatType === 'group') {
            socket.emit('previousMessages', chatHistory.groupChat);
        } else {
            // Initialize personal chat history if it doesn't exist
            if (!chatHistory.personalChats[participantId]) {
                chatHistory.personalChats[participantId] = [];
            }
            socket.emit('previousMessages', chatHistory.personalChats[participantId]);
        }
    });

    socket.on('sendMessage', async (data) => {
        const message = new Message(data);
        await message.save();

        if (data.chatType === 'group') {
            chatHistory.groupChat.push(message);
            io.emit('newMessage', message);
        } else {
            const { recipient } = data;
            if (!chatHistory.personalChats[recipient]) {
                chatHistory.personalChats[recipient] = [];
            }
            chatHistory.personalChats[recipient].push(message);
            // Emit to the recipient only
            socket.to(recipient).emit('newMessage', message);
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
