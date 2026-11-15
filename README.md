# Library Management System

NestJS API with a Prisma 7 data layer on hosted PostgreSQL (Neon).

## Setup

1. `cd api`
2. `npm install`
3. Copy `.env.example` to `.env` and put your real `DATABASE_URL` in it
4. `npx prisma migrate deploy`
5. `npx prisma generate`
6. `npx prisma db seed` (4 genres, 16 books)
7. `npm run start:dev`

## Schema Decisions

**Why `Book` references `Genre` instead of embedding it.** A genre is a shared, independent entity: many books belong to one genre. Embedding the genre (a `genre: String` or a copied genre object on every book) would duplicate that data across rows, so renaming "Sci-Fi" to "Science Fiction" would mean updating every book, and typos ("Fantasy" vs "fantasy") would silently split one genre into several. With a separate `Genre` table and a `genreId` foreign key (`@relation`), the genre name lives in exactly one place, the database enforces that every book points at a real genre, and queries such as "all books in a genre" or "book counts per genre" are simple indexed joins. `onDelete: Restrict` stops a genre from being deleted while books still use it.

Other decisions:

- `Role` enum (`PATRON`, `LIBRARIAN`) on `User` makes invalid roles impossible at the database level; `PATRON` is the safe default.
- `@@unique([title, author])` on `Book` prevents duplicate catalog entries, and the seed checks before inserting, so re-running it never duplicates rows.
- `@@index([genreId])` speeds up the most common catalog filter.
- `User.email` and `Genre.name` are unique.

## Prisma vs a document database

Modeling in Prisma pushed me to decide relationships up front: in a document database I would have been tempted to nest a book's genre inside the book document for fast reads, whereas Prisma's relational model made me define each entity once and link by ID, trading single-document reads for consistency and a schema the database enforces.