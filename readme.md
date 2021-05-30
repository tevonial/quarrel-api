# quarrel-api
An API for my MaterialQuarrel Angular Frontend.  RESTful and built with Node, Express, and Mongoose.

## **User**
| Method | Path               | Action                      |
|--------|--------------------|-----------------------------|
| GET    | /                  | Get all users               |
| GET    | /:id/profile-image | Retrieve user profile image |
| POST   | /                  | Create new user             |
| PUT    | /:id               | Update user                 |
| PUT    | /:id/profile-image | Set user profile image      |

## **Thread**
| Method | Path | Action            |
|--------|------|-------------------|
| GET    | /    | Get thread list   |
| GET    | /:id | Get thread by id  |
| POST   | /    | Create new thread |

## **Post**

| Method | Path             | Action                              |
|--------|------------------|-------------------------------------|
| GET    | /                | Get all posts                       |
| GET    | /:id             | Get post by id                      |
| GET    | /thread/:id/tree | Get post tree by thread id          |
| GET    | /author/:id      | Get flat list of posts by author id |
| POST   | /                | Create post                         |
| POST   | /:id/reply       | Create post in reply to post id     |
| POST   | /purge-update    | Purge all posts and update          |
| PUT    | /:id             | Edit post body                      |
| DELETE | /:id             | Delete post                         |

## **Config**

| Method | Path | Action                  |
|--------|------|-------------------------|
| GET    | /    | Get all configurations  |
| POST   | /    | Replace a configuration |

## **Auth**

| Method | Path          | Action                 |
|--------|---------------|------------------------|
| POST   | /:id/password | Set password for user  |
| POST   | /login        | Attempt log in         |
| POST   | /register     | Register new user      |
