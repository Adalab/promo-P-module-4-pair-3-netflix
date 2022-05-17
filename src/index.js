const express = require('express');
const cors = require('cors');
const movies = require('./data/movies.json');
const users = require('./data/users.json');
// create and config server
const server = express();
server.use(cors());
server.use(express.json());

// Configuramos motor de plantillas
server.set('view engine', 'ejs');

// Generamos un servidos estático
const staticServerPathWeb = './src/public-react'; // En esta carpeta ponemos los ficheros estáticos
server.use(express.static(staticServerPathWeb));

// init express aplication
// Definimos el puerto en el que vamos a tener el servidor
const serverPort = 4001;

// Funciones
const sortMovies = (movies, sortType) => {
  const moviesOrder = movies.sort((a, b) => {
    const nameA = a.title.toUpperCase();
    const nameB = b.title.toUpperCase();
    if (sortType === 'asc') {
      if (nameA < nameB) {
        return -1;
      }
      if (nameA > nameB) {
        return 1;
      }
    } else if (sortType === 'desc') {
      if (nameA < nameB) {
        return 1;
      }
      if (nameA > nameB) {
        return -1;
      }
    }
    return 0;
  });
  return moviesOrder;
};

//Escuchamos el servidor
server.listen(serverPort, () => {
  console.log(`Server listening at http://localhost:${serverPort}`);
});

server.get('/movies', (req, res) => {
  const moviesFilter = movies.filter((movie) => {
    if (req.query.gender == '') {
      return true;
    } else {
      return movie.gender === req.query.gender ? true : false;
    }
  });
  const sortType = req.query.sort;
  const sortedMovies = sortMovies(moviesFilter, sortType);
  res.json({
    success: true,
    movies: sortedMovies,
  });
});

// Generamos servidos de estaticos para las imagenes

const staticServerPathWebPhotos = './src/public-movies-images'; // En esta carpeta ponemos los ficheros estáticos
server.use(express.static(staticServerPathWebPhotos));

const staticServerStyles = './src/styles';
server.use(express.static(staticServerStyles));

server.post('/login', (req, res) => {
  const userLogin = users
    .find((user) => user.email === req.body.email)
    .find((user) => user.password === req.body.password);

  res.json({ success: true, userId: userLogin.id }, 404);
});

server.get('/movie/:movieId', (req, res) => {
  const foundMovie = movies.find((movie) => movie.id === req.params.movieId);
  console.log(foundMovie);
  if (foundMovie) {
    res.render('movie', foundMovie);
  } else {
    const route = { route: req.url };
    res.render('movie-not-found', route)
  }
});
