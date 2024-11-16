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
  "count": Number,
  "log": [{
    "description": String,
    "duration": Number,
    "date": String,
  }]
});

let Exercise = mongoose.model("Exercise", exerciseSchema);

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
  Exercise.findOne({"username": name}, function(err, personFound) {
    if (err) return console.log(err);
    done(null, personFound);
  });
};

//create user
app.route("/api/users")
  .get(function (req, res) {
    Exercise.find()
      .select({ username: 1 }/*, {_id: 1}, {description: 0}, {date: 0}, {duration: 0}, {count: 0}, {log: 0}*/).exec(function (err, personFound) {
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
        res.json({username: data.username, _id: data._id});
        e.remove();
      });
    });
  });

app.post('/api/users/:_id/exercises', function (req, res) {
  var _id = req.params._id;
  var date = req.params.date;
  var duration = req.params.duration;
  var description = req.params.description;

    Exercise.updateOne({ _id: req.params._id }, 
      {$push: {log: {description: description, duration: duration, date: date}}, $inc: {count: 1}});
    Exercise.find({ _id: req.params._id })
    .limit(1)
    .select({username: 1 , count: 1, log: 1}).exec(function (err, personFound) {
        if (err) return console.log(err);
        res.json(personFound[0]/*description: personFound[0].log[0].description, duration: personFound[0].log[0].duration, date: personFound[0].log[0].date,*/ );
      });

  // res.json({ _id: id }, { date: date }, { duration: duration }, { description: description });
});

app.get('/api/users/:_id/logs', function (req, res) {

})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})