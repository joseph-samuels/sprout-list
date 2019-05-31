// Code by: Joseph Samuels
// Much more than a thousand thanks to learn.freecodecamp.org
'use strict';

var express = require('express');
var mongo = require('mongodb');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var dns = require('dns');

var cors = require('cors');

var app = express();

// Basic Configuration 
var port = process.env.PORT || 3000;
/** this project needs a db !! **/ 
// connect to database
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true });

app.use(cors());

/** this project needs to parse POST bodies **/
// so mountiing the body-parser ...
app.use(bodyParser.urlencoded({ extended: false }));
// end mount body-parser
// The Schema. Everything in Mongoose starts with a Schema
var Schema = mongoose.Schema;
//  --- We will use a counter collection with just one document that stores a counter
var counterSchema = new Schema({
  counterName: { type: String, required: true },
  count: Number
});
var Counters = mongoose.model('Counters', counterSchema);
// --- We will use a collection of documents, Each document will consist of a URL and a number
var urlSchema = new Schema({
  longurl: { type: String, required: true },
  shorturl: Number
});
var ShortUrls = mongoose.model('shortUrls', urlSchema);
// static files
app.use('/public', express.static(process.cwd() + '/public'));


// function to init the counter record in the database it it is not yet created
var InitCounter = function (done) {
  var counter = new Counters({counterName: 'urlscount', count: 1});
  counter.save((err, data) => {
    if (err) return console.error(err);
    console.log(counter.counterName + " saved to database."); 
  });
};
// This function will increment the counter in the database for asigning to the next short UrL
var UpdateCounter = function (cName, done) {
  Counters.findOneAndUpdate(
    {counterName: cName},
    {$set: {count: currentCount}},
    {new: true},
    (err, data) => {
      if (err) return console.error(err);
      console.log(data.count + " updated to database."); 
    }
  );
};
//  ------------------------------ End counter funcions
//  ---- create the counter collection with one document, if it does not exist already
let currentCount = 1;
Counters.findOne({counterName:'urlscount'},function (err, data){
  if (err) return console.error(err);
  if (data == null) {
    console.log ('NO Counters Initializing counter schema...');
    InitCounter();
  }
}) 
//  ----------------------------- End Create counter document
app.get('/', function(req, res){
  res.sendFile(process.cwd() + '/views/index.html');
});

  
// -------------------------------------------------------------------------------- main procedures
app.post('/api/shorturl/new', function (req, res) {
  let UrlString = req.body.url;
  let urlObj = {};
  // Make use of the URL object to check the user input, invalid input will trigger an error that will be handle with try – catch
  try {
    urlObj = new URL(UrlString);
    let foundAdresses = '';
    var w3 = dns.lookup(urlObj.hostname, function (err, addresses, family) {
      if (err) {
        res.json({ 'error': 'invalid URL' })
        return console.error(err);
      }
      foundAdresses = addresses
      // test to see if that address already exist in the database
      ShortUrls.findOne({ longurl: UrlString }, function (err, data) {
        if (err) return console.error(err);
        if (data != null) {
          // found in Database, return what is there
          res.json({ 'original_url': data.longurl, 'short_url': data.shorturl });
        } else {
        // get next counter from database
          Counters.findOne({ counterName: 'urlscount' }, function (err, data) {
            if (err) return console.error(err);
            if (data != null) {
              currentCount = data.count + 1;
              UpdateCounter('urlscount');
              // log data to database
              let shorturl = new ShortUrls({ longurl: UrlString, shorturl: currentCount });
              shorturl.save((err, data) => {
                if (err) return console.error(err);
                // finally return the short URL
                res.json({ 'original_url': data.longurl, 'short_url': data.shorturl });
                console.log(shorturl.longurl + ' saved to database.'); 
              }); 
            }
          })
        }
      })    
    })
  }
  catch (err) {
    // invalid URL was posted, so, return error
    res.json({ 'error': 'invalid URL' });
  }
});
//  ------------------------------------------------------------------------------- end main procedures
// ------ When users visit the shortened URL, it will redirect them to the original link.
app.get('/api/shorturl/:new', function(req, res) {
  let shortUrlNum = req.params.new;
  let longUrlStr = '';
  ShortUrls.findOne({ shorturl: shortUrlNum }, function (err, data) {
    if (err) return console.error(err);
    if (data != null) {
      // found url in the database, so redirect to the original address
      res.redirect(data.longurl)
    } else {
      // url is not in the database, return error in json object
      res.json({ 'error': 'No short url found for given input' });
    }
  })
});


app.listen(port, function () {
  console.log('Node.js listening ...');
});