# Library Management System

## Setup (data layer)

```bash
cd api
cp .env.example .env            # then paste your hosted PostgreSQL URL
npm install prisma@6 @prisma/client@6 --save-dev   # (client as dependency)
npx prisma migrate dev --name init   # creates + applies the migration
npx prisma db seed                   # inserts 4 genres, 16 books, 2 users, 2 reviews
```

Add this to `api/package.json` so `prisma db seed` knows what to run:

```json
"prisma": { "seed": "ts-node prisma/seed.ts" }
```

For a hosted database in production/CI use `npx prisma migrate deploy` instead of `migrate dev`.

## Schema Decisions

**Why `Book` references `Genre` instead of embedding it.**
A genre is a shared, independent entity: many books belong to one genre. Embedding the genre
(e.g. a `genre: String` or a copied genre object on every book) would duplicate that data across
rows, so renaming "Sci-Fi" to "Science Fiction" would mean updating every book, and typos
("Fantasy" vs "fantasy") would silently split one genre into several. With a separate `Genre`
table and a `genreId` foreign key (`@relation`), the genre name lives in exactly one place,
the database enforces that every book points at a real genre, and queries such as "all books
in a genre" or "book counts per genre" are simple indexed joins. `onDelete: Restrict` stops a
genre from being deleted while books still use it.

Other decisions:
- **`Role` enum (`PATRON`, `LIBRARIAN`)** on `User` makes invalid roles impossible at the database level; `PATRON` is the safe default.
- **`@@unique([title, author])`** on `Book` prevents duplicate catalog entries and makes the seed idempotent (re-running it never duplicates rows).
- **`@@index([genreId])`** speeds up the most common catalog filter.
- **`Review`** (stretch) links `Book` and `User` with `@@unique([bookId, userId])`, so each patron can review a book once; reviews cascade-delete with their book or user.

### Prisma vs. a document database

Modeling in Prisma pushed me to decide relationships up front: in a document database I would
have been tempted to nest a book's reviews (or genre) inside the book document for fast reads,
whereas Prisma's relational model made me define each entity once and link by ID, trading
single-document reads for consistency and a schema the database enforces.
