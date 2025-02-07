const db = require('../db/connection')

exports.fetchUsers = (sort_by = 'points', order = 'desc') => {
    const validSortBys = ['points'];
    const validOrders = ['desc', 'asc'];

    if(!validSortBys.includes(sort_by)) {
        return Promise.reject({status: 400, msg: 'Invalid sort_by query'});
    }
    if(!validOrders.includes(order)) {
        return Promise.reject({status: 400, msg: 'Invalid order query, must be either desc or asc'});
    }
    
    return db.query(`SELECT * FROM users ORDER BY ${sort_by} ${order};`)
    .then(({ rows }) => {
        return rows;
    })
}

exports.fetchUsersByUsername = (username) => {
    return db.query(
        `SELECT *
        FROM users
        WHERE username = $1`,
        [username] 
    )
    .then(({rows}) => {
        if (rows.length === 0) {
            return Promise.reject({status: 404, msg: 'User not found' })
        }
        return rows[0];
    })
}

exports.fetchPostsByMap = (longitude, latitude, sort_by = 'created_at', order = 'desc', radius = 10000) => {
    const validSortBys = ['created_at'];
    const validOrders = ['desc', 'asc'];

    if(!validSortBys.includes(sort_by)) {
        return Promise.reject({status: 400, msg: 'Invalid sort_by query'});
    }
    if(!validOrders.includes(order)) {
        return Promise.reject({status: 400, msg: 'Invalid order query, must be either desc or asc'});
    }

    const query = (`
        SELECT *
        FROM posts
        WHERE ST_DWithin(
            location, 
            ST_SetSRID(ST_MakePoint($1, $2), 4326), -- User's lat, lon converted to geometry
            $3
        )
        ORDER BY ${sort_by} ${order};`)

    return db.query(query, [longitude, latitude, radius])
        .then(({ rows }) => {
            if (rows.length === 0) {
                return Promise.reject({ status: 404, msg: `No posts found within ${radius/1000} km` });
            }
            return rows;
        });
};

exports.fetchAllPosts = (sort_by = 'created_at', order = 'desc') => {
    const validSortBys = ['created_at']
    const validOrders = ['desc', 'asc']

    if(!validSortBys.includes(sort_by)) {
        return Promise.reject({status: 400, msg: 'Invalid sort_by query'});
    }
    if(!validOrders.includes(order)) {
        return Promise.reject({status: 400, msg: 'Invalid order query, must be either desc or asc'});
    }

    const query = (`SELECT *
        FROM posts
        ORDER BY ${sort_by} ${order};`)

    return db.query(query)
    .then(({ rows }) => {
        if(rows.length === 0) {
            return Promise.reject({status: 404, msg: 'No post found' })
        }
        return rows;
    })
}

exports.fetchPostById = (post_id) => {
    return db.query(
        `SELECT *
        FROM posts
        WHERE post_id = $1`,
        [post_id]
    )
    .then(({rows}) => {
        if(rows.length === 0) {
            return Promise.reject({status: 404, msg: 'No post found' })
        }
        return rows[0];
    })
}

exports.addPost = ({ username, post_img, description, location, location_coord }) => {
    return db.query(`
        INSERT INTO posts (username, post_img, description, created_at, location, location_coord)
        VALUES ($1, $2, $3, NOW(), ST_GeomFromText($4, 4326), $5)
        RETURNING *;`,
         [username, post_img, description, location, location_coord])
        .then(({ rows }) => {
            return rows[0];
    });
};

exports.fetchUserFavourites = (username) => {
    return db.query(
        `SELECT favourites.username, favourites.post_id, posts.post_img, posts.description, posts.created_at, posts.location, posts.location_coord
        FROM favourites
        JOIN posts
        ON favourites.post_id = posts.post_id
        WHERE favourites.username = $1;`,
        [username])
    .then(({rows}) => {
        if (rows.length === 0) {
            return Promise.reject({status: 404, msg: 'User has no favourites' })
        }
        return rows;
    })
}

exports.fetchAllPostsAndFavourites = (sort_by = 'created_at', order='desc', username) => {
    const query = `
      SELECT
        p.*,
        EXISTS (
          SELECT 1
          FROM favourites f
          WHERE f.username = $1 AND f.post_id = p.post_id
        ) AS is_favorited
      FROM posts p
      ORDER BY ${sort_by} ${order};
    `;
    return db.query(query, [username])
      .then(({ rows }) => {
        return rows
      })
}

exports.fetchIsFavourited = (post_id, username) => {
const query = `
    SELECT
    p.*,
    EXISTS (
        SELECT 1
        FROM favourites f
        WHERE f.username = $2 AND f.post_id = p.post_id
    ) AS is_favorited
    FROM posts p
    WHERE p.post_id = $1;
`;
return db.query(query, [post_id, username])
    .then(({ rows }) => {
        if(rows.length === 0) {
            return Promise.reject({status: 404, msg: 'No post found' })
        }
        return rows[0]
    })
}

exports.addUserFavourites = ({ username, post_id }) => {
    return db.query(
    `INSERT INTO favourites (username, post_id)
    VALUES ($1, $2)
    RETURNING *`, [username, post_id]
    )
    .then(({ rows }) => {
        return rows[0];
    })
}

exports.updateUser = (username, name, profile_img, points) => {
    return db.query(
    `
      UPDATE users
      SET name = COALESCE($1, name),
      profile_img = COALESCE($2, profile_img),
      points = COALESCE($3, points)
      WHERE username = $4
      RETURNING *;`,
      [name, profile_img, points, username]
    )
    .then(({rows}) => {
      if (rows.length === 0) {
        return Promise.reject({ status: 404, msg: 'User not found' })
      }
      return rows[0]
    })
  }

  exports.deletePostModel = (post_id) => {
    return db.query(`
        DELETE 
        FROM favourites 
        WHERE post_id = $1;`, 
        [post_id]
    ).then(() => {
        return db.query(`
            DELETE 
            FROM posts 
            WHERE post_id = $1 RETURNING *;`, 
            [post_id]
        ).then(({ rows }) => {
            if (rows.length === 0) {
                return Promise.reject({ status: 404, msg: 'post not found' })
            }
        })
    })
}

exports.deleteFavouriteModel = (username, post_id) => {
    return db.query(
        `DELETE FROM favourites 
        WHERE username = $1 AND post_id = $2
        RETURNING *;`, 
        [username, post_id]
    )
    .then(({ rows }) => {
        if (rows.length === 0) {
            return Promise.reject({
                status: 404,
                msg: 'favourite not found'
            })
        }
    })
}
    