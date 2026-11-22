# Library Management System

Backend API for a library catalogue: genres, books with search and pagination, and JWT authentication with role-based access. Built with NestJS, Prisma 7 and PostgreSQL (Neon).

## Setup

1. `cd api`
2. `npm install`
3. Copy `.env.example` to `.env` and fill in real values for `DATABASE_URL` and `JWT_SECRET`
4. `npx prisma migrate deploy`
5. `npx prisma generate`
6. `npx prisma db seed`
7. `npm run start:dev` (the API runs at http://localhost:3000)

Generate a `JWT_SECRET` with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.

The seed creates 4 genres, 16 books and one development librarian (`librarian@library.test`, password `ChangeMe123!`). That account is for local development only. Override it with `LIBRARIAN_EMAIL` and `LIBRARIAN_PASSWORD` in `.env`.

## Endpoints

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/auth/register` | public | Create a PATRON account and receive a JWT |
| POST | `/auth/login` | public | Log in and receive a JWT |
| GET | `/auth/me` | any logged-in user | Show the current user |
| GET | `/genres` | public | List genres |
| GET | `/genres/:id` | public | Get one genre |
| POST | `/genres` | public | Create a genre |
| PATCH | `/genres/:id` | public | Rename a genre |
| DELETE | `/genres/:id` | public | Delete a genre that has no books |
| GET | `/books` | public | List books with filtering, search and pagination |
| GET | `/books/:id` | public | Get one book |
| POST | `/books` | LIBRARIAN | Create a book |
| PATCH | `/books/:id` | LIBRARIAN | Update a book |
| DELETE | `/books/:id` | LIBRARIAN | Delete a book |

`GET /books` accepts `genreId`, `search` (matches title or author, case-insensitive), `page` (default 1) and `limit` (default 10, maximum 100). It returns `{ data, meta: { total, page, limit, totalPages } }`.

Protected routes need the header `Authorization: Bearer <token>`. Errors: 400 for failed validation, 401 for a missing or invalid token, 403 for the wrong role, 404 for a missing record and 409 for a duplicate or a conflict.

A Postman collection covering every endpoint is in `docs/postman_collection.json`.

## Schema Decisions

**Why `Book` references `Genre` instead of embedding it.** A genre is a shared, independent entity: many books belong to one genre. Embedding the genre (a `genre: String` or a copied genre object on every book) would duplicate that data across rows, so renaming "Sci-Fi" to "Science Fiction" would mean updating every book, and typos ("Fantasy" vs "fantasy") would silently split one genre into several. With a separate `Genre` table and a `genreId` foreign key (`@relation`), the genre name lives in exactly one place, the database enforces that every book points at a real genre, and queries such as "all books in a genre" or "book counts per genre" are simple indexed joins. `onDelete: Restrict` stops a genre from being deleted while books still use it.

Other decisions:

- `Role` enum (`PATRON`, `LIBRARIAN`) on `User` makes invalid roles impossible at the database level. `PATRON` is the default, and registration never accepts a role from the client, so nobody can make themselves a librarian.
- `Book.isbn` is unique, and `@@unique([title, author])` prevents duplicate catalogue entries. The seed uses upserts, so running it again never duplicates rows.
- `Book.totalCopies` records how many copies the library holds, with a default of 1.
- `@@index([genreId])` speeds up the most common catalogue filter.
- `User.email` and `Genre.name` are unique.
- Passwords are stored only as bcrypt hashes.

## Prisma vs a document database

Modeling in Prisma pushed me to decide relationships up front: in a document database I would have been tempted to nest a book's genre inside the book document for fast reads, whereas Prisma's relational model made me define each entity once and link by ID, trading single-document reads for consistency and a schema the database enforces.