import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import * as bcrypt from "bcrypt";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// Development librarian. Override with LIBRARIAN_EMAIL / LIBRARIAN_PASSWORD in .env.
const librarianEmail = process.env.LIBRARIAN_EMAIL ?? "librarian@library.test";
const librarianPassword = process.env.LIBRARIAN_PASSWORD ?? "ChangeMe123!";

// Sample ISBN-13s for seed data: a fixed prefix plus a computed check digit.
function isbn13(n: number): string {
  const base = `978000${String(n).padStart(6, "0")}`;
  const sum = base
    .split("")
    .reduce((acc, d, i) => acc + Number(d) * (i % 2 === 0 ? 1 : 3), 0);
  return base + ((10 - (sum % 10)) % 10);
}

const genres = ["Fantasy", "Science Fiction", "Non-Fiction", "Mystery"];

const books = [
  { title: "The Hobbit", author: "J.R.R. Tolkien", genre: "Fantasy" },
  { title: "The Fellowship of the Ring", author: "J.R.R. Tolkien", genre: "Fantasy" },
  { title: "A Wizard of Earthsea", author: "Ursula K. Le Guin", genre: "Fantasy" },
  { title: "The Name of the Wind", author: "Patrick Rothfuss", genre: "Fantasy" },
  { title: "Dune", author: "Frank Herbert", genre: "Science Fiction" },
  { title: "Neuromancer", author: "William Gibson", genre: "Science Fiction" },
  { title: "The Left Hand of Darkness", author: "Ursula K. Le Guin", genre: "Science Fiction" },
  { title: "Foundation", author: "Isaac Asimov", genre: "Science Fiction" },
  { title: "Sapiens", author: "Yuval Noah Harari", genre: "Non-Fiction" },
  { title: "Educated", author: "Tara Westover", genre: "Non-Fiction" },
  { title: "Guns, Germs, and Steel", author: "Jared Diamond", genre: "Non-Fiction" },
  { title: "A Brief History of Time", author: "Stephen Hawking", genre: "Non-Fiction" },
  { title: "Murder on the Orient Express", author: "Agatha Christie", genre: "Mystery" },
  { title: "The Girl with the Dragon Tattoo", author: "Stieg Larsson", genre: "Mystery" },
  { title: "Gone Girl", author: "Gillian Flynn", genre: "Mystery" },
  { title: "The Hound of the Baskervilles", author: "Arthur Conan Doyle", genre: "Mystery" },
];

async function main() {
  for (const name of genres) {
    await prisma.genre.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  for (const [i, b] of books.entries()) {
    const genre = await prisma.genre.findUniqueOrThrow({
      where: { name: b.genre },
    });
    await prisma.book.upsert({
      where: { isbn: isbn13(i + 1) },
      update: {},
      create: {
        title: b.title,
        author: b.author,
        isbn: isbn13(i + 1),
        totalCopies: 3,
        genreId: genre.id,
      },
    });
  }

  await prisma.user.upsert({
    where: { email: librarianEmail },
    update: { role: "LIBRARIAN" },
    create: {
      email: librarianEmail,
      password: await bcrypt.hash(librarianPassword, 10),
      role: "LIBRARIAN",
    },
  });

  const genreCount = await prisma.genre.count();
  const bookCount = await prisma.book.count();
  console.log(`Seed complete: ${genreCount} genres, ${bookCount} books`);
  console.log(`Librarian ready: ${librarianEmail}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });