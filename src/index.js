// Importamos las depencias que necesitamos

const express = require('express');
const cors = require('cors');
const movies = require('./data/movies.json');
const users = require('./data/users.json');
const Database = require('better-sqlite3');


// create and config server
const server = express();
server.use(cors());
server.use(express.json());

// Configuramos motor de plantillas
server.set('view engine', 'ejs');

// init express aplication
// Definimos el puerto en el que vamos a tener el servidor
const serverPort = 4001;

//Escuchamos el servidor
server.listen(serverPort, () => {
  console.log(`Server listening at http://localhost:${serverPort}`);
});

//Definino  la DB con la que vamos a trabajar
const db = Database('./src/db/database.db', { verbose: console.log });

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

// endpoint para pintar las películas
server.get('/movies', (req, res) => {
  //buscamos en la DB los datos que necesito
  // query params
  const gender = req.query.gender;
  const sort = req.query.sort;
  // espedificamos el genero que queremos y el orden
  const query = db.prepare(
    `SELECT * FROM movies WHERE gender LIKE ? ORDER BY name ${sort}`
  );
  const movieList = query.all(gender ? gender.toLowerCase() : '%');

  res.json({
    success: true,
    movies: movieList,
  });
});

// endopoint login
server.post('/login', (req, res) => {
  // Recibimos los datos por body params
  const password = req.body.password;
  const email = req.body.email;

  // Buscamos todos los usuarios en nustra base de datos y filtramos por el usuario que recibimos en los body params

  const usersDB = db.prepare(
    `SELECT * FROM users WHERE email = ? AND password = ?`
  );

  const userLoginDB = usersDB.get(email, password);
  let response;
  if (userLoginDB !== undefined) {
    response = { success: true, userId: userLoginDB.id };
  } else {
    response = {
      success: false,
      errorMessage: 'Usuaria/o no encontrada/o',
    };
  }

  // Buscamos los datos en el json que tenemos
  // const userLogin = users.find(
  //   (user) => user.email === email && user.password === password
  // );
  // let response;
  // if (userLogin) {
  //   response = { success: true, userId: userLogin.id };
  // } else {
  //   response = {
  //     success: false,
  //     errorMessage: 'Usuaria/o no encontrada/o',
  //   };
  // }
  res.json(response);
});

// endpoint para el detalle de la pelicula
server.get('/movie/:movieId', (req, res) => {
  //buscamos en la DB los datos la pelicula que queremos segun el id que le enviamos por el parametro de la ruta
  const param = req.params.movieId;

  const queryId = db.prepare('SELECT * FROM movies WHERE id = ?');
  const foundMovie = queryId.get(param);
  // const foundMovie = movieList.find((movie) => movie.id === req.params.movieId);
  if (foundMovie) {
    res.render('movie', foundMovie);
  } else {
    const route = { route: req.url };
    res.render('movie-not-found', route);
  }
});

// endpoint de registro
server.post('/sign-up', (req, resp) => {
  // recibimos los datos por body params
  const email = req.body.email;
  const password = req.body.password;
  const queryEmail = db.prepare('SELECT * FROM users WHERE email = ?');
  const foundEmail = queryEmail.get(email);

  // comprobamos que el email no este registrado en la base de datos
  if (foundEmail !== undefined) {
    resp.json({
      success: false,
      errorMessage: 'Usuaria ya existente',
    });
  } else {
    // sino lo esta, lo registramos
    const query = db.prepare(
      `INSERT INTO users (email, password) VALUES (?, ?) `
    );
    const insertUser = query.run(email, password);
    resp.json({
      success: true,
      msj: 'Usuario insertado',
      // lastInsertRowid indica que id se ha creado en la BD
      userId: insertUser.lastInsertRowid,
    });
  }
});

//endpoint to return user profile
server.get('/user/profile', (req, res) => {
  // rebicimos el id por header params
  const userProfile = req.headers.userid;
  const query = db.prepare('SELECT * FROM users WHERE id = ?');
  const getUser = query.get(userProfile);
  res.json({
    success: true,
    user: getUser,
  });
});

// ENDPOINT actualizar perfil de la usuaria

server.put('/user/profile', (req, resp) => {
  // recibimos los datos que la usuaria quiere modificar
  const data = req.body;
  // recibimos el id de la uruaria que quiere modificar sus datos por header params
  const id = req.headers.userid;
  // preparamos la query con los valores que la usuaria quiere modificar, recibiendo a la usuaria por el id
  const query = db.prepare(
    'UPDATE users SET name = ?, email = ?, password = ? WHERE id = ?'
  );

  const result = query.run(data.name, data.email, data.password, id);
  // si hay cambios los datos se han modificado correctamente
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

// Generamos un servidos estático
const staticServerPathWeb = './src/public-react'; // En esta carpeta ponemos los ficheros estáticos
server.use(express.static(staticServerPathWeb));

// Generamos servidos de estaticos para las imagenes

const staticServerPathWebPhotos = './src/public-movies-images'; // En esta carpeta ponemos los ficheros estáticos
server.use(express.static(staticServerPathWebPhotos));

const staticServerStyles = './src/styles';
server.use(express.static(staticServerStyles));
