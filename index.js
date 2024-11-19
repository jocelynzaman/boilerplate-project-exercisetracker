const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
let bodyParser = require('body-parser');

let mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const exerciseSchema = new mongoose.Schema({
  "username": {
    "type": String,
    "required": true
  },
  "log": [Object]
});

let Exercise = mongoose.model("exercise_tracker", exerciseSchema);

const TIMEOUT = 10000;

app.use(bodyParser.urlencoded({ extended: false }), function (req, res, next) {
  console.log(req.method + ' ' + req.path + ' - ' + req.ip);
  next();
});

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

const findOneByName = (name, done) => {
  Exercise.findOne({ "username": name }, function (err, personFound) {
    if (err) return console.log(err);
    done(null, personFound);
  });
};

const findEditThenSave = (personId, description, duration, date, done) => {
  Exercise.findById(personId, function (err, personFound) {
    if (err) return console.log(err);
    console.log(personId + ' ' + personFound);
    let NEW_LOG = {
      description: description, 
      duration: Number(duration), 
      date: date.toDateString()
    }
    personFound.log.push(NEW_LOG);
    personFound.save(function (err, updatedPerson) {
      if (err) return console.log(err);
      // Person.markModified('edited-field');
      done(null, updatedPerson);
    })
  })
};

//create user
app.route("/api/users")
  .get(function (req, res) {
    Exercise.find()
      .select({ username: 1 }).exec(function (err, personFound) {
        if (err) return console.log(err);
        res.json(personFound);
      })
  })

  .post(function (req, res, next) {
    let t = setTimeout(() => {
      next({ message: "timeout" });
    }, TIMEOUT);
    let e = new Exercise(req.body);
    e.save(function (err, pers) {
      if (err) {
        return next(err);
      }
      findOneByName(pers.username, function (err, data) {
        clearTimeout(t);
        if (err) {
          return next(err);
        }
        if (!data) {
          console.log("Missing `done()` argument");
          return next({ message: "Missing callback argument" });
        }
        res.json({ username: data.username, _id: data._id });
        console.log(data);
      });
    });
  });

app.post('/api/users/:_id/exercises', function (req, res, next) {
  let t = setTimeout(() => {
    next({ message: "timeout" });
  }, TIMEOUT);
  // console.log(req.body.date);
  date = (req.body.date.trim() === " ") ? new Date(req.body.date): new Date();
  findEditThenSave(req.params._id, req.body.description, req.body.duration, date, function (err, data) {
    clearTimeout(t);
    if (err) {
      return next(err);
    }
    if (!data) {
      console.log("Missing `done()` argument");
      return next({ message: "Missing callback argument" });
    }
    var logIndex = data.log.length - 1;
    res.json({_id: data._id, username: data.username, date: data.log[logIndex].date, duration: data.log[logIndex].duration, description: data.log[logIndex].description});
  });
});

app.get('/api/users/:_id/logs', function (req, res) {
  Exercise.findById(req.params._id, function (err, personFound) {
    if (err) return console.log(err);
    console.log(personFound);
    res.json({_id: personFound._id, username: personFound.username, count: personFound.log.length, log: personFound.log})
  })
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})