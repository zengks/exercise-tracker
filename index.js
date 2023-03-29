const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const { Schema } = mongoose

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Successfully connected to the database!'))

const userSchema = new Schema({
  username: String,
})

const exerciseSchema = new Schema({
  username: String,
  description: String,
  duration: Number,
  date: String
})

const User = mongoose.model('User', userSchema)
const Exercise = mongoose.model('Exercise', exerciseSchema)

app.use(cors())
app.use(express.static('public'))
app.use(bodyParser.urlencoded({ extended: false }))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.get('/api/users/', async (req, res) => {
  let users = await User.find()
  let allUsers = []
  if (users.length > 0) {
    users.forEach(user => {
      allUsers.push({
        username: user.username,
        _id: user._id
      })
    });
  }
  return res.json(allUsers)
})

app.get('/api/users/:_id/logs', async (req, res) => {
  const userId = req.params._id
  let userLogs = await Exercise.find({ _id: userId })
  console.log(userLogs)
})

app.post('/api/users/', async (req, res) => {
  const username = req.body.username
  try {
    let findUser = await User.findOne({
      username
    })
    if (!findUser) {
      let newUser = new User({
        username
      })
      await newUser.save()
      return res.json({
        username: newUser.username,
        _id: newUser._id
      })
    } else {
      return res.json({
        username: findUser.username,
        _id: findUser._id
      })
    }
  } catch (error) {
    console.log(error)
    res.status(500).json({
      error: 'Something wrong with the server...related to User'
    })
  }
})

app.post('/api/users/:_id/exercises', async (req, res) => {
  const userId = req.params._id
  const description = req.body.description
  const duration = req.body.duration
  const date = req.body.date ? new Date(req.body.date) : new Date()
  try {
    let findUser = User.findById(userId)
    if (findUser !== null) {
      let newExercise = new Exercise({
        date,
        username: findUser.username,
        duration,
        description
      })
      newExercise._id = userId
      await newExercise.save()
      return res.json({
        _id: newExercise._id,
        username: newExercise.username,
        date: new Date(newExercise.date).toDateString(),
        duration: newExercise.duration,
        description: newExercise.description
      })
    } else {
      return res.json({
        error: 'user not found!'
      })
    }
  } catch (error) {
    console.log(error)
    res.status(500).json({
      error: 'Something with the server...related to Exercise'
    })
  }
})


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
