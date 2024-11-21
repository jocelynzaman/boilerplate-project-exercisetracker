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
    if (err) {
      console.log(personId);
      return console.log(err);
    }

    let NEW_LOG = {
      description: description,
      duration: Number(duration),
      date: date.toDateString()
    }
    personFound.log.push(NEW_LOG);
    personFound.save(function (err, updatedPerson) {
      if (err) return console.log(err);
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
      });
    });
  });

app.post('/api/users/:_id/exercises', function (req, res, next) {
  let t = setTimeout(() => {
    next({ message: "timeout" });
  }, TIMEOUT);
  let date = (!isNaN(new Date(req.body.date).getTime())) ? new Date(req.body.date.replace(/-/g, '\/')) : new Date();
  findEditThenSave(req.params._id, req.body.description, req.body.duration, date, function (err, data) {
    clearTimeout(t);
    if (err) {
      return next(err);
    }
    if (!data) {
      console.log("Missing `done()` argument");
      return next({ message: "Missing callback argument" });
    }
    console.log(data);
    var logIndex = data.log.length - 1;
    let date = data.log[logIndex].date;
    let duration = data.log[logIndex].duration;
    let description = data.log[logIndex].description;
    res.json({ _id: data._id, username: data.username, date: date, duration: duration, description: description });
  });
});

app.get('/api/users/:_id/logs', function (req, res) {

  Exercise.findById({ _id: req.params._id }).exec(function (err, personFound) {
    if (err) return console.log(err);

    let from = (!isNaN(new Date(req.query.from).getTime())) ? (new Date(req.query.from)) : null;
    let to = (!isNaN(new Date(req.query.to).getTime())) ? (new Date(req.query.to)) : null;;

    let limit = req.query.limit ? Number(req.query.limit) : personFound.log.length;

    let filteredLog = personFound.log;

    if (from || to) {
      filteredLog = personFound.log.filter(item => {
        const itemDate = new Date(item.date);
        if (from && to)
          return itemDate >= from && itemDate <= to;
        else if (from)
          return itemDate >= from;
        else
          return itemDate <= to
      })
    }

    from = from ? from.toDateString() : null;
    to = to ? to.toDateString() : null;

    if (from && to)
      res.json({ _id: personFound._id, username: personFound.username, from: from, to: to, count: personFound.log.length, log: filteredLog.slice(0, limit) });
    else if (from)
      res.json({ _id: personFound._id, username: personFound.username, from: from, count: personFound.log.length, log: filteredLog.slice(0, limit) });
    else if (to)
      res.json({ _id: personFound._id, username: personFound.username, to: to, count: personFound.log.length, log: filteredLog.slice(0, limit) });
    else
      res.json({ _id: personFound._id, username: personFound.username, count: personFound.log.length, log: filteredLog.slice(0, limit) });
  })
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})