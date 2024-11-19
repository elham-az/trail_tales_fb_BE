const express = require('express')
const app = express()
const { getUsersByUsername, getPosts, getPostById, postNewPost } = require(`./controllers/controllers`)
const endpoints = require('./endpoints.json')
const { psqlErrorHandlerOne, psqlErrorHandlerTwo, psqlErrorHandlerThree, customErrorHandler, serverErrorHandler } = require('./error-handlers');

app.use(express.json())

app.get('/api', (request, response) => {
    response.status(200).send({endpoints})
  })

app.get('/api/users/:username', getUsersByUsername)

app.get('/api/posts', getPosts)

app.get('/api/posts/:post_id', getPostById)

app.post('/api/post', postNewPost)

app.all("*", (request, response, next) => {
    response.status(404).send({msg: 'Path not found'})
})

app.use(psqlErrorHandlerOne);

app.use(psqlErrorHandlerTwo);

app.use(psqlErrorHandlerThree);

app.use(customErrorHandler);

app.use(serverErrorHandler);

module.exports = app;