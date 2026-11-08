import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

const catalog: Record<string, { description: string; books: [string, string, number][] }> = {
  'Science Fiction': {
    description: 'Speculative futures, technology, and space.',
    books: [
      ['Dune', 'Frank Herbert', 1965],
      ['Neuromancer', 'William Gibson', 1984],
      ['The Left Hand of Darkness', 'Ursula K. Le Guin', 1969],
      ['Foundation', 'Isaac Asimov', 1951],
    ],
  },
  Fantasy: {
    description: 'Magic, myth, and invented worlds.',
    books: [
      ['The Hobbit', 'J.R.R. Tolkien', 1937],
      ['A Wizard of Earthsea', 'Ursula K. Le Guin', 1968],
      ['The Name of the Wind', 'Patrick Rothfuss', 2007],
      ['Mistborn: The Final Empire', 'Brandon Sanderson', 2006],
    ],
  },
  Mystery: {
    description: 'Crime, detection, and suspense.',
    books: [
      ['And Then There Were None', 'Agatha Christie', 1939],
      ['The Hound of the Baskervilles', 'Arthur Conan Doyle', 1902],
      ['The Girl with the Dragon Tattoo', 'Stieg Larsson', 2005],
      ['Gone Girl', 'Gillian Flynn', 2012],
    ],
  },
  'Non-Fiction': {
    description: 'True accounts, history, memoir, and ideas.',
    books: [
      ['Sapiens', 'Yuval Noah Harari', 2011],
      ['Educated', 'Tara Westover', 2018],
      ['The Immortal Life of Henrietta Lacks', 'Rebecca Skloot', 2010],
      ['Born a Crime', 'Trevor Noah', 2016],
    ],
  },
};

async function main() {
  // Genres + books (idempotent: safe to run the seed repeatedly)
  for (const [name, { description, books }] of Object.entries(catalog)) {
    const genre = await prisma.genre.upsert({
      where: { name },
      update: { description },
      create: { name, description },
    });

    for (const [title, author, publishedYear] of books) {
      await prisma.book.upsert({
        where: { title_author: { title, author } },
        update: { genreId: genre.id, publishedYear },
        create: { title, author, publishedYear, genreId: genre.id, copiesTotal: 3 },
      });
    }
  }

  // Users (one per role)
  const librarian = await prisma.user.upsert({
    where: { email: 'librarian@example.com' },
    update: {},
    create: { email: 'librarian@example.com', name: 'Lena Librarian', role: Role.LIBRARIAN },
  });
  const patron = await prisma.user.upsert({
    where: { email: 'patron@example.com' },
    update: {},
    create: { email: 'patron@example.com', name: 'Pat Patron', role: Role.PATRON },
  });

  // Stretch: sample reviews
  const dune = await prisma.book.findFirstOrThrow({ where: { title: 'Dune' } });
  const hobbit = await prisma.book.findFirstOrThrow({ where: { title: 'The Hobbit' } });
  for (const [user, book, rating, comment] of [
    [patron, dune, 5, 'A sprawling classic.'],
    [librarian, hobbit, 4, 'Still a great read.'],
  ] as const) {
    await prisma.review.upsert({
      where: { bookId_userId: { bookId: book.id, userId: user.id } },
      update: {},
      create: { bookId: book.id, userId: user.id, rating, comment },
    });
  }

  const [genres, books] = await Promise.all([prisma.genre.count(), prisma.book.count()]);
  console.log(`Seeded ${genres} genres and ${books} books.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
