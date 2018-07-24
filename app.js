const express = require('express')
const app = express()

const PORT = 8080

app.get('/', (req, res) => res.send('Hello World!'))

app.get('/callback', (req, res) => {
    console.log(req)
    res.send('callback handler')
})

app.post('/webhook', (req, res) => {
    console.log(req)
    res.send('webhook handler')
})

app.listen(PORT, () => console.log(`Listening on port ${PORT}`))
