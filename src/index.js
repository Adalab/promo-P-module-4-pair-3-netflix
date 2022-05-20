const express = require('express');
const cors = require('cors');
const movies = require('./data/movies.json');
const users = require('./data/users.json');
const Database = require('better-sqlite3');
const res = require('express/lib/response');
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
    const nameA = a.title;
    const nameB = b.title;
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

// Generamos servidos de estaticos para las imagenes

const staticServerPathWebPhotos = './src/public-movies-images'; // En esta carpeta ponemos los ficheros estáticos
server.use(express.static(staticServerPathWebPhotos));

const staticServerStyles = './src/styles';
server.use(express.static(staticServerStyles));

//Escuchamos el servidor
server.listen(serverPort, () => {
  console.log(`Server listening at http://localhost:${serverPort}`);
});

//Definino  la DB con la que vamos a trabajar
const db = Database('./src/db/database.db', { verbose: console.log });

server.get('/movies', (req, res) => {
  //buscamos en la DB los datos que necesito

  let movieList = [];
  if (req.query.gender == '') {
    const query = db.prepare(`SELECT  * FROM movies`);
    movieList = query.all();
  } else {
    const query = db.prepare(`SELECT  * FROM movies WHERE gender= ?`);
    movieList = query.all(req.query.gender);
  }

  const sortType = req.query.sort;
  const sortedMovies = sortMovies(movieList, sortType);

  res.json({
    success: true,
    movies: sortedMovies,
  });
});

server.post('/login', (req, res) => {
  const userLogin = users.find(
    (user) =>
      user.email === req.body.email && user.password === req.body.password
  );
  let response;
  if (userLogin) {
    response = { success: true, userId: userLogin.id };
  } else {
    response = {
      success: false,
      errorMessage: 'Usuaria/o no encontrada/o',
    };
  }
  res.json(response);
});

server.get('/movie/:movieId', (req, res) => {
  //buscamos en la DB los datos que necesito
  const query = db.prepare(`SELECT  * FROM movies `);
  console.log(query);
  //Ejecuto la sentencia SQL
  const movieList = query.all();
  const queryId = db.prepare('SELECT * FROM movies WHERE id = ?');
  const foundMovie = queryId.get(req.params.movieId);
  // const foundMovie = movieList.find((movie) => movie.id === req.params.movieId);
  if (foundMovie) {
    res.render('movie', foundMovie);
  } else {
    const route = { route: req.url };
    res.render('movie-not-found', route);
  }
});

server.post('/sign-up', (req, resp) => {
  const email = req.body.email;
  const password = req.body.password;
  const queryEmail = db.prepare('SELECT * FROM users WHERE email = ?');
  const foundEmail = queryEmail.get(email);
  if (foundEmail !== undefined) {
    resp.json({
      success: false,
      errorMessage: 'Usuaria ya existente',
    });
  } else {
    const query = db.prepare(
      `INSERT INTO users (email, password) VALUES (?, ?) `
    );
    const insertUser = query.run(email, password);
    resp.json({
      success: true,
      msj: 'Usuario insertado',
      userId: insertUser.lastInsertRowid,
    });
  }
});

// ENDPOINT actualizar perfil de la usuaria
server.put('/user/profile', (req, resp) => {
  const data = req.body;
  const id = req.headers.userid;
  const query = db.prepare(
    'UPDATE users SET name = ?, email = ?, password = ? WHERE id = ?'
  );
  const result = query.run(data.name, data.email, data.password, id);
  if (result.changes !== 0) {
    resp.json({
      success: true,
      msj: 'Los datos se han cambiado correctamente.',
    });
  } else {
    resp.json({
      success: false,
      msj: 'Ha habido algún error.',
    });
  }
});

//endpoint to return user profile
server.get('/user/profile', (req, res) => {
  const userProfile = req.headers.userid;
  const query = db.prepare('SELECT * FROM users WHERE id = ?');
  const getUser = query.get(userProfile);
  res.json({
    success: true,
    user: getUser,
  });
});

//endpoint

server.get('/user/movies', (req, res) => {
  // preparamos la query para obtener los movieIds
  const movieIdsQuery = db.prepare(
    'SELECT movieId FROM rel_movies_users WHERE userId = ?'
  );
  // obtenemos el id de la usuaria
  const userId = req.headers.userid;
  // ejecutamos la query
  const movieIds = movieIdsQuery.all(userId); // que nos devuelve algo como [{ movieId: 1 }, { movieId: 2 }];

  // obtenemos las interrogaciones separadas por comas
  const moviesIdsQuestions = movieIds.map((id) => '?').join(', '); // que nos devuelve '?, ?'
  // preparamos la segunda query para obtener todos los datos de las películas

  console.log('holi', moviesIdsQuestions);
  const moviesQuery = db.prepare(
    `SELECT * FROM movies WHERE id IN (${moviesIdsQuestions})`
  );

  // convertimos el array de objetos de id anterior a un array de números
  const moviesIdsNumbers = movieIds.map((movie) => movie.movieId); // que nos devuelve [1.0, 2.0]
  // ejecutamos segunda la query
  const movies = moviesQuery.all(moviesIdsNumbers);

  // respondemos a la petición con
  res.json({
    success: true,
    movies: movies,
  });
});
