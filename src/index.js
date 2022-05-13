const express = require('express');
const cors = require('cors');
const movies = require('./data/movies.json');

// create and config server
const server = express();
server.use(cors());
server.use(express.json());

// init express aplication
const serverPort = 4001;
server.listen(serverPort, () => {
  console.log(`Server listening at http://localhost:${serverPort}`);
});

server.get('/movies', (req, res) => {
  console.log(typeof req.query.gender);

  res.send({
    success: true,
    movies: movies.filter((movie) => {
      if (req.query.gender == '') {
        return true;
      } else {
        return movie.gender === req.query.gender ? true : false;
      }
    }),
  });
});
