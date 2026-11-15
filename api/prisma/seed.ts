import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

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

  for (const b of books) {
    const genre = await prisma.genre.findUniqueOrThrow({
      where: { name: b.genre },
    });
    const exists = await prisma.book.findFirst({
      where: { title: b.title, genreId: genre.id },
    });
    if (!exists) {
      await prisma.book.create({
        data: { title: b.title, author: b.author, genreId: genre.id },
      });
    }
  }

  const genreCount = await prisma.genre.count();
  const bookCount = await prisma.book.count();
  console.log(`Seed complete: ${genreCount} genres, ${bookCount} books`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });