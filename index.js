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
  username: {
    type: String,
    required: true,
    unique: true
  }
})

const exerciseSchema = new Schema({
  userId: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, min: 1, required: true },
  date: { type: Date, default: Date.now }
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
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  const from = req.query.from !== undefined && dateRegex.test(req.query.from) ? new Date(req.query.from).toDateString() : ''
  const to = req.query.to !== undefined && dateRegex.test(req.query.to) ? new Date(req.query.to).toDateString() : ''
  const limit = !isNaN(req.query.limit) ? parseInt(req.query.limit) : 0
  console.log(from, to, limit)
  try {
    let findUser = await User.findById(userId)
    let findConditions = {}
    if (findUser) {
      if (from === '' && to === '') {
        console.log('Neither')
        findConditions = { userId }
      } else if (from !== '' && to !== '') {
        console.log('Both from and to')
        findConditions = { $and: [{ userId }, { date: { $gte: from } }, { date: { $lte: to } }] }
      } else if (to === '') {
        console.log('Only from')
        findConditions = { $and: [{ userId }, { date: { $gte: from } }] }
      } else if (from === '') {
        console.log('Only to')
        findConditions = { $and: [{ userId }, { date: { $lte: to } }] }
      }

      console.log(findConditions)
      let findUserExercise = await Exercise.find(findConditions)
      console.log(findUserExercise)
      if (findUserExercise.length) {
        const exerciseFields = []

        const sorted = findUserExercise.sort((a, b) => a.date - b.date)
        const limitedCount = sorted.slice(0, limit)

        let target = limit > 0 ? limitedCount : findUserExercise

        target.filter(exe => {
          exerciseFields.push({
            description: exe.description,
            duration: exe.duration,
            date: new Date(exe.date).toDateString()
          })
        })

        return res.json({
          _id: findUser._id,
          username: findUser.username,
          count: findUserExercise.length,
          log: exerciseFields
        })
      }
    } else {
      return res.json({
        error: 'User not found!'
      })
    }
  } catch (error) {
    console.log(error)
    res.json({
      error: 'Something wrong with the server...Related to Logs'
    })
  }
})

app.post('/api/users/', async (req, res) => {
  const username = req.body.username
  try {
    if (username === '') {
      return res.json({
        error: 'Username is required'
      })
    }
    let findUser = await User.findOne({
      username
    })
    if (!findUser) {
      let newUser = new User({
        username
      })
      await newUser.save().then(() => {
        res.json({
          username: newUser.username,
          _id: newUser._id
        })
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
  const date = req.body.date ? new Date(req.body.date).toDateString() : new Date()
  try {
    let findUser = await User.findById(userId)
    if (findUser !== null) {
      let newUserExercise = new Exercise({
        userId,
        description,
        duration,
        date,
      })
      await newUserExercise.save().then((data) => {
        res.json({
          _id: findUser._id,
          username: findUser.username,
          description: data['description'],
          duration: data['duration'],
          date: new Date(data['date']).toDateString()
        })
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
