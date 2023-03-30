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
  const from = dateRegex.test(req.query.from) ? new Date(req.query.from).toDateString() : ''
  const to = dateRegex.test(req.query.to) ? new Date(req.query.to) : ''
  const limit = req.query.limit
  try {
    let findUser = await User.findById(userId)
    if (findUser) {
      let findUserExercise = await Exercise.find({ userId })
      if (findUserExercise) {
        let filteredLogs = []
        let limitedCount
        if (from !== undefined || to !== undefined || !isNaN(limit)) {
          findUserExercise.forEach(exe => {
            let logDate = new Date(exe.date)
            if (from instanceof (Date) && to instanceof (Date)) {
              if (logDate >= from && logDate <= to) {
                filteredLogs.push({
                  description: exe.description,
                  duration: exe.duration,
                  date: new Date(exe.date).toDateString()
                })
              }
            } else if (from instanceof (Date)) {
              if (logDate >= from) {
                filteredLogs.push({
                  description: exe.description,
                  duration: exe.duration,
                  date: new Date(exe.date).toDateString()
                })
              }
            } else if (to instanceof (Date)) {
              if (logDate <= to) {
                filteredLogs.push({
                  description: exe.description,
                  duration: exe.duration,
                  date: new Date(exe.date).toDateString()
                })
              }
            }
          })
          if (limit !== '' && !isNaN(limit)) {
            const sorted = filteredLogs.sort((a, b) => a - b)
            limitedCount = sorted.slice(0, limit)
          }
          return res.json({
            _id: findUser._id,
            username: findUser.username,
            count: findUserExercise.length,
            logs: limit > 0 ? limitedCount : filteredLogs,
          })
        } else {
          return res.json({
            _id: findUser._id,
            username: findUser.username,
            count: findUserExercise.length,
            logs: findUserExercise
          })
        }
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
  const date = req.body.date ? new Date(req.body.date).toDateString() : new Date()
  try {
    if (description === '') {
      return res.json({
        error: 'Description field is required'
      })
    }
    if (isNaN(duration)) {
      return res.json({
        error: 'Duration field cannot be empty and must be a valid Number'
      })
    }
    if (date instanceof Date) {
      return res.json({
        error: 'Date field cannot be empty and must be a valid Date'
      })
    }
    let findUser = await User.findById(userId)
    if (findUser !== null) {
      let newUserExercise = new Exercise({
        userId,
        description,
        duration,
        date,
      })
      console.log(date)
      await newUserExercise.save().then((data) => {
        res.json({
          _id: data['userId'],
          username: data['username'],
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
